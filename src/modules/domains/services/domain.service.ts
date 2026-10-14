import { randomBytes } from "node:crypto";
import { DomainStatus } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma, type Domain } from "../../../generated/prisma/client.js";
import { scopeFor } from "../../websites/services/website.service.js";
import { checkDomainDns } from "./dns-check.js";
import { dnsRecordsFor, hostnameProblem, normalizeHostname, type DnsRecord } from "./domain-rules.js";

const MAX_DOMAINS_PER_WEBSITE = 5;
/** Pending domains are re-checked automatically for this long, then marked FAILED until the client verifies again. */
export const AUTO_CHECK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type DomainView = {
  id: string;
  hostname: string;
  isPrimary: boolean;
  status: DomainStatus;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  createdAt: string;
  records: DnsRecord[];
};

export type DomainList = {
  domains: DomainView[];
  /** The free address every website keeps, e.g. "shop.example-platform.com". */
  defaultHostname: string;
};

const NOT_FOUND = () => new AppError(404, "Domain not found", "DOMAIN_NOT_FOUND");

function toView(domain: Domain): DomainView {
  return {
    id: domain.id,
    hostname: domain.hostname,
    isPrimary: domain.isPrimary,
    status: domain.status,
    verifiedAt: domain.verifiedAt?.toISOString() ?? null,
    lastCheckedAt: domain.lastCheckedAt?.toISOString() ?? null,
    lastError: domain.lastError,
    createdAt: domain.createdAt.toISOString(),
    records: dnsRecordsFor(domain.hostname, domain.verificationToken),
  };
}

