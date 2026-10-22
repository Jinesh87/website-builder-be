import { AppError } from "../../../common/errors/AppError.js";
import { ClientSource, UserRole, UserStatus } from "../../../common/constants/roles.js";
import { hashPassword } from "../../../common/utils/hash.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { authService } from "../../auth/services/auth.service.js";
import { revokePasswordResetToken } from "../../auth/utils/password-reset.js";
import type {
  ClientDetailsInput,
  ClientListQuery,
  ClientListResult,
  ClientView,
  CreateClientInput,
  CreateClientResult,
} from "../types/client.types.js";

/** Each client workspace currently has a single login account: its earliest CLIENT user. */
const clientInclude = {
  users: {
    where: { role: UserRole.CLIENT },
    orderBy: { createdAt: "asc" },
    take: 1,
  },
} as const satisfies Prisma.ClientInclude;

type ClientWithOwner = Prisma.ClientGetPayload<{ include: typeof clientInclude }>;

const EMAIL_TAKEN = () => new AppError(409, "An account with this email already exists.", "EMAIL_TAKEN");
const USERNAME_TAKEN = () => new AppError(409, "This username is already taken.", "USERNAME_TAKEN");
const NOT_FOUND = () => new AppError(404, "Client not found", "CLIENT_NOT_FOUND");

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function toView(client: ClientWithOwner): ClientView {
  const owner = client.users[0];
  return {
    id: client.id,
    businessName: client.businessName,
    address: client.address,
    source: client.source,
    shopFeatureEnabled: client.shopFeatureEnabled,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    owner: owner
      ? {
          id: owner.id,
          fullName: owner.fullName,
          email: owner.email,
          username: owner.username,
          phone: owner.phone,
          status: owner.status,
          emailVerified: owner.emailVerifiedAt !== null,
          lastSignedInAt: owner.lastSignedInAt?.toISOString() ?? null,
        }
      : null,
  };
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export class ClientService {
  async list(query: ClientListQuery): Promise<ClientListResult> {
    const search = query.search?.trim();
    const userFilter: Prisma.UserWhereInput = {
      role: UserRole.CLIENT,
      ...(query.status ? { status: query.status } : {}),
    };

    const where: Prisma.ClientWhereInput = {
      isInternal: false,
      ...(query.source ? { source: query.source } : {}),
      ...(query.status ? { users: { some: userFilter } } : {}),
      ...(search
        ? {
            OR: [
              { businessName: { contains: search, mode: "insensitive" } },
              { users: { some: { ...userFilter, email: { contains: search, mode: "insensitive" } } } },
              { users: { some: { ...userFilter, username: { contains: search, mode: "insensitive" } } } },
              { users: { some: { ...userFilter, fullName: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [total, clients] = await prisma.$transaction([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: clientInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items: clients.map(toView), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<ClientView> {
    return toView(await this.findOrThrow(id));
  }

  /** The admin chooses the login, so the account is active immediately: no invite and no verification. */
  async create(input: CreateClientInput, actorId: string): Promise<CreateClientResult> {
    const email = emptyToNull(input.email)?.toLowerCase() ?? null;
    const username = input.username.trim().toLowerCase();
    await this.assertLoginAvailable({ email, username });

    let client: ClientWithOwner;
    try {
      client = await prisma.client.create({
        data: {
          businessName: input.businessName.trim(),
          address: emptyToNull(input.address),
          source: ClientSource.ADMIN_CREATED,
          users: {
            create: {
              email,
              username,
              passwordHash: await hashPassword(input.password),
              fullName: input.fullName.trim(),
              phone: emptyToNull(input.phone),
              role: UserRole.CLIENT,
              status: UserStatus.ACTIVE,
            },
          },
        },
        include: clientInclude,
      });
    } catch (error) {
      if (isUniqueViolation(error)) await this.throwLoginConflict({ email, username });
      throw error;
    }
    logger.info({ clientId: client.id, actorId }, "Client created by Super Admin");

    return { client: toView(client) };
  }

  async setShopFeature(id: string, shopFeatureEnabled: boolean, actorId: string): Promise<ClientView> {
    await this.findOrThrow(id);
    await prisma.client.update({ where: { id }, data: { shopFeatureEnabled } });
    logger.info({ clientId: id, actorId, shopFeatureEnabled }, "Client shop feature updated");
    return this.get(id);
  }

  async update(id: string, input: ClientDetailsInput, actorId: string): Promise<ClientView> {
    const client = await this.findOrThrow(id);
    const owner = client.users[0];
    const email = emptyToNull(input.email)?.toLowerCase() ?? null;
    const username = input.username?.trim().toLowerCase() || null;

    if (owner) {
      // Accounts without a username log in with their email, so it can't be removed or replaced by a username.
      if (username && !owner.username) {
        throw new AppError(400, "This client logs in with their email, so a username can't be added.", "USERNAME_NOT_ALLOWED");
      }
      if (!email && !owner.username) {
        throw new AppError(400, "Email is required for clients who log in with their email.", "EMAIL_REQUIRED");
      }
      await this.assertLoginAvailable({ email, username }, owner.id);
    }

    try {
      await prisma.$transaction([
        prisma.client.update({
          where: { id },
          data: { businessName: input.businessName.trim(), address: emptyToNull(input.address) },
        }),
        ...(owner
          ? [
              prisma.user.update({
                where: { id: owner.id },
                data: {
                  fullName: input.fullName.trim(),
                  email,
                  phone: emptyToNull(input.phone),
                  ...(username ? { username } : {}),
                },
              }),
            ]
          : []),
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) await this.throwLoginConflict({ email, username }, owner?.id);
      throw error;
    }
    const emailChanged = owner !== undefined && email !== owner.email;
    if (emailChanged) await revokePasswordResetToken(owner.id);
    logger.info({ clientId: id, actorId, emailChanged }, "Client updated");
    return this.get(id);
  }

  /** Only for clients whose login the admin created; others reset their own password by email. */
  async setPassword(id: string, password: string, actorId: string): Promise<ClientView> {
    const owner = this.requireOwner(await this.findOrThrow(id));
    if (!owner.username) {
      throw new AppError(
        409,
        "This client manages their own password. Ask them to use “Forgot password”.",
        "PASSWORD_MANAGED_BY_CLIENT",
      );
    }
    await authService.setPasswordByAdmin(owner.id, password);
    logger.info({ clientId: id, actorId }, "Client password set by Super Admin");
    return this.get(id);
  }

  /** Suspended clients can't log in, and every existing session is revoked immediately. */
  async suspend(id: string, actorId: string): Promise<ClientView> {
    const owner = this.requireOwner(await this.findOrThrow(id));
    if (owner.status === UserStatus.SUSPENDED) {
      throw new AppError(409, "This client is already suspended.", "ALREADY_SUSPENDED");
    }
    await prisma.user.update({ where: { id: owner.id }, data: { status: UserStatus.SUSPENDED } });
    await authService.revokeAllSessions(owner.id);
    logger.info({ clientId: id, actorId }, "Client suspended");
    return this.get(id);
  }

  /**
   * Restores access. Clients with admin-issued credentials never need verification;
   * others who never verified their email go back to pending verification.
   */
  async reactivate(id: string, actorId: string): Promise<ClientView> {
    const owner = this.requireOwner(await this.findOrThrow(id));
    if (owner.status !== UserStatus.SUSPENDED) {
      throw new AppError(409, "This client is not suspended.", "NOT_SUSPENDED");
    }
    const canLogIn = owner.username !== null || owner.emailVerifiedAt !== null;
    await prisma.user.update({
      where: { id: owner.id },
      data: { status: canLogIn ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION },
    });
    logger.info({ clientId: id, actorId }, "Client reactivated");
    return this.get(id);
  }

  /**
   * For pending clients: admin-created ones get a fresh set-password invite,
   * self-signup ones get a new verification code.
   */
  async resendEmail(id: string): Promise<{ emailSent: boolean }> {
    const client = await this.findOrThrow(id);
    const owner = this.requireOwner(client);
    if (owner.status !== UserStatus.PENDING_VERIFICATION) {
      throw new AppError(409, "This client has already verified their email.", "ALREADY_VERIFIED");
    }
    if (!owner.email) {
      throw new AppError(409, "This client has no email address.", "CLIENT_HAS_NO_EMAIL");
    }

    if (client.source === ClientSource.ADMIN_CREATED) {
      return { emailSent: await authService.sendInvite({ id: owner.id, email: owner.email, fullName: owner.fullName }) };
    }
    const dispatch = await authService.resendVerification(owner.email);
    return { emailSent: dispatch.emailSent };
  }

  private async findOrThrow(id: string): Promise<ClientWithOwner> {
    const client = await prisma.client.findFirst({ where: { id, isInternal: false }, include: clientInclude });
    if (!client) throw NOT_FOUND();
    return client;
  }

  /** `exceptUserId` lets an account keep its own email/username when editing. */
  private async assertLoginAvailable(
    login: { email: string | null; username: string | null },
    exceptUserId?: string,
  ): Promise<void> {
    const [emailOwner, usernameOwner] = await Promise.all([
      login.email ? prisma.user.findUnique({ where: { email: login.email }, select: { id: true } }) : null,
      login.username ? prisma.user.findUnique({ where: { username: login.username }, select: { id: true } }) : null,
    ]);
    if (emailOwner && emailOwner.id !== exceptUserId) throw EMAIL_TAKEN();
    if (usernameOwner && usernameOwner.id !== exceptUserId) throw USERNAME_TAKEN();
  }

  /** A unique violation means another request claimed the login between the check and the write. */
  private async throwLoginConflict(
    login: { email: string | null; username: string | null },
    exceptUserId?: string,
  ): Promise<never> {
    await this.assertLoginAvailable(login, exceptUserId);
    throw new AppError(409, "This email or username is already in use.", "LOGIN_TAKEN");
  }

  private requireOwner(client: ClientWithOwner) {
    const owner = client.users[0];
    if (!owner) throw new AppError(409, "This client has no login account.", "CLIENT_HAS_NO_USER");
    return owner;
  }
}

export const clientService = new ClientService();
