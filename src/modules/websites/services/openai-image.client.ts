import { IMAGE_GENERATION_MODEL } from "../../../common/constants/ai-models.js";
import { AppError } from "../../../common/errors/AppError.js";
import { aiBillingService } from "../../wallet/services/ai-billing.service.js";
import type { OpenAiContext } from "./openai-json.client.js";

const ENDPOINT = "https://api.openai.com/v1/images/generations";
const REQUEST_TIMEOUT_MS = 120_000;
const STYLE_SUFFIX = "High quality photograph, natural light, no text, no lettering, no logos, no watermarks.";

export type ImageRequest = {
  /** What the picture shows. */
  description: string;
  /** "landscape" suits backgrounds and banners. */
  shape: "landscape" | "square" | "portrait";
  signal?: AbortSignal;
};

/** Returns the image bytes. Injected into the copilot so tests can fake it. */
export type ImageGenerator = (request: ImageRequest) => Promise<Buffer>;

const SIZES: Record<ImageRequest["shape"], string> = {
  landscape: "1536x1024",
  square: "1024x1024",
  portrait: "1024x1536",
};

type ImageResponse = {
  data?: Array<{ b64_json?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  error?: { message?: string };
};

/** An ImageGenerator bound to one OpenAI key that logs usage per image. */
export function createOpenAiImageGenerator(context: Omit<OpenAiContext, "model">, scope: string): ImageGenerator {
  return async ({ description, shape, signal }) => {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${context.apiKey}` },
        body: JSON.stringify({
          model: IMAGE_GENERATION_MODEL,
          prompt: `${description.slice(0, 1500)}\n${STYLE_SUFFIX}`,
          size: SIZES[shape],
          quality: "medium",
          output_format: "jpeg",
          output_compression: 85,
          n: 1,
        }),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (error) {
      if (signal?.aborted) throw new AppError(499, "AI generation was cancelled.", "CANCELLED");
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new AppError(502, timedOut ? "Generating the image took too long." : "Could not reach the AI provider.", "AI_IMAGE_FAILED");
    }

    const body = (await response.json().catch(() => ({}))) as ImageResponse;
    if (!response.ok) {
      const message = body.error?.message ?? `status ${response.status}`;
      if (response.status === 400 && /safety|policy/i.test(message)) {
        throw new AppError(400, "The image request was blocked by the AI provider's safety rules. Try describing it differently.", "AI_IMAGE_BLOCKED");
      }
      throw new AppError(502, `Image generation failed: ${message.slice(0, 200)}`, "AI_IMAGE_FAILED");
    }

    await aiBillingService.recordUsage({
      clientId: context.clientId,
      websiteId: context.websiteId,
      userId: context.userId,
      model: IMAGE_GENERATION_MODEL,
      scope,
      promptTokens: body.usage?.input_tokens ?? 0,
      completionTokens: body.usage?.output_tokens ?? 0,
      totalTokens: body.usage?.total_tokens ?? 0,
      durationMs: Date.now() - startedAt,
    });

    const b64 = body.data?.[0]?.b64_json;
    if (!b64) throw new AppError(502, "The AI returned no image.", "AI_IMAGE_FAILED");
    return Buffer.from(b64, "base64");
  };
}
