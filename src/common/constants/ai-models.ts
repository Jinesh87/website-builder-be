export type AiModelTier = "low" | "medium" | "high";

export type AiModelInfo = {
  id: string;
  label: string;
  description: string;
  /** USD per 1M prompt (input) tokens. */
  inputPerMillion: number;
  /** USD per 1M completion (output) tokens. */
  outputPerMillion: number;
  /** Reasoning models also bill hidden "thinking" tokens as completion tokens. */
  reasoning: boolean;
};

export type AiModelOption = AiModelInfo & {
  /** Approximate cost of one AI request relative to the cheapest model (1 = cheapest). */
  relativeCost: number;
  /** Cost band derived from `relativeCost`. */
  tier: AiModelTier;
};

export const DEFAULT_AI_MODEL = "gpt-4o-mini";

/** Models clients and the Super Admin can pick from. Prices are OpenAI standard list prices. */
export const AI_MODELS: readonly AiModelInfo[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    description: "Fast and the cheapest option. Great for everyday edits and copy.",
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    reasoning: false,
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    description: "Still affordable, with better instruction following on bigger pages.",
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
    reasoning: false,
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "High quality writing and layouts for full page redesigns.",
    inputPerMillion: 2,
    outputPerMillion: 8,
    reasoning: false,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "Polished, creative copy with balanced speed.",
    inputPerMillion: 2.5,
    outputPerMillion: 10,
    reasoning: false,
  },
  {
    id: "o3-mini",
    label: "o3-mini",
    description: "Reasons step by step before answering; good for complex page structures.",
    inputPerMillion: 1.1,
    outputPerMillion: 4.4,
    reasoning: true,
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    description: "Deepest reasoning and best design quality. Slowest and most expensive per request.",
    inputPerMillion: 1.25,
    outputPerMillion: 10,
    reasoning: true,
  },
];

/** Prices for retired models that may still appear in usage logs. */
const LEGACY_PRICING: readonly Pick<AiModelInfo, "id" | "inputPerMillion" | "outputPerMillion">[] = [
  { id: "gpt-4.5-preview", inputPerMillion: 75, outputPerMillion: 150 },
  { id: "gpt-4-turbo", inputPerMillion: 10, outputPerMillion: 30 },
  { id: "gpt-4", inputPerMillion: 30, outputPerMillion: 60 },
  { id: "o1-mini", inputPerMillion: 1.1, outputPerMillion: 4.4 },
];

/**
 * Every image feature uses this fixed model, whatever chat model the client picked; output tokens are image tokens.
 * Input is priced at the image-token rate because the requests are mostly image input.
 */
export const IMAGE_GENERATION_MODEL = "gpt-image-2.5-sunburst";

/** Every priced model, for estimating the cost of logged usage. */
export const AI_MODEL_PRICING: readonly Pick<AiModelInfo, "id" | "inputPerMillion" | "outputPerMillion">[] = [
  ...AI_MODELS,
  ...LEGACY_PRICING,
  { id: "gpt-image-1", inputPerMillion: 5, outputPerMillion: 40 },
  { id: IMAGE_GENERATION_MODEL, inputPerMillion: 8, outputPerMillion: 30 },
];

export function findAiModel(id: string | null | undefined): AiModelInfo | undefined {
  return id ? AI_MODELS.find((model) => model.id === id) : undefined;
}

/** o-series and gpt-5 models reject a custom temperature and spend completion tokens on reasoning. */
export function isReasoningModel(model: string): boolean {
  return /^(o\d|gpt-5)/i.test(model);
}

// Typical builder request: ~3 prompt tokens per completion token; reasoning models think ~3x the visible output.
const PROMPT_SHARE = 0.75;
const REASONING_TOKEN_FACTOR = 3;

function requestCostIndex(model: AiModelInfo): number {
  const output = model.outputPerMillion * (model.reasoning ? REASONING_TOKEN_FACTOR : 1);
  return model.inputPerMillion * PROMPT_SHARE + output * (1 - PROMPT_SHARE);
}

// Upper bounds (exclusive) of the relative-cost bands.
const LOW_COST_MAX = 5;
const MEDIUM_COST_MAX = 20;

function costTier(relativeCost: number): AiModelTier {
  if (relativeCost < LOW_COST_MAX) return "low";
  return relativeCost < MEDIUM_COST_MAX ? "medium" : "high";
}

/** Catalog with cost estimates, cheapest first. */
export function aiModelOptions(): AiModelOption[] {
  const cheapest = Math.min(...AI_MODELS.map(requestCostIndex));
  return AI_MODELS.map((model) => {
    const ratio = requestCostIndex(model) / cheapest;
    const relativeCost = ratio < 10 ? Math.round(ratio * 10) / 10 : Math.round(ratio);
    return { ...model, relativeCost, tier: costTier(ratio) };
  }).sort((a, b) => a.relativeCost - b.relativeCost);
}
