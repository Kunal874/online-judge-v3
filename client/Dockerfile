FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci

COPY shared/ shared/
COPY client/ client/

# Vite inlines env vars at build time, so this is baked into the bundle and
# cannot be changed by the running container. Left empty by default, which
# makes the client call /api on its own origin — the topology nginx.conf
# serves and the one that keeps cookies SameSite=Lax.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w client

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Port 8080 rather than 80 so nginx can run unprivileged (binding below 1024
# requires root). The stock nginx image's own user is already non-root.
EXPOSE 8080
