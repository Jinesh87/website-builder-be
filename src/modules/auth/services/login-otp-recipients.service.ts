import { AppError } from "../../../common/errors/AppError.js";
import { UserRole } from "../../../common/constants/roles.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";

export type LoginOtpRecipientView = {
  id: string;
  email: string;
  label: string | null;
  createdAt: string;
};

export type LoginOtpRecipientsView = {
  /** The Super Admin account's own email: always receives the code and can't be removed here. */
  accountEmail: string | null;
  recipients: LoginOtpRecipientView[];
  /** Whether login codes are currently required (LOGIN_OTP_ENABLED). */
  otpEnabled: boolean;
};

function toView(row: { id: string; email: string; label: string | null; createdAt: Date }): LoginOtpRecipientView {
  return { id: row.id, email: row.email, label: row.label, createdAt: row.createdAt.toISOString() };
}

/** Extra inboxes for the Super Admin login code, so that login can be shared across a team. */
export class LoginOtpRecipientsService {
  async list(superAdminUserId: string, otpEnabled: boolean): Promise<LoginOtpRecipientsView> {
    const [account, rows] = await Promise.all([
      prisma.user.findUnique({ where: { id: superAdminUserId }, select: { email: true } }),
      prisma.loginOtpRecipient.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    return { accountEmail: account?.email ?? null, recipients: rows.map(toView), otpEnabled };
  }

  async add(superAdminUserId: string, input: { email: string; label?: string }): Promise<LoginOtpRecipientView> {
    const email = input.email.trim().toLowerCase();
    const account = await prisma.user.findUnique({ where: { id: superAdminUserId }, select: { email: true } });
    if (account?.email === email) {
      throw new AppError(409, "This is the account's own email; it always receives the code.", "EMAIL_TAKEN");
    }
    try {
      const row = await prisma.loginOtpRecipient.create({
        data: { email, label: input.label?.trim() || null },
      });
      return toView(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "This email is already on the list.", "EMAIL_TAKEN");
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const { count } = await prisma.loginOtpRecipient.deleteMany({ where: { id } });
    if (count === 0) throw new AppError(404, "Email not found.", "NOT_FOUND");
  }

  /** Every inbox the login code goes to for this user: Super Admin gets the extra list, everyone else only their own email. */
  async recipientsFor(user: { role: string; email: string | null }): Promise<string[]> {
    const own = user.email ? [user.email.toLowerCase()] : [];
    if (user.role !== UserRole.SUPER_ADMIN) return own;
    const extra = await prisma.loginOtpRecipient.findMany({ select: { email: true } });
    return [...new Set([...own, ...extra.map((row) => row.email)])];
  }
}

export const loginOtpRecipientsService = new LoginOtpRecipientsService();