export class DomainService {
  async list(websiteId: string, actor: AuthUser): Promise<DomainList> {
    const website = await this.findWebsiteOrThrow(websiteId, actor);
    const domains = await prisma.domain.findMany({
      where: { websiteId: website.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return { domains: domains.map(toView), defaultHostname: `${website.subdomain}.${env.PUBLIC_SITE_DOMAIN}` };
  }

  async add(websiteId: string, rawHostname: string, actor: AuthUser): Promise<DomainView> {
    const website = await this.findWebsiteOrThrow(websiteId, actor);
    const hostname = normalizeHostname(rawHostname);
    const problem = hostname ? hostnameProblem(hostname) : "Enter a domain name like www.yourbusiness.com.";
    if (!hostname || problem) throw new AppError(400, problem!, "INVALID_DOMAIN");

    const count = await prisma.domain.count({ where: { websiteId: website.id } });
    if (count >= MAX_DOMAINS_PER_WEBSITE) {
      throw new AppError(409, `A website can have up to ${MAX_DOMAINS_PER_WEBSITE} domains. Remove one first.`, "DOMAIN_LIMIT");
    }

    try {
      const domain = await prisma.domain.create({
        data: {
          websiteId: website.id,
          clientId: website.clientId,
          hostname,
          verificationToken: `wb-${randomBytes(16).toString("hex")}`,
        },
      });
      logger.info({ websiteId: website.id, hostname, actorId: actor.id }, "Domain added");
      return toView(domain);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "This domain is already connected to a website.", "DOMAIN_TAKEN");
      }
      throw error;
    }
  }

  /** Checks the DNS records now. A domain goes live as soon as both records are found. */
  async verify(websiteId: string, domainId: string, actor: AuthUser): Promise<DomainView> {
    const domain = await this.findDomainOrThrow(websiteId, domainId, actor);
    return toView(await this.check(domain));
  }

  async makePrimary(websiteId: string, domainId: string, actor: AuthUser): Promise<DomainView> {
    const domain = await this.findDomainOrThrow(websiteId, domainId, actor);
    if (domain.status !== DomainStatus.ACTIVE) {
      throw new AppError(409, "Verify this domain before making it the main address.", "DOMAIN_NOT_ACTIVE");
    }
    const [, updated] = await prisma.$transaction([
      prisma.domain.updateMany({ where: { websiteId: domain.websiteId, id: { not: domain.id } }, data: { isPrimary: false } }),
      prisma.domain.update({ where: { id: domain.id }, data: { isPrimary: true } }),
    ]);
    return toView(updated);
  }

  async remove(websiteId: string, domainId: string, actor: AuthUser): Promise<void> {
    const domain = await this.findDomainOrThrow(websiteId, domainId, actor);
    await prisma.domain.delete({ where: { id: domain.id } });
    if (domain.isPrimary) await this.promoteNextPrimary(domain.websiteId);
    logger.info({ websiteId: domain.websiteId, hostname: domain.hostname, actorId: actor.id }, "Domain removed");
  }

  /** Re-checks domains still waiting for DNS. Run periodically by the domain checker. */
  async checkPending(): Promise<void> {
    const since = new Date(Date.now() - AUTO_CHECK_WINDOW_MS);
    const pending = await prisma.domain.findMany({ where: { status: DomainStatus.PENDING_DNS }, take: 200 });
    for (const domain of pending) {
      if (domain.createdAt < since) {
        await prisma.domain.update({
          where: { id: domain.id },
          data: { status: DomainStatus.FAILED, lastError: "We stopped checking after 7 days. Fix the DNS records, then verify again." },
        });
        continue;
      }
      await this.check(domain).catch((error: unknown) => logger.warn({ err: error, hostname: domain.hostname }, "Domain check failed"));
    }
  }

  /** Every connected custom domain; the server's nginx sync script creates a site and certificate for each. */
  async activeHostnames(): Promise<string[]> {
    const domains = await prisma.domain.findMany({
      where: { status: DomainStatus.ACTIVE },
      select: { hostname: true },
      orderBy: { hostname: "asc" },
    });
    return domains.map((domain) => domain.hostname);
  }

  private async check(domain: Domain): Promise<Domain> {
    const result = await checkDomainDns(domain.hostname, domain.verificationToken);
    const now = new Date();
    if (!result.problem) {
      const activated = domain.status !== DomainStatus.ACTIVE;
      const updated = await prisma.domain.update({
        where: { id: domain.id },
        data: { status: DomainStatus.ACTIVE, verifiedAt: domain.verifiedAt ?? now, lastCheckedAt: now, lastError: null },
      });
      if (activated) {
        logger.info({ websiteId: domain.websiteId, hostname: domain.hostname }, "Domain verified");
        const hasPrimary = await prisma.domain.count({
          where: { websiteId: domain.websiteId, isPrimary: true, status: DomainStatus.ACTIVE },
        });
        if (!hasPrimary) return prisma.domain.update({ where: { id: domain.id }, data: { isPrimary: true } });
      }
      return updated;
    }
    // A live domain stays live through a failed manual check; DNS hiccups shouldn't take a site down.
    return prisma.domain.update({
      where: { id: domain.id },
      data: {
        status: domain.status === DomainStatus.ACTIVE ? DomainStatus.ACTIVE : DomainStatus.PENDING_DNS,
        lastCheckedAt: now,
        lastError: result.problem.slice(0, 500),
      },
    });
  }

  private async promoteNextPrimary(websiteId: string): Promise<void> {
    const next = await prisma.domain.findFirst({
      where: { websiteId, status: DomainStatus.ACTIVE },
      orderBy: { verifiedAt: "asc" },
    });
    if (next) await prisma.domain.update({ where: { id: next.id }, data: { isPrimary: true } });
  }

  private async findWebsiteOrThrow(id: string, actor: AuthUser) {
    const website = await prisma.website.findFirst({
      where: { id, ...scopeFor(actor) },
      select: { id: true, clientId: true, subdomain: true },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    return website;
  }

  private async findDomainOrThrow(websiteId: string, domainId: string, actor: AuthUser): Promise<Domain> {
    const website = await this.findWebsiteOrThrow(websiteId, actor);
    const domain = await prisma.domain.findFirst({ where: { id: domainId, websiteId: website.id } });
    if (!domain) throw NOT_FOUND();
    return domain;
  }
}

export const domainService = new DomainService();
