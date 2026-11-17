# syntax=docker/dockerfile:1

FROM node:24.19.0-alpine AS deps
WORKDIR /app
# Puppeteer connects to the `chromium` service; it never needs its own browser download.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.19.0-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24.19.0-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Chromium (HTML import prerendering, invoice PDFs) runs in the separate `chromium` service
# (./chromium, see docker-compose.yml), so this image stays small and holds no browser.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
# The Prisma client is generated during `npm run build`; pending migrations are applied on every start.
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/prisma.config.ts ./
USER app
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/index.js"]
