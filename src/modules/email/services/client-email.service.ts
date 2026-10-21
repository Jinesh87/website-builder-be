import { Resend } from "resend";
import { AppError } from "../../../common/errors/AppError.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { EmailProvider, type ClientEmailConfig } from "../../../generated/prisma/client.js";
import { contactFormLeadEmail, testEmail, type RenderedEmail } from "../templates/email.templates.js";

export type ClientEmailConfigView = {
  configured: boolean;
  provider: "RESEND" | "BREVO" | null;
  /** Masked. The full key is never returned. */
  apiKeyMasked: string | null;
  fromEmail: string | null;
  fromName: string | null;
  enabled: boolean;
  updatedAt: string | null;
};

export type UpdateClientEmailInput = {
  provider: "RESEND" | "BREVO";
  /** Omit or leave empty to keep the stored key. */
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
};

export type WebsiteLead = {
  to: string;
  siteName: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  message: string;
};

type Outbound = {
  to: string;
  replyTo?: { email: string; name: string };
  email: RenderedEmail;
};

function maskKey(key: string): string {
  const prefix = key.startsWith("re_") ? "re_" : key.startsWith("xkeysib-") ? "xkeysib-" : "";
  return `${prefix}••••••••${key.slice(-4)}`;
}

function toView(config: ClientEmailConfig | null): ClientEmailConfigView {
  if (!config) {
    return { configured: false, provider: null, apiKeyMasked: null, fromEmail: null, fromName: null, enabled: false, updatedAt: null };
  }
  const apiKey = decryptSecret(config.apiKeyCipher);
  return {
    configured: apiKey !== null,
    provider: config.provider,
    apiKeyMasked: apiKey ? maskKey(apiKey) : null,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    enabled: config.enabled,
    updatedAt: config.updatedAt.toISOString(),
  };
}

async function sendBrevo(apiKey: string, fromName: string, fromEmail: string, outbound: Outbound): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: outbound.to }],
      replyTo: outbound.replyTo ? { email: outbound.replyTo.email, name: outbound.replyTo.name } : undefined,
      subject: outbound.email.subject,
      htmlContent: outbound.email.html,
      textContent: outbound.email.text,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new AppError(502, `Brevo could not send the email: ${(body.message ?? `status ${response.status}`).slice(0, 200)}`, "EMAIL_SEND_FAILED");
  }
}

async function sendResend(apiKey: string, fromName: string, fromEmail: string, outbound: Outbound): Promise<void> {
  const { data, error } = await new Resend(apiKey).emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: outbound.to,
    replyTo: outbound.replyTo?.email,
    subject: outbound.email.subject,
    html: outbound.email.html,
    text: outbound.email.text,
  });
  if (error) {
    throw new AppError(502, `Resend could not send the email: ${error.message}`, "EMAIL_SEND_FAILED");
  }
  logger.info({ to: outbound.to, emailId: data?.id }, "Client email sent");
}

export class ClientEmailService {
  async get(clientId: string): Promise<ClientEmailConfigView> {
    return toView(await prisma.clientEmailConfig.findUnique({ where: { clientId } }));
  }

  async update(clientId: string, input: UpdateClientEmailInput): Promise<ClientEmailConfigView> {
    const existing = await prisma.clientEmailConfig.findUnique({ where: { clientId } });
    const newKey = input.apiKey?.trim();
    const providerChanged = existing !== null && existing.provider !== input.provider;
    if ((!existing || providerChanged) && !newKey) {
      throw new AppError(400, "API key is required", "VALIDATION_ERROR", [{ message: "API key is required", path: ["apiKey"] }]);
    }
    const data = {
      provider: input.provider === "BREVO" ? EmailProvider.BREVO : EmailProvider.RESEND,
      fromEmail: input.fromEmail.trim().toLowerCase(),
      fromName: input.fromName.trim(),
      enabled: input.enabled,
      ...(newKey ? { apiKeyCipher: encryptSecret(newKey) } : {}),
    };
    const config = existing
      ? await prisma.clientEmailConfig.update({ where: { clientId }, data })
      : await prisma.clientEmailConfig.create({ data: { clientId, apiKeyCipher: encryptSecret(newKey!), ...data } });
    return toView(config);
  }

  /** Sends a contact-form lead through the client's account. Returns false when they haven't set one up. */
  async sendWebsiteLead(clientId: string, lead: WebsiteLead): Promise<boolean> {
    const config = await prisma.clientEmailConfig.findUnique({ where: { clientId } });
    if (!config?.enabled) return false;
    const email = contactFormLeadEmail(lead);
    await this.dispatch(config, {
      to: lead.to,
      replyTo: { email: lead.senderEmail, name: lead.senderName },
      email,
    });
    return true;
  }

  async sendTest(clientId: string, to: string): Promise<void> {
    const config = await prisma.clientEmailConfig.findUnique({ where: { clientId } });
    if (!config) throw new AppError(400, "Save your email settings first.", "EMAIL_NOT_CONFIGURED");
    await this.dispatch(config, { to, email: testEmail({ brand: config.fromName }) });
  }

  private async dispatch(config: ClientEmailConfig, outbound: Outbound): Promise<void> {
    const apiKey = decryptSecret(config.apiKeyCipher);
    if (!apiKey) {
      throw new AppError(503, "The stored API key can't be read. Enter it again.", "EMAIL_KEY_UNREADABLE");
    }
    if (config.provider === EmailProvider.BREVO) {
      await sendBrevo(apiKey, config.fromName, config.fromEmail, outbound);
    } else {
      await sendResend(apiKey, config.fromName, config.fromEmail, outbound);
    }
    logger.info({ clientId: config.clientId, provider: config.provider, to: outbound.to, subject: outbound.email.subject }, "Website email sent");
  }
}

export const clientEmailService = new ClientEmailService();
