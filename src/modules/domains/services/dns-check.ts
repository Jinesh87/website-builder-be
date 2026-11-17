import { Resolver } from "node:dns/promises";
import { env } from "../../../config/env.js";
import { VERIFY_PREFIX } from "./domain-rules.js";

export type DnsCheckResult = {
  ownership: boolean;
  routing: boolean;
  /** Addresses the domain also points to that aren't our server (registrar parking pages, old hosting). */
  extraAddresses: string[];
  /** What the client still has to fix, in plain words; null when both checks pass. */
  problem: string | null;
};

/** Public resolvers, so a fresh record is seen as soon as it propagates rather than after our cache expires. */
function resolver(): Resolver {
  const instance = new Resolver({ timeout: 4000, tries: 2 });
  instance.setServers(["1.1.1.1", "8.8.8.8"]);
  return instance;
}

const NO_RECORD = new Set(["ENODATA", "ENOTFOUND", "ESERVFAIL", "EREFUSED", "ETIMEOUT", "ECONNREFUSED"]);

async function lookup<T>(query: () => Promise<T[]>): Promise<T[]> {
  try {
    return await query();
  } catch (error) {
    if (NO_RECORD.has((error as NodeJS.ErrnoException).code ?? "")) return [];
    throw error;
  }
}

const clean = (name: string) => name.toLowerCase().replace(/\.$/, "");

export async function checkDomainDns(hostname: string, verificationToken: string): Promise<DnsCheckResult> {
  const dns = resolver();
  const [txt, cnames, ipv4, ipv6] = await Promise.all([
    lookup(() => dns.resolveTxt(`${VERIFY_PREFIX}.${hostname}`)),
    lookup(() => dns.resolveCname(hostname)),
    lookup(() => dns.resolve4(hostname)),
    lookup(() => dns.resolve6(hostname)),
  ]);

  const ownership = txt.some((chunks) => chunks.join("").trim() === verificationToken);
  const addresses = [...ipv4, ...ipv6];
  const routingChecked = env.SITE_SERVER_IPS.length > 0 || Boolean(env.SITE_CNAME_TARGET);
  const viaCname = cnames.some((target) => clean(target) === env.SITE_CNAME_TARGET);
  const ours = addresses.filter((ip) => env.SITE_SERVER_IPS.includes(ip));
  // Every address must be ours: with a stray one (often the registrar's parking page) browsers and
  // the certificate check land there part of the time, so HTTPS can't be set up reliably.
  const extraAddresses = !routingChecked || viaCname ? [] : addresses.filter((ip) => !env.SITE_SERVER_IPS.includes(ip));
  const routing = !routingChecked || viaCname || (ours.length > 0 && extraAddresses.length === 0);

  const problems: string[] = [];
  if (!ownership) {
    problems.push(`The TXT record ${VERIFY_PREFIX}.${hostname} wasn't found or doesn't match yet.`);
  }
  if (!routing && ours.length > 0) {
    problems.push(
      `${hostname} also points to ${extraAddresses.join(", ")}, which isn't our server. This is often your domain company's parking or forwarding page. Delete the A/AAAA records with ${extraAddresses.length === 1 ? "this address" : "these addresses"} and turn off domain forwarding, so every visitor reaches your site.`,
    );
  } else if (!routing) {
    problems.push(
      addresses.length > 0
        ? `${hostname} points to ${addresses.join(", ")}, not to our server. If you use Cloudflare, turn the proxy off (grey cloud) for this record.`
        : `${hostname} doesn't point to our server yet.`,
    );
  }
  if (problems.length > 0) problems.push("DNS changes can take up to a few hours to show up.");

  return { ownership, routing, extraAddresses, problem: problems.length > 0 ? problems.join(" ") : null };
}
