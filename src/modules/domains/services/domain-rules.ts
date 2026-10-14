import { env } from "../../../config/env.js";

/** TXT record name prefix that proves a client controls a domain: `_wb-verify.<hostname>`. */
export const VERIFY_PREFIX = "_wb-verify";

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export type DnsRecord = {
  type: "TXT" | "A" | "AAAA" | "CNAME";
  /** Full record name, e.g. "_wb-verify.www.example.com" */
  name: string;
  value: string;
  purpose: "ownership" | "routing";
};

/** "https://WWW.Example.com:443/path" -> "www.example.com"; IDNs become punycode. Null when it isn't a hostname. */
export function normalizeHostname(raw: string): string | null {
  const stripped = raw.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split(/[/?#]/)[0].replace(/\.$/, "");
  if (!stripped || stripped.includes("@")) return null;
  try {
    return new URL(`http://${stripped}`).hostname.replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Why a hostname can't be connected, or null when it can. */
export function hostnameProblem(hostname: string): string | null {
  const labels = hostname.split(".");
  if (hostname.length > 253 || labels.length < 2 || !labels.every((label) => LABEL.test(label)) || !TLD.test(labels.at(-1)!)) {
    return "Enter a domain name like www.yourbusiness.com.";
  }
  if (IPV4.test(hostname) || hostname.includes(":")) return "Enter a domain name, not an IP address.";
  const platform = env.PUBLIC_SITE_DOMAIN;
  if (hostname === platform || hostname.endsWith(`.${platform}`)) {
    return `Addresses on ${platform} are the free sub-domain. Connect a domain you own instead.`;
  }
  const appHosts = [hostOf(env.FRONTEND_URL), hostOf(env.API_PUBLIC_URL), env.SITE_CNAME_TARGET || null];
  if (appHosts.includes(hostname) || hostname === "localhost" || hostname.endsWith(".localhost")) {
    return "This domain is used by the platform and can't be connected to a website.";
  }
  return null;
}

/**
 * Whether the hostname is a registrable apex (example.com, example.co.uk), which can't use a CNAME.
 * A heuristic: a two-letter country TLD with a short second level counts as one suffix.
 */
export function isApex(hostname: string): boolean {
  const labels = hostname.split(".");
  if (labels.length === 2) return true;
  return labels.length === 3 && labels[2].length === 2 && labels[1].length <= 3;
}

/** Records the client adds at their DNS provider. */
export function dnsRecordsFor(hostname: string, verificationToken: string): DnsRecord[] {
  const records: DnsRecord[] = [
    { type: "TXT", name: `${VERIFY_PREFIX}.${hostname}`, value: verificationToken, purpose: "ownership" },
  ];
  if (env.SITE_CNAME_TARGET && !isApex(hostname)) {
    records.push({ type: "CNAME", name: hostname, value: env.SITE_CNAME_TARGET, purpose: "routing" });
    return records;
  }
  for (const ip of env.SITE_SERVER_IPS) {
    records.push({ type: ip.includes(":") ? "AAAA" : "A", name: hostname, value: ip, purpose: "routing" });
  }
  return records;
}
