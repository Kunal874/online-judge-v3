# Deployment

| Service  | What it is                                  |
| -------- | ------------------------------------------- |
| `caddy`  | TLS termination; obtains and renews certificates automatically |
| `web`    | nginx serving the built client, proxying `/api` |
| `api`    | Express, no Docker access                   |
| `worker` | pulls judging jobs, spawns sandbox containers |
| `postgres` / `redis` | data and the job queue          |

Only `caddy` is reachable from the internet (ports 80 and 443). Everything
else talks over the internal compose network.

`api` and `worker` are the **same image** with different entrypoints. The
split matters: the API never executes untrusted code, so a fork bomb or a
judging crash can't take the web tier down with it.

---

## Read this first: the worker is the trust boundary

The worker mounts the host's Docker socket, because that's how it creates
sandbox containers. **Access to that socket is equivalent to root on the
host** — anything that can talk to it can start a privileged container and
escape.

The sandbox protects the host from *submitted code*. It does not protect
the host from the worker process itself.

So:

- Run `worker` on a machine that does nothing else you care about. Do not
  put it on the same host as your database if you can avoid it.
- Better: put a socket proxy (e.g. `tecnativa/docker-socket-proxy`) in
  front of it, allowing only container create/start/inspect/remove.
- Never expose the worker to the internet. It has no HTTP surface; it only
  reads from Redis.

`DOCKER_GID` in the compose file exists so the worker can read the socket
while still running as a non-root user. Get it with:

```bash
getent group docker | cut -d: -f3
```

---

## 1. Configure

Create a `.env` next to `docker-compose.prod.yml`. Nothing has a default —
a compose file that boots with a working default password is one that
ships a default password to production.

```
POSTGRES_USER=judge
POSTGRES_PASSWORD=<long random string>
POSTGRES_DB=online_judge

JWT_SECRET=<64+ random hex chars>
SITE_ADDRESS=judge.example.com
FRONTEND_URL=https://judge.example.com
DOCKER_GID=<output of the command above>
WORKER_CONCURRENCY=2

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<smtp user>
SMTP_PASS=<smtp password>
```

Generate the JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Rotating `JWT_SECRET` invalidates every existing session — that is the
intended way to force a global logout after a suspected compromise.

### Mail

Leave the `SMTP_*` values unset and the server creates an Ethereal test
account: nothing is delivered, previews are logged. That is fine for a
staging box and useless in production — **email verification and password
reset silently go nowhere**. Set real values before launch.

---

## 2. Build and start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Then apply migrations. This is deliberately a separate step rather than
something the API does on boot: two API replicas starting at once would
race each other, and an automatic migration on deploy makes a bad release
much harder to roll back.

```bash
docker compose -f docker-compose.prod.yml exec -w /app/server api npx prisma migrate deploy
```

Build the sandbox images **on the worker's host** — they are what user code
runs inside, and the worker looks them up by name on the local daemon:

```bash
npm run docker:build -w server
```

Until those exist, every submission fails.

---

## 3. HTTPS

Handled by the `caddy` service — it requests a Let's Encrypt certificate on
the first request and renews it automatically. Requirements:

- Ports 80 and 443 open to the internet
- `SITE_ADDRESS` resolves to this server

`SITE_ADDRESS` must be a **hostname, not an IP** — no public certificate
authority issues certificates for bare IP addresses. Without a domain,
`sslip.io` resolves any address for free: a server at `203.0.113.5`
is reachable as `203-0-113-5.sslip.io`.

HTTPS is not optional here. Session cookies are issued with `Secure`, so
over plain HTTP the browser discards them and nobody can stay logged in.

Already running your own reverse proxy? Delete the `caddy` service and
publish `web`'s port 8080 instead.

---

## Cookie configuration

`COOKIE_SAMESITE` defaults to `lax`, which is correct for the topology
above: nginx serves the API under `/api` on the same origin as the app, so
the cookie is same-site and `Lax` gives real CSRF protection.

Only set `COOKIE_SAMESITE=none` if you split the API onto a different
domain. That gives up SameSite as a CSRF defense and requires HTTPS; the
server refuses to start if you set it without secure cookies. Prefer
same-origin.

---

## Operations

**Health.** `GET /health` on the API, wired to a container healthcheck.
`web` and `worker` have no health endpoint — the worker's liveness is
visible as jobs draining from the queue.

**Logs.** JSON to stdout in production (pretty-printing is dev-only), so
`docker compose logs` or any log shipper works unchanged.

**Backups.** Everything durable is in the `postgres_data` volume. Redis
holds only the job queue; losing it costs in-flight submissions, not data.

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U judge online_judge | gzip > backup-$(date +%F).sql.gz
```

**Scaling.** The API is stateless — run more replicas behind the load
balancer. For judging throughput, raise `WORKER_CONCURRENCY` (bounded by
host CPU and RAM, since each concurrent job is a container) or add worker
hosts; BullMQ distributes across them automatically.

**Zero-downtime.** Both processes handle `SIGTERM`: the API stops accepting
connections and drains in-flight requests, the worker finishes its current
jobs before exiting. Give containers a stop grace period of at least 30s
so a long-running judge job isn't killed mid-run.

---

## Deploying an update

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -w /app/server api npx prisma migrate deploy
```

Run migrations **after** the new image is up only when the change is
additive. For a destructive migration (dropping or renaming a column),
deploy the schema change and the code that tolerates it in two separate
releases, or the old running container will error against the new schema
in the window between the two commands.
