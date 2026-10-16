import { AppError } from "../../../common/errors/AppError.js";
import { aiModelOptions, DEFAULT_AI_MODEL, findAiModel, type AiModelOption } from "../../../common/constants/ai-models.js";
import { aiBillingService } from "../../wallet/services/ai-billing.service.js";
import { aiPricingService } from "./ai-pricing.service.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import type { AiConfig } from "../../../generated/prisma/client.js";

const CONFIG_ID = "default";

export type AiConfigView = {
  configured: boolean;
  /** Masked, e.g. "sk-••••••••3f9a". The full key is never returned. */
  openaiApiKeyMasked: string | null;
  model: string;
  updatedAt: string | null;
  models: AiModelOption[];
};

export type ClientAiSettingsView = {
  /** The client's own choice; null = platform default. */
  model: string | null;
  defaultModel: string;
  /** The model AI requests for this client actually use. */
  effectiveModel: string;
  configured: boolean;
  models: AiModelOption[];
};

export type UpdateAiConfigInput = {
  /** Omit or leave empty to keep the stored key. */
  openaiApiKey?: string;
  model: string;
};

function maskApiKey(key: string): string {
  const prefix = key.startsWith("sk-") ? "sk-" : "";
  return `${prefix}••••••••${key.slice(-4)}`;
}

function toView(config: AiConfig | null, models: AiModelOption[]): AiConfigView {
  if (!config) {
    const envKey = env.OPENAI_API_KEY;
    const envModel = env.OPENAI_MODEL || "gpt-4o-mini";
    return {
      configured: Boolean(envKey),
      openaiApiKeyMasked: envKey ? maskApiKey(envKey) : null,
      model: envModel,
      updatedAt: null,
      models,
    };
  }

  const storedKey = config.openaiApiKeyCipher ? decryptSecret(config.openaiApiKeyCipher) : null;
  const activeKey = storedKey || env.OPENAI_API_KEY;

  return {
    configured: Boolean(activeKey),
    openaiApiKeyMasked: activeKey ? maskApiKey(activeKey) : null,
    model: config.model || env.OPENAI_MODEL || "gpt-4o-mini",
    updatedAt: config.updatedAt ? config.updatedAt.toISOString() : null,
    models,
  };
}

export class AiSettingsService {
  async ensureTable(): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ai_config (
          id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
          "openaiApiKeyCipher" TEXT,
          model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
          "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
        );
      `);
    } catch {
      // Table already exists or handled by prisma
    }
  }

  async getConfigView(): Promise<AiConfigView> {
    await this.ensureTable();
    const [config, overrides] = await Promise.all([
      prisma.aiConfig.findUnique({ where: { id: CONFIG_ID } }).catch(() => null),
      aiPricingService.overrides(),
    ]);
    return toView(config, aiModelOptions(overrides));
  }

  async updateConfig(input: UpdateAiConfigInput): Promise<AiConfigView> {
    await this.ensureTable();
    const existing = await prisma.aiConfig.findUnique({ where: { id: CONFIG_ID } }).catch(() => null);
    const newKey = input.openaiApiKey?.trim();
    const model = input.model?.trim() || "gpt-4o-mini";

    const data: { model: string; openaiApiKeyCipher?: string } = {
      model,
      ...(newKey ? { openaiApiKeyCipher: encryptSecret(newKey) } : {}),
    };

    const config = existing
      ? await prisma.aiConfig.update({ where: { id: CONFIG_ID }, data })
      : await prisma.aiConfig.create({
          data: {
            id: CONFIG_ID,
            openaiApiKeyCipher: newKey ? encryptSecret(newKey) : undefined,
            model,
          },
        });

    return toView(config, aiModelOptions(await aiPricingService.overrides()));
  }

  /**
   * Pass the client id to apply that client's own model choice.
   * Every AI feature calls this first, so it also refuses clients that are out of connects.
   */
  async getCredentials(clientId?: string | null): Promise<{ apiKey: string; model: string }> {
    await this.ensureTable();
    if (clientId) await aiBillingService.assertCanUseAi(clientId);
    const [config, client] = await Promise.all([
      prisma.aiConfig.findUnique({ where: { id: CONFIG_ID } }).catch(() => null),
      clientId ? prisma.client.findUnique({ where: { id: clientId }, select: { aiModel: true } }) : null,
    ]);
    const storedKey = config?.openaiApiKeyCipher ? decryptSecret(config.openaiApiKeyCipher) : null;
    const apiKey = storedKey || env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
    const platformModel = config?.model || env.OPENAI_MODEL || process.env.OPENAI_MODEL || DEFAULT_AI_MODEL;
    // Ignore a stored choice that has since been removed from the catalog.
    const model = findAiModel(client?.aiModel)?.id ?? platformModel;

    return { apiKey, model };
  }

  async getClientSettings(clientId: string): Promise<ClientAiSettingsView> {
    const [platform, client] = await Promise.all([
      this.getConfigView(),
      prisma.client.findUnique({ where: { id: clientId }, select: { aiModel: true } }),
    ]);
    if (!client) throw new AppError(404, "Client not found");
    const model = findAiModel(client.aiModel)?.id ?? null;
    const prices = await aiPricingService.pricingFor(clientId);
    const overrides = new Map(prices.map((price) => [price.id, { inputPerMillion: price.inputPerMillion, outputPerMillion: price.outputPerMillion }]));
    return {
      model,
      defaultModel: platform.model,
      effectiveModel: model ?? platform.model,
      configured: platform.configured,
      models: aiModelOptions(overrides),
    };
  }

  async updateClientSettings(clientId: string, model: string | null): Promise<ClientAiSettingsView> {
    if (model !== null && !findAiModel(model)) {
      throw new AppError(400, "Choose one of the available AI models.", "VALIDATION_ERROR", [
        { message: "Unknown model", path: ["model"] },
      ]);
    }
    await prisma.client.update({ where: { id: clientId }, data: { aiModel: model } });
    return this.getClientSettings(clientId);
  }
}

export const aiSettingsService = new AiSettingsService();
