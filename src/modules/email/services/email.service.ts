import { Resend } from "resend";
import { AppError } from "../../../common/errors/AppError.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import type { MessagingConfig } from "../../../generated/prisma/client.js";
import {
  clientInviteEmail,
  contactFormLeadEmail,
  emailChangeCodeEmail,
  hostingNoticeEmail,
  passwordResetEmail,
  testEmail,
  verificationCodeEmail,
  type RenderedEmail,
} from "../templates/email.templates.js";

const CONFIG_ID = "default";

export type EmailConfigView = {
  configured: boolean;
  /** Masked, e.g. "re_••••••••3f9a". The full key is never returned. */
  resendApiKeyMasked: string | null;
  fromEmail: string | null;
  fromName: string | null;
  enabled: boolean;
  updatedAt: string | null;
};

export type UpdateEmailConfigInput = {
  /** Omit or leave empty to keep the stored key. */
  resendApiKey?: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
};

function maskApiKey(key: string): string {
  const prefix = key.startsWith("re_") ? "re_" : "";
  return `${prefix}••••••••${key.slice(-4)}`;
}

function toView(config: MessagingConfig | null): EmailConfigView {
  if (!config) {
    return {
      configured: false,
      resendApiKeyMasked: null,
      fromEmail: null,
      fromName: null,
      enabled: false,
      updatedAt: null,
    };
  }
  const apiKey = decryptSecret(config.resendApiKeyCipher);
  return {
    configured: apiKey !== null,
    resendApiKeyMasked: apiKey ? maskApiKey(apiKey) : null,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    enabled: config.enabled,
    updatedAt: config.updatedAt.toISOString(),
  };
}

export class EmailService {
  async getConfigView(): Promise<EmailConfigView> {
    const config = await prisma.messagingConfig.findUnique({ where: { id: CONFIG_ID } });
    return toView(config);
  }

  async updateConfig(input: UpdateEmailConfigInput): Promise<EmailConfigView> {
    const existing = await prisma.messagingConfig.findUnique({ where: { id: CONFIG_ID } });
    const newKey = input.resendApiKey?.trim();

    if (!newKey && !existing) {
      throw new AppError(400, "Resend API key is required", "VALIDATION_ERROR", [
        { message: "Resend API key is required", path: ["resendApiKey"] },
      ]);
    }

    const data = {
      fromEmail: input.fromEmail.trim().toLowerCase(),
      fromName: input.fromName.trim(),
      enabled: input.enabled,
      ...(newKey ? { resendApiKeyCipher: encryptSecret(newKey) } : {}),
    };

    const config = existing
      ? await prisma.messagingConfig.update({ where: { id: CONFIG_ID }, data })
      : await prisma.messagingConfig.create({
          data: { id: CONFIG_ID, resendApiKeyCipher: encryptSecret(newKey!), ...data },
        });

    return toView(config);
  }

  async sendVerificationCode(params: { to: string; fullName: string; code: string; expiresInMinutes: number }) {
    await this.send(params.to, (brand) => verificationCodeEmail({ brand, ...params }));
  }

  async sendEmailChangeCode(params: { to: string; fullName: string; code: string; expiresInMinutes: number }) {
    await this.send(params.to, (brand) => emailChangeCodeEmail({ brand, ...params }));
  }

  async sendPasswordReset(params: { to: string; fullName: string; resetLink: string; expiresInMinutes: number }) {
    await this.send(params.to, (brand) => passwordResetEmail({ brand, ...params }));
  }

  async sendClientInvite(params: { to: string; fullName: string; inviteLink: string; expiresInHours: number }) {
    await this.send(params.to, (brand) => clientInviteEmail({ brand, ...params }));
  }

  async sendHostingNotice(params: {
    to: string;
    fullName: string;
    subject: string;
    heading: string;
    lines: string[];
    actionLabel: string;
    actionLink: string;
  }) {
    await this.send(params.to, (brand) => hostingNoticeEmail({ brand, ...params }));
  }

  /** Sends regardless of the "enabled" flag so the Super Admin can verify settings before enabling. */
  async sendTest(to: string) {
    await this.send(to, (brand) => testEmail({ brand }), { ignoreDisabled: true });
  }

  async sendContactFormLead(params: {
    to: string;
    siteName: string;
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    message: string;
  }) {
    await this.send(params.to, () => contactFormLeadEmail(params));
  }

  private async send(
    to: string,
    render: (brand: string) => RenderedEmail,
    options: { ignoreDisabled?: boolean } = {},
  ): Promise<void> {
    const config = await prisma.messagingConfig.findUnique({ where: { id: CONFIG_ID } });
    if (!config) {
      throw new AppError(503, "Email is not configured yet", "EMAIL_NOT_CONFIGURED");
    }
    if (!config.enabled && !options.ignoreDisabled) {
      throw new AppError(503, "Email sending is disabled", "EMAIL_DISABLED");
    }
    const apiKey = decryptSecret(config.resendApiKeyCipher);
    if (!apiKey) {
      throw new AppError(
        503,
        "Stored Resend API key can't be decrypted. Re-enter it in email settings.",
        "EMAIL_KEY_UNREADABLE",
      );
    }

    const email = render(config.fromName);
    const { data, error } = await new Resend(apiKey).emails.send({
      from: `${config.fromName} <${config.fromEmail}>`,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      logger.error({ err: error, to, subject: email.subject }, "Resend rejected email");
      throw new AppError(502, `Email could not be sent: ${error.message}`, "EMAIL_SEND_FAILED");
    }
    logger.info({ to, emailId: data?.id, subject: email.subject }, "Email sent");
  }
}

export const emailService = new EmailService();
