# Deploying free on Oracle Cloud

[DEPLOYMENT.md](DEPLOYMENT.md) describes the topology and the security
model — read it first, especially the trust-boundary section. This file is
the concrete recipe for the host it was first deployed to: an Oracle Cloud
"Always Free" VM, which costs nothing indefinitely and is not a trial that
expires. A debit card is accepted for identity verification.

Live instance from this recipe: `https://140.245.211.182.sslip.io`

---

## Creating the VM

**Shape.** `VM.Standard.A1.Flex` (Arm, up to 4 cores / 24 GB) is the good
free shape and is very often "out of capacity" — this is normal and can
persist for days in a busy region. Retrying a smaller size sometimes helps.
The fallback that is essentially always available is
`VM.Standard.E2.1.Micro`: x86, 1 OCPU, **1 GB RAM**. Everything below
assumes the 1 GB box, because that is the constrained case.

**Image.** Canonical Ubuntu 22.04.

**Networking.** Create the VCN *before* creating the instance —
Networking → Virtual Cloud Networks → **Start VCN Wizard** → "Create VCN
with Internet Connectivity". The instance wizard's inline "create new
virtual cloud network" option can leave the "assign public IPv4 address"
toggle permanently disabled with no explanation. With a wizard-made VCN,
select it plus its **public** subnet and the toggle works.

**SSH key.** Choose "Generate a key pair for me" and download the private
key before clicking Create. Oracle shows it exactly once and cannot
reissue it; losing it means losing shell access to the instance.

---

## Opening the firewall — both of them

Traffic has to pass two independent filters. Opening only one is the most
common reason a correctly-running stack appears dead from outside.

**1. Oracle's virtual firewall.** VCN → subnet → Default Security List →
Add Ingress Rules: source `0.0.0.0/0`, TCP, destination port `80`, then the
same for `443`.

**2. The OS firewall.** Oracle's Ubuntu image ships an iptables ruleset
that rejects everything except port 22. It is easy to miss because it is
not `ufw` and `ufw status` reports inactive.

```bash
for p in 80 443; do
  sudo iptables -I INPUT 5 -p tcp --dport $p -m state --state NEW -j ACCEPT
done
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

Save *before* installing Docker. Docker manages its own iptables rules at
runtime and re-adds them on every start; persisting a snapshot that already
contains them causes duplicates after a reboot.

---

## Swap is mandatory on the 1 GB shape

Without it the image build is killed partway through. 4 GB is enough — the
build peaked at roughly 300 MB of swap in practice.

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
```

Set `WORKER_CONCURRENCY=1` in `.env` for the same reason: each concurrent
judging job is a container with its own memory limit.

---

## Getting the code onto the box without a git remote

`git archive` respects `.gitignore`, so `node_modules`, build output and
any local `.env` are excluded automatically — roughly 200 KB total.

```bash
git archive --format=tar HEAD | gzip -9 > oj.tar.gz
scp -i <key> oj.tar.gz ubuntu@<ip>:/tmp/
ssh -i <key> ubuntu@<ip> 'mkdir -p ~/online-judge-v2 && tar xzf /tmp/oj.tar.gz -C ~/online-judge-v2'
```

---

## A hostname without owning a domain

Let's Encrypt will not issue a certificate for a bare IP, and Caddy needs a
real hostname. `sslip.io` resolves any IP embedded in the name, free and
without signup, so the server's own address becomes a valid hostname:

```
SITE_ADDRESS=<ip>.sslip.io
FRONTEND_URL=https://<ip>.sslip.io
```

Caddy then obtains a genuine Let's Encrypt certificate for it on first
request. The catch is that the name is tied to the IP: stopping the
instance for long enough to lose the address changes the hostname too.
Reserve the public IP in the Oracle console if that matters.

---

## Seeding needs more environment than it looks like

Two things about `npm run seed` are not obvious:

