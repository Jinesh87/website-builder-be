import { IMAGE_GENERATION_MODEL } from "../../../common/constants/ai-models.js";
import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";

const ENDPOINT = "https://api.openai.com/v1/images/edits";
const REQUEST_TIMEOUT_MS = 240_000;
const DEFAULT_INSTRUCTIONS =
  "Create a fresh variation of this image. Keep the same subject, style, colors and overall composition, but vary the details.";
const STYLE_SUFFIX = "High quality, no added text, no lettering, no logos, no watermarks.";

export type VariationContext = {
  apiKey: string;
  clientId: string;
  websiteId: string | null;
  userId: string | null;
};

export type VariationRequest = {
  source: { buffer: Buffer; mimeType: string; fileName: string };
  count: number;
  instructions?: string;
  signal?: AbortSignal;
};

type ImageResponse = {
  data?: Array<{ b64_json?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  error?: { message?: string };
};

/** Asks OpenAI for `count` new images based on the source image and returns their JPEG bytes. */
export async function generateImageVariations(context: VariationContext, request: VariationRequest): Promise<Buffer[]> {
  const form = new FormData();
  form.set("model", IMAGE_GENERATION_MODEL);
  form.set("image", new Blob([new Uint8Array(request.source.buffer)], { type: request.source.mimeType }), request.source.fileName);
  form.set("prompt", `${request.instructions?.trim().slice(0, 1000) || DEFAULT_INSTRUCTIONS}\n${STYLE_SUFFIX}`);
  form.set("n", String(request.count));
  form.set("size", "auto");
  form.set("quality", "medium");
  form.set("output_format", "jpeg");
  form.set("output_compression", "85");

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${context.apiKey}` },
      body: form,
      signal: request.signal ? AbortSignal.any([request.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (request.signal?.aborted) throw new AppError(499, "Image generation was cancelled.", "CANCELLED");
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new AppError(502, timedOut ? "Generating the images took too long." : "Could not reach the AI provider.", "AI_IMAGE_FAILED");
  }

  const body = (await response.json().catch(() => ({}))) as ImageResponse;
  if (!response.ok) {
    const message = body.error?.message ?? `status ${response.status}`;
    if (response.status === 400 && /safety|policy/i.test(message)) {
      throw new AppError(400, "The AI provider's safety rules blocked this image. Try a different image or instructions.", "AI_IMAGE_BLOCKED");
    }
    throw new AppError(502, `Image generation failed: ${message.slice(0, 200)}`, "AI_IMAGE_FAILED");
  }

  await prisma.aiUsageLog
    .create({
      data: {
        clientId: context.clientId,
        websiteId: context.websiteId,
        userId: context.userId,
        model: IMAGE_GENERATION_MODEL,
        scope: "media_image_variations",
        promptTokens: body.usage?.input_tokens ?? 0,
        completionTokens: body.usage?.output_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
        durationMs: Date.now() - startedAt,
      },
    })
    .catch((error: unknown) => logger.warn({ err: error }, "Could not record AI usage"));

  const images = (body.data ?? []).flatMap((item) => (item.b64_json ? [Buffer.from(item.b64_json, "base64")] : []));
  if (images.length === 0) throw new AppError(502, "The AI returned no images.", "AI_IMAGE_FAILED");
  return images;
}
