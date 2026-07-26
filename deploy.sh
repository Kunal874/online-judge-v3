#!/usr/bin/env bash
#
# Ship the current commit to the server and restart it.
#
#   ./deploy.sh
#
# Override the target with environment variables if it ever moves:
#   OJ_HOST=ubuntu@1.2.3.4 OJ_SSH_KEY=~/.ssh/other.key ./deploy.sh
#
# Only committed work is deployed — see the dirty-tree check below.
set -euo pipefail

OJ_HOST="${OJ_HOST:-ubuntu@140.245.211.182}"
OJ_SSH_KEY="${OJ_SSH_KEY:-$HOME/.ssh/oracle-oj.key}"
OJ_URL="${OJ_URL:-https://140.245.211.182.sslip.io}"
REMOTE_DIR="online-judge-v2"

SSH=(ssh -i "$OJ_SSH_KEY" -o StrictHostKeyChecking=accept-new "$OJ_HOST")

step() { printf "\n\033[1m==> %s\033[0m\n" "$1"; }
fail() { printf "\n\033[31mFAILED: %s\033[0m\n" "$1" >&2; exit 1; }

# git archive exports HEAD, not the working tree, so uncommitted edits would
# be silently left behind and you would debug a version that isn't running.
if [ -n "$(git status --porcelain)" ]; then
  git status --short
  fail "uncommitted changes — commit them first, or they won't be deployed"
fi

step "Sending $(git rev-parse --short HEAD) to $OJ_HOST"
# Respects .gitignore, so node_modules and your local .env never travel.
# The server's own .env is untracked and therefore survives the extract.
git archive --format=tar HEAD | gzip -9 | "${SSH[@]}" \
  "mkdir -p ~/$REMOTE_DIR && tar xzf - -C ~/$REMOTE_DIR"

step "Building images (10-20 min on the 1 GB shape — this is the slow part)"
"${SSH[@]}" "cd ~/$REMOTE_DIR && docker compose -f docker-compose.prod.yml build" \
  || fail "image build failed"

step "Applying database migrations"
"${SSH[@]}" "cd ~/$REMOTE_DIR && docker compose -f docker-compose.prod.yml run --rm --no-deps \
  --entrypoint sh api -c 'cd /app/server && npx prisma migrate deploy'" \
  || fail "migration failed — the old containers are still serving, nothing was restarted"

step "Restarting"
"${SSH[@]}" "cd ~/$REMOTE_DIR && docker compose -f docker-compose.prod.yml up -d"

step "Waiting for the site to answer"
for attempt in $(seq 1 30); do
  code=$(curl -s -o /dev/null -m 10 -w "%{http_code}" "$OJ_URL/api/health" || true)
  if [ "$code" = "200" ]; then
    printf "\n\033[32mDeployed. %s is up.\033[0m\n" "$OJ_URL"
    exit 0
  fi
  printf "  attempt %s: HTTP %s\n" "$attempt" "$code"
  sleep 5
done

fail "site did not come back — check: ssh -i $OJ_SSH_KEY $OJ_HOST 'cd ~/$REMOTE_DIR && docker compose -f docker-compose.prod.yml logs --tail 50'"
