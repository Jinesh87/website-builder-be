# syntax=docker/dockerfile:1

FROM node:24.19.0-alpine AS deps
WORKDIR /app
# Puppeteer uses the Chromium installed in the production stage, not its own download.
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
# Headless Chromium for HTML import prerendering (runs the page so layout, spacing and
# script-built content are captured) and for shop invoice PDFs. Fonts cover non-Latin text.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto font-noto-emoji
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
# The Prisma client is generated during `npm run build`; pending migrations are applied on every start.
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/prisma.config.ts ./
USER app
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/index.js"]
