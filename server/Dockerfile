# Debian-based rather than Alpine on purpose: bcrypt is a native module and
# Prisma ships platform-specific binaries, and both have far better prebuilt
# coverage for glibc than for musl.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Needed here, not just at runtime: Prisma picks which engine binary to
# download during install by probing the OpenSSL version. Without this it
# guesses openssl-1.1.x, and the resulting image then tries to fetch the
# right 3.0.x binary at run time — into a root-owned node_modules it has no
# permission to write.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Manifests first, so a source-only change doesn't invalidate the install
# layer. The lockfile is copied whole because npm ci reads the entire
# workspace graph, not just the packages being built.
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci

COPY shared/ shared/
COPY server/ server/

# The Prisma client is generated, not committed — nothing compiles without it.
RUN npm run prisma:generate -w server && npm run build -w server

# Reinstalling with --omit=dev after the build gives a runtime tree without
# esbuild/tsx/vitest, which would otherwise be the bulk of the image.
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The slim image omits OpenSSL, which Prisma probes for on startup; without
# it every command prints a libssl detection warning and falls back to a
# guessed binary target.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/server/package.json server/package.json
COPY --from=build /app/server/dist server/dist
# Migrations and the Prisma CLI schema are needed at run time by the
# `migrate deploy` step in DEPLOYMENT.md, not just at build time.
COPY --from=build /app/server/prisma server/prisma
COPY --from=build /app/server/prisma.config.ts server/prisma.config.ts

# node:* images ship a non-root `node` user; the default is still root.
USER node

EXPOSE 8000

# Overridden to server/dist/worker/index.js for the judging worker — same
# image, same dependencies, different entrypoint.
CMD ["node", "server/dist/api/index.js"]
