import { prisma } from "../../../config/prisma.js";
import { DomainStatus, type HostingStatus } from "../../../generated/prisma/client.js";
import { isHostingLive } from "./hosting-period.js";

const CONFIG_ID = "default";

/**
 * Whether a published site may be served for this request host/identifier.
 * Free subdomain always may. Custom domains need ACTIVE or GRACE while billing is on.
 */
export function customDomainServeAllowed(input: {
  billingEnabled: boolean;
  isCustomDomain: boolean;
  hostingStatus: HostingStatus | null | undefined;
}): boolean {
  if (!input.isCustomDomain) return true;
  if (!input.billingEnabled) return true;
  return isHostingLive(input.hostingStatus);
}

/**
 * Looks up the site for `identifier` and decides if a custom-domain request may be served.
 * Returns null when no website matches (caller handles the normal not-found path).
 */
export async function resolveCustomDomainAccess(identifier: string): Promise<{
  websiteId: string;
  subdomain: string;
  isCustomDomain: boolean;
  allow: boolean;
} | null> {
  const clean = identifier.toLowerCase().trim();
  if (!clean) return null;

  const [website, config] = await Promise.all([
    prisma.website.findFirst({
      where: {
        OR: [
          { subdomain: clean },
          { domains: { some: { hostname: clean, status: DomainStatus.ACTIVE } } },
        ],
      },
      select: {
        id: true,
        subdomain: true,
        hosting: { select: { status: true } },
      },
    }),
    prisma.hostingConfig.findUnique({ where: { id: CONFIG_ID }, select: { enabled: true } }),
  ]);
  if (!website) return null;

  const isCustomDomain = clean !== website.subdomain.toLowerCase();
  return {
    websiteId: website.id,
    subdomain: website.subdomain,
    isCustomDomain,
    allow: customDomainServeAllowed({
      billingEnabled: Boolean(config?.enabled),
      isCustomDomain,
      hostingStatus: website.hosting?.status,
    }),
  };
}
