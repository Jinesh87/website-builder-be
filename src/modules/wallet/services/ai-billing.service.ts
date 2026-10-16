import { DEFAULT_AI_MODEL, type ModelPrice } from "../../../common/constants/ai-models.js";
import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { WalletTransactionSource, WalletTransactionType } from "../../../generated/prisma/client.js";
import { aiPricingService } from "../../admin-settings/services/ai-pricing.service.js";
import { exchangeRateService, type UsdInrRate } from "./exchange-rate.service.js";
import { applyLedgerEntry, CONNECTS_PER_RUPEE, formatConnects } from "./wallet.service.js";

const CONFIG_ID = "default";
const CONFIG_CACHE_TTL_MS = 60_000;

const FEATURE_LABELS: Record<string, string> = {
  site_copilot: "Site copilot",
  site_copilot_image: "Copilot image",
  media_image_variations: "Image variations",
  site_plan: "Site plan",
  site_page: "Page generation",
  plan: "Page plan",
  page: "Page edit",
  section: "Section edit",
  section_add: "Add section",
  page_seo: "SEO",
};

export type AiUsageRecord = {
  clientId: string;
  websiteId: string | null;
  userId: string | null;
  /** As OpenAI reports it, e.g. "gpt-4o-mini-2024-07-18". */
  model: string;
  scope: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
};

export type BillingSettingsView = {
  market: UsdInrRate;
  /** Rupees added per US dollar. */
  margin: number;
  /** Market rate plus margin: what one US dollar of AI usage costs a client, in rupees. */
  effectiveRate: number;
  connectsPerRupee: number;
  /** Connects charged per US dollar of AI usage. */
  connectsPerUsd: number;
  /** Connects required before an AI request can start. 0 means any balance above zero. */
  minAiBalance: number;
};

let configCache: { margin: number; minAiBalance: number; loadedAt: number } | null = null;

/** Logs carry dated snapshots ("gpt-4o-mini-2024-07-18"); unknown models are priced like the default model. */
function priceFor(model: string, pricing: readonly ModelPrice[]): ModelPrice {
  return (
    pricing.find((price) => model === price.id || model.startsWith(`${price.id}-20`)) ??
    pricing.find((price) => price.id === DEFAULT_AI_MODEL)!
  );
}

function featureLabel(scope: string): string {
  return FEATURE_LABELS[scope] ?? scope.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}

export class AiBillingService {
  async config(): Promise<{ margin: number; minAiBalance: number }> {
    if (configCache && Date.now() - configCache.loadedAt < CONFIG_CACHE_TTL_MS) {
      return { margin: configCache.margin, minAiBalance: configCache.minAiBalance };
    }
    const row = await prisma.billingConfig.findUnique({ where: { id: CONFIG_ID } });
    const value = { margin: Number(row?.usdInrMargin ?? 0), minAiBalance: Number(row?.minAiBalance ?? 0) };
    configCache = { ...value, loadedAt: Date.now() };
    return value;
  }

  async settings(): Promise<BillingSettingsView> {
    const [market, { margin, minAiBalance }] = await Promise.all([exchangeRateService.current(), this.config()]);
    const effectiveRate = Math.round((market.rate + margin) * 10_000) / 10_000;
    return {
      market,
      margin,
      effectiveRate,
      connectsPerRupee: CONNECTS_PER_RUPEE,
      connectsPerUsd: Math.round(effectiveRate * CONNECTS_PER_RUPEE * 1000) / 1000,
      minAiBalance,
    };
  }

  async updateSettings(margin: number, minAiBalance: number): Promise<BillingSettingsView> {
    await prisma.billingConfig.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, usdInrMargin: margin.toFixed(2), minAiBalance: minAiBalance.toFixed(3) },
      update: { usdInrMargin: margin.toFixed(2), minAiBalance: minAiBalance.toFixed(3) },
    });
    configCache = null;
    return this.settings();
  }

  async refreshRate(): Promise<BillingSettingsView> {
    await exchangeRateService.refresh();
    return this.settings();
  }

  /** Called before any AI request. The balance must be above zero and at least the platform minimum. */
  async assertCanUseAi(clientId: string): Promise<void> {
    const [wallet, { minAiBalance }] = await Promise.all([
      prisma.wallet.findUnique({ where: { clientId }, select: { balance: true } }),
      this.config(),
    ]);
    const balance = Number(wallet?.balance ?? 0);
    if (balance <= 0 || balance < minAiBalance) {
      throw new AppError(
        402,
        minAiBalance > 0
          ? `You need at least ${formatConnects(minAiBalance)} to use AI. You have ${formatConnects(balance)}.`
          : "You're out of connects. Buy more connects to keep using AI.",
        "INSUFFICIENT_BALANCE",
      );
    }
  }

  /**
   * Logs one AI call and charges the client for it at today's rate plus margin.
   * The call has already happened, so the charge goes through even if it takes the balance below zero.
   * Never throws: a billing problem must not fail the user's request.
   */
  async recordUsage(usage: AiUsageRecord): Promise<void> {
    try {
      const [pricing, billing] = await Promise.all([aiPricingService.pricingFor(usage.clientId), this.settings()]);
      const price = priceFor(usage.model, pricing);
      const costUsd = (usage.promptTokens * price.inputPerMillion + usage.completionTokens * price.outputPerMillion) / 1_000_000;
      // Rounded up to the thousandth of a connect the ledger stores.
      const connects = Math.ceil(costUsd * billing.connectsPerUsd * 1000 - 1e-9) / 1000;

      await prisma.$transaction(async (tx) => {
        await tx.aiUsageLog.create({
          data: {
            clientId: usage.clientId,
            websiteId: usage.websiteId,
            userId: usage.userId,
            model: usage.model.slice(0, 100),
            scope: usage.scope,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            durationMs: usage.durationMs,
            costUsd: costUsd.toFixed(8),
            usdInrRate: billing.effectiveRate.toFixed(4),
            connectsCharged: connects.toFixed(3),
          },
        });
        if (connects <= 0) return;
        await applyLedgerEntry(tx, usage.clientId, {
          type: WalletTransactionType.DEBIT,
          source: WalletTransactionSource.AI_USAGE,
          amount: connects,
          description: `${featureLabel(usage.scope)} (${usage.model.slice(0, 60)})`,
          userId: usage.userId,
          allowNegative: true,
        });
      });
    } catch (error) {
      logger.error({ err: error, clientId: usage.clientId, scope: usage.scope }, "Could not record or charge AI usage");
    }
  }
}

export const aiBillingService = new AiBillingService();
