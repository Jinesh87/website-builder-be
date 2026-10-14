import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../../config/env.js";
import { domainService } from "../services/domain.service.js";

type WebsiteParams = { id: string };
type DomainParams = { id: string; domainId: string };

export class DomainController {
  list = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await domainService.list(req.params.id, req.user!));
    } catch (error) {
      next(error);
    }
  };

  add = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ domain: await domainService.add(req.params.id, req.body.hostname, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  verify = async (req: Request<DomainParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ domain: await domainService.verify(req.params.id, req.params.domainId, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  makePrimary = async (req: Request<DomainParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ domain: await domainService.makePrimary(req.params.id, req.params.domainId, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request<DomainParams>, res: Response, next: NextFunction) => {
    try {
      await domainService.remove(req.params.id, req.params.domainId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Plain-text list for the nginx domain-sync script. The header line lets the script tell
   * a real (possibly empty) list from an error page, so an outage never removes sites.
   */
  syncList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isSyncRequest(req)) {
        res.status(404).end();
        return;
      }
      const hostnames = await domainService.activeHostnames();
      res.type("text/plain").setHeader("Cache-Control", "no-store");
      res.send([SYNC_LIST_HEADER, ...hostnames, ""].join("\n"));
    } catch (error) {
      next(error);
    }
  };
}

const SYNC_LIST_HEADER = "# webbuilder domains v1";

/** Loopback only (the script runs on the same server) and the shared token. */
function isSyncRequest(req: Request): boolean {
  if (!env.DOMAIN_SYNC_TOKEN) return false;
  const remote = req.socket.remoteAddress ?? "";
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) return false;
  const given = Buffer.from(req.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(env.DOMAIN_SYNC_TOKEN);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const domainController = new DomainController();
