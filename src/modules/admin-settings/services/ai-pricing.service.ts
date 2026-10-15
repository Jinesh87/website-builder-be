import {
  CONFIGURABLE_PRICE_MODELS,
  effectivePricing,
  type ModelPrice,
  type PriceOverrides,
} from "../../../common/constants/ai-models.js";
import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";

/** Other server processes pick up a change within this long. */
const CACHE_TTL_MS = 60_000;

export type AiModelPriceView = {
  id: string;
  label: string;
  kind: "chat" | "image";
  /** USD per 1M input tokens currently in use. */
  inputPerMillion: number;
  /** USD per 1M output tokens currently in use. */
  outputPerMillion: number;
  defaultInputPerMillion: number;
  defaultOutputPerMillion: number;
  /** True when the Super Admin's price differs from the built-in list price. */
  customized: boolean;
  updatedAt: string | null;
};

export type AiModelPriceInput = { modelId: string; inputPerMillion: number; outputPerMillion: number };

let cache: { overrides: PriceOverrides; loadedAt: number } | null = null;

export class AiPricingService {
  async overrides(): Promise<PriceOverrides> {
    if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.overrides;
    const rows = await prisma.aiModelPrice.findMany();
    const overrides = new Map(
      rows.map((row) => [row.modelId, { inputPerMillion: Number(row.inputPerMillion), outputPerMillion: Number(row.outputPerMillion) }]),
    );
    cache = { overrides, loadedAt: Date.now() };
    return overrides;
  }

  /** Every priced model with the Super Admin's prices applied, for usage cost estimates. */
  async pricing(): Promise<ModelPrice[]> {
    return effectivePricing(await this.overrides());
  }

  async list(): Promise<AiModelPriceView[]> {
    const rows = await prisma.aiModelPrice.findMany();
    const byId = new Map(rows.map((row) => [row.modelId, row]));
    return CONFIGURABLE_PRICE_MODELS.map((model) => {
      const row = byId.get(model.id);
      const inputPerMillion = row ? Number(row.inputPerMillion) : model.inputPerMillion;
      const outputPerMillion = row ? Number(row.outputPerMillion) : model.outputPerMillion;
      return {
        id: model.id,
        label: model.label,
        kind: model.kind,
        inputPerMillion,
        outputPerMillion,
        defaultInputPerMillion: model.inputPerMillion,
        defaultOutputPerMillion: model.outputPerMillion,
        customized: inputPerMillion !== model.inputPerMillion || outputPerMillion !== model.outputPerMillion,
        updatedAt: row?.updatedAt.toISOString() ?? null,
      };
    });
  }

  /** Saves every price at once; a price equal to the list price is stored as "use the default". */
  async update(prices: AiModelPriceInput[]): Promise<AiModelPriceView[]> {
    const known = new Map(CONFIGURABLE_PRICE_MODELS.map((model) => [model.id, model]));
    const unknown = prices.find((price) => !known.has(price.modelId));
    if (unknown) throw new AppError(400, `Unknown AI model "${unknown.modelId}".`, "VALIDATION_ERROR");

    await prisma.$transaction(
      prices.map((price) => {
        const model = known.get(price.modelId)!;
        const isDefault = price.inputPerMillion === model.inputPerMillion && price.outputPerMillion === model.outputPerMillion;
        if (isDefault) return prisma.aiModelPrice.deleteMany({ where: { modelId: price.modelId } });
        const data = { inputPerMillion: price.inputPerMillion, outputPerMillion: price.outputPerMillion };
        return prisma.aiModelPrice.upsert({ where: { modelId: price.modelId }, create: { modelId: price.modelId, ...data }, update: data });
      }),
    );
    cache = null;
    return this.list();
  }
}

export const aiPricingService = new AiPricingService();
