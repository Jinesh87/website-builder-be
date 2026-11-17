import { connect } from "node:tls";
import { env } from "../../../config/env.js";

export type HttpsStatus = "ready" | "pending" | "failed";

export type HttpsState = {
  status: HttpsStatus;
  /** Plain-words reason when HTTPS isn't working; null when it is. */
  detail: string | null;
  checkedAt: string;
};

/** A new domain gets its certificate within a minute or two; after this long a missing one has failed. */
const SETUP_GRACE_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 4000;

type Probe = { ok: true } | { ok: false; reason: string };

/**
 * Opens a TLS connection to our own server for `hostname` and checks the certificate a browser
 * would get. Connecting to the server IP (not the domain's DNS) tests our side only; the DNS
 * check covers where the domain points.
 */
export function probeHttps(hostname: string, host = env.SITE_SERVER_IPS.find((ip) => !ip.includes(":")) ?? hostname): Promise<Probe> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result: Probe) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    const socket = connect({ host, port: 443, servername: hostname, rejectUnauthorized: false, timeout: TIMEOUT_MS }, () => {
      if (socket.authorized) return done({ ok: true });
      const code = String(socket.authorizationError ?? "");
      done({
        ok: false,
        reason:
          code === "ERR_TLS_CERT_ALTNAME_INVALID"
            ? "The server has no certificate for this domain yet."
            : code === "CERT_HAS_EXPIRED"
              ? "The certificate for this domain has expired."
              : `The certificate isn't trusted (${code || "unknown error"}).`,
      });
    });
    socket.on("timeout", () => done({ ok: false, reason: "The server didn't answer on HTTPS." }));
    socket.on("error", (error: NodeJS.ErrnoException) =>
      done({ ok: false, reason: error.code === "ECONNREFUSED" ? "The server didn't answer on HTTPS." : "The HTTPS connection failed." }),
    );
  });
}

/** HTTPS state of a connected domain, as visitors see it. */
export async function checkHttps(hostname: string, connectedAt: Date | null, now = new Date()): Promise<HttpsState> {
  const probe = await probeHttps(hostname);
  const checkedAt = now.toISOString();
  if (probe.ok) return { status: "ready", detail: null, checkedAt };
  const recent = connectedAt !== null && now.getTime() - connectedAt.getTime() < SETUP_GRACE_MS;
  if (recent) return { status: "pending", detail: "Setting up the secure certificate. This usually takes a minute or two.", checkedAt };
  return {
    status: "failed",
    detail: `${probe.reason} The certificate request most likely failed because the domain also pointed somewhere else when it was tried. Make sure the DNS records below are the only ones for this name; we retry every hour.`,
    checkedAt,
  };
}
