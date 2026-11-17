# syntax=docker/dockerfile:1
# Chromium for the backend (HTML import prerendering, invoice PDFs). No secrets live here.
FROM node:24.19.0-bookworm-slim

# Chromium plus fonts so imported pages measure and print like they do in a browser.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-core fonts-noto-color-emoji ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.mjs ./

# Chromium's sandbox refuses to run as root.
USER node
ENV PORT=3200 CHROMIUM_PATH=/usr/bin/chromium
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3200/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.mjs"]
