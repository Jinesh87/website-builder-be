import { UserRole } from "../../../common/constants/roles.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import { NotificationAudience, type Notification, type Prisma } from "../../../generated/prisma/client.js";

export type NotificationInput = {
  kind: string;
  title: string;
  body: string;
  /** In-app path, e.g. "/websites/<id>?tab=hosting". */
  link?: string | null;
};

export type NotificationView = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

type Db = Prisma.TransactionClient | typeof prisma;

function toView(row: Notification): NotificationView {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    link: row.link,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

function data(input: NotificationInput) {
  return {
    kind: input.kind.slice(0, 50),
    title: input.title.slice(0, 200),
    body: input.body.slice(0, 1000),
    link: input.link?.slice(0, 300) ?? null,
  };
}

/** Client users see their workspace's notifications; Super Admins share the ADMIN feed. */
function scopeFor(actor: AuthUser): Prisma.NotificationWhereInput {
  if (actor.role === UserRole.SUPER_ADMIN) return { audience: NotificationAudience.ADMIN };
  if (!actor.clientId) throw new AppError(403, "No client workspace for this account", "FORBIDDEN");
  return { audience: NotificationAudience.CLIENT, clientId: actor.clientId };
}

export class NotificationService {
  async notifyClient(clientId: string, input: NotificationInput, db: Db = prisma): Promise<void> {
    await db.notification.create({ data: { audience: NotificationAudience.CLIENT, clientId, ...data(input) } });
  }

  /** `clientId` is the client the notification is about, so it is removed with that client. */
  async notifyAdmins(input: NotificationInput & { clientId?: string | null }, db: Db = prisma): Promise<void> {
    await db.notification.create({
      data: { audience: NotificationAudience.ADMIN, clientId: input.clientId ?? null, ...data(input) },
    });
  }

  async list(actor: AuthUser, limit: number): Promise<{ items: NotificationView[]; unreadCount: number }> {
    const where = scopeFor(actor);
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items: rows.map(toView), unreadCount };
  }

  async markRead(actor: AuthUser, id: string): Promise<void> {
    const { count } = await prisma.notification.updateMany({
      where: { ...scopeFor(actor), id, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0) {
      const exists = await prisma.notification.count({ where: { ...scopeFor(actor), id } });
      if (!exists) throw new AppError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
    }
  }

  async markAllRead(actor: AuthUser): Promise<void> {
    await prisma.notification.updateMany({ where: { ...scopeFor(actor), readAt: null }, data: { readAt: new Date() } });
  }
}

export const notificationService = new NotificationService();