- It runs through `tsx`, a **devDependency**, which the runtime image
  deliberately strips (`npm ci --omit=dev`). Seed from the *build* stage:
  `docker build --target build -t oj-seed -f server/Dockerfile .`
- It imports the app's env validator, so it needs `JWT_SECRET` and
  `REDIS_URL` even though seeding touches neither. Passing only
  `DATABASE_URL` fails with a Zod error that does not mention seeding.

```bash
set -a; . ./.env; set +a
docker run --rm --network online-judge-v2_default -w /app/server \
  -e DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB" \
  -e REDIS_URL=redis://redis:6379 -e JWT_SECRET="$JWT_SECRET" \
  -e FRONTEND_URL="$FRONTEND_URL" -e SEED_ADMIN_PASSWORD='<pick one>' \
  oj-seed npm run seed
```

`SEED_ADMIN_PASSWORD` is what creates the admin account; omit it and no
admin exists.

---

## Order of operations

Migrations must land before the API starts, so bring the data services up
on their own first.

```bash
docker compose -f docker-compose.prod.yml build          # ~15 min on 1 GB
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml run --rm --no-deps \
  --entrypoint sh api -c "cd /app/server && npx prisma migrate deploy"
# seed here (above)
docker compose -f docker-compose.prod.yml up -d
npm run docker:build -w server                           # judge sandbox images
```

The sandbox images (`python`, `gcc`, `java`) total about 2.9 GB and are
independent of the app build, so they can be pulled concurrently with it.

---

## Shipping a change

```bash
# 1. edit code locally
# 2. check it before it leaves your machine
npm run lint && npm run typecheck && npm test
# 3. commit — deploy.sh ships HEAD, not your working tree
git add -A && git commit -m "what changed"
# 4. ship it
./deploy.sh
```

`deploy.sh` refuses to run against a dirty working tree, because
`git archive` exports the last commit and uncommitted edits would be
silently left behind — leaving you debugging a version that isn't running.
It also stops before restarting if migrations fail, so a bad migration
leaves the previous containers serving rather than taking the site down.

Only the database survives a deploy. Everything else is rebuilt from the
commit, so the server holds no state you would be sad to lose — except
`.env`, which is untracked and therefore never overwritten by the extract.

### Two things that make deploys look broken

**nginx caching the API's address.** Fixed in `client/nginx.conf`, but
worth knowing why: nginx resolves a hostname written directly into
`proxy_pass` once at startup and caches it forever. Recreating the api
container gives it a new address, and every request 502s until nginx is
restarted too. The upstream now goes through a variable, which forces a
DNS lookup per request. Verify a change here by recreating *only* the api
container and confirming the site still answers.

**Rebuild times.** 10-20 minutes on the 1 GB shape, mostly `npm ci`. Don't
mistake it for a hang — `uptime` shows the load average falling back toward
zero when it is genuinely finished. Checking with
`pgrep -f "docker compose ... build"` does not work: the pattern appears in
the checking command's own arguments, so it matches itself and reports a
build that ended long ago as still running.

---

## Verifying, and what "working" actually means

A 200 on the homepage proves very little — the judge is the part with
moving pieces. Check that verdicts *discriminate*:

| Submission                | Expected verdict       |
| ------------------------- | ---------------------- |
| correct Python            | `ACCEPTED`             |
| correct C++               | `ACCEPTED` (compile path) |
| wrong output              | `WRONG_ANSWER`         |
| `while True: pass`        | `TIME_LIMIT_EXCEEDED`  |

All four passing means the socket mount, the sandbox images, the queue and
the comparison logic are all live. A stack that returns `RUNTIME_ERROR` for
everything usually means the sandbox images were never built.

Then reboot the machine and confirm it all returns unattended — swap from
`/etc/fstab`, firewall from `netfilter-persistent`, containers from
`restart: unless-stopped`. Roughly 80 seconds end to end. A brief `502`
while the API finishes starting behind an already-listening Caddy is
expected, not a fault.
