/**
 * Chromium service for the backend: HTML import prerendering and invoice PDFs.
 *
 * Each WebSocket connection gets a fresh Chromium; the connection is piped to that browser's
 * DevTools endpoint, so the backend drives it with `puppeteer.connect()` exactly as if it had
 * launched it. The browser is closed when the connection ends. This container holds no secrets,
 * so the untrusted pages the importer renders never run next to the backend's credentials.
 *
 * Env:
 *   PORT                 listen port (default 3200)
 *   CHROMIUM_TOKEN       optional shared secret; when set, clients must send ?token=<value>
 *   CHROMIUM_EXTRA_ARGS  extra Chromium flags, space separated
 *   MAX_BROWSERS         browsers running at once; further connections wait (default 3)
 *   SESSION_TIMEOUT_MS   a session is closed after this long (default 300000)
 */
import { createServer } from "node:http";
import puppeteer from "puppeteer-core";
import { WebSocket, WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 3200);
const TOKEN = process.env.CHROMIUM_TOKEN?.trim() || "";
const EXECUTABLE = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const EXTRA_ARGS = (process.env.CHROMIUM_EXTRA_ARGS ?? "").split(/\s+/).filter(Boolean);
const MAX_BROWSERS = Math.max(1, Number(process.env.MAX_BROWSERS || 3));
const SESSION_TIMEOUT_MS = Math.max(10_000, Number(process.env.SESSION_TIMEOUT_MS || 300_000));
/** DevTools messages carry whole pages and PDFs. */
const MAX_PAYLOAD = 256 * 1024 * 1024;
const BASE_ARGS = ["--disable-dev-shm-usage", "--disable-gpu", "--mute-audio", "--no-first-run", "--hide-scrollbars"];

function log(message, extra = {}) {
  console.log(JSON.stringify({ time: new Date().toISOString(), msg: message, ...extra }));
}

// Limits how many browsers run at once; later sessions wait their turn.
let running = 0;
const waiting = [];
function acquire() {
  if (running < MAX_BROWSERS) {
    running += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}
function release() {
  const next = waiting.shift();
  if (next) next();
  else running -= 1;
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, running, waiting: waiting.length, extraArgs: EXTRA_ARGS }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD, perMessageDeflate: false });

wss.on("connection", async (client, req) => {
  const token = new URL(req.url ?? "/", "http://localhost").searchParams.get("token") ?? "";
  if (TOKEN && token !== TOKEN) {
    client.close(1008, "unauthorized");
    return;
  }

  // Messages sent before the browser is ready are replayed once it is.
  const pending = [];
  let upstream = null;
  let closed = false;
  client.on("message", (data, isBinary) => {
    if (upstream?.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
    else pending.push([data, isBinary]);
  });

  let browser = null;
  let timer = null;
  const finish = async (reason) => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    if (client.readyState === WebSocket.OPEN) client.close(1000, reason.slice(0, 100));
    if (upstream && upstream.readyState <= WebSocket.OPEN) upstream.terminate();
    if (browser) {
      await browser.close().catch(() => browser.process()?.kill("SIGKILL"));
      release();
    }
    log("session closed", { reason });
  };
  client.on("close", () => void finish("client disconnected"));
  client.on("error", () => void finish("client error"));

  await acquire();
  if (closed) {
    release();
    return;
  }
  try {
    browser = await puppeteer.launch({
      executablePath: EXECUTABLE,
      headless: true,
      args: [...BASE_ARGS, ...EXTRA_ARGS],
    });
  } catch (error) {
    release();
    browser = null;
    log("launch failed", { error: String(error?.message ?? error).split("\n")[0] });
    await finish("launch failed");
    return;
  }
  if (closed) {
    // The client left while the browser was starting.
    await browser.close().catch(() => browser.process()?.kill("SIGKILL"));
    release();
    return;
  }
  timer = setTimeout(() => void finish("session timeout"), SESSION_TIMEOUT_MS);
  browser.process()?.on("exit", () => void finish("browser exited"));

  upstream = new WebSocket(browser.wsEndpoint(), { maxPayload: MAX_PAYLOAD, perMessageDeflate: false });
  upstream.on("open", () => {
    for (const [data, isBinary] of pending.splice(0)) upstream.send(data, { binary: isBinary });
  });
  upstream.on("message", (data, isBinary) => {
    if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
  });
  upstream.on("close", () => void finish("browser connection closed"));
  upstream.on("error", () => void finish("browser connection error"));
  log("session started", { running, waiting: waiting.length });
});

server.listen(PORT, "0.0.0.0", () => {
  log("chromium service listening", { port: PORT, maxBrowsers: MAX_BROWSERS, extraArgs: EXTRA_ARGS, auth: Boolean(TOKEN) });
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    log("shutting down", { signal });
    wss.clients.forEach((ws) => ws.terminate());
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref();
  });
}
