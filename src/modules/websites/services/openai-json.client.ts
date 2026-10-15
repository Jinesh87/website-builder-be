import { isReasoningModel } from "../../../common/constants/ai-models.js";
import { AppError } from "../../../common/errors/AppError.js";
import { aiBillingService } from "../../wallet/services/ai-billing.service.js";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type JsonCompletionRequest = {
  messages: ChatMessage[];
  /** Strict JSON schema for structured output; omitted = free-form JSON object. */
  schema?: { name: string; schema: Record<string, unknown> };
  maxTokens: number;
  temperature: number;
  /** Stored on the usage log row, e.g. "site_plan". */
  scope: string;
  signal?: AbortSignal;
};

/** Returns the parsed JSON reply. Injected into the site generator so tests can fake it. */
export type JsonCompletion = (request: JsonCompletionRequest) => Promise<unknown>;

export type OpenAiContext = {
  apiKey: string;
  model: string;
  clientId: string;
  websiteId: string;
  userId: string | null;
};

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 150_000;

type ChatCompletionResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

class OpenAiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function post(apiKey: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<ChatCompletionResponse> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) throw new AppError(499, "AI generation was cancelled.", "CANCELLED");
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new OpenAiRequestError(0, timedOut ? "The AI provider took too long to respond." : "Could not reach the AI provider.");
  }
  if (!response.ok) {
    let message = `AI provider returned status ${response.status}`;
    try {
      const parsed = (await response.json()) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // Keep the generic message.
    }
    throw new OpenAiRequestError(response.status, message);
  }
  return (await response.json()) as ChatCompletionResponse;
}

function toAppError(error: OpenAiRequestError): AppError {
  if (error.status === 401) {
    return new AppError(502, "The OpenAI API key was rejected. Ask the administrator to check AI settings.", "AI_AUTH_FAILED");
  }
  if (error.status === 429) {
    return new AppError(503, "The AI provider is rate limited or out of quota. Try again later.", "AI_RATE_LIMITED");
  }
  return new AppError(502, `AI generation failed: ${error.message.slice(0, 200)}`, "AI_PROVIDER_ERROR");
}

/** A JsonCompletion bound to one OpenAI key/model that logs token usage per call. */
export function createOpenAiJsonCompletion(context: OpenAiContext): JsonCompletion {
  const reasoning = isReasoningModel(context.model);

  return async ({ messages, schema, maxTokens, temperature, scope, signal }) => {
    const base: Record<string, unknown> = {
      model: context.model,
      messages,
      // Reasoning tokens count against the completion budget.
      max_completion_tokens: reasoning ? maxTokens * 4 : maxTokens,
      ...(reasoning ? {} : { temperature }),
    };
    const jsonObject = { type: "json_object" };
    const startedAt = Date.now();

    let reply: ChatCompletionResponse;
    try {
      reply = await post(
        context.apiKey,
        {
          ...base,
          response_format: schema ? { type: "json_schema", json_schema: { ...schema, strict: true } } : jsonObject,
        },
        signal,
      );
    } catch (error) {
      if (!(error instanceof OpenAiRequestError)) throw error;
      // Older models don't support structured outputs; fall back to plain JSON mode.
      if (schema && error.status === 400 && /response_format|json_schema/i.test(error.message)) {
        try {
          reply = await post(context.apiKey, { ...base, response_format: jsonObject }, signal);
        } catch (fallbackError) {
          if (fallbackError instanceof OpenAiRequestError) throw toAppError(fallbackError);
          throw fallbackError;
        }
      } else {
        throw toAppError(error);
      }
    }

    const usage = reply.usage;
    await aiBillingService.recordUsage({
      clientId: context.clientId,
      websiteId: context.websiteId,
      userId: context.userId,
      model: reply.model ?? context.model,
      scope,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
      durationMs: Date.now() - startedAt,
    });

    const choice = reply.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      const reason = choice?.message?.refusal ? "The AI declined this request." : "The AI returned an empty reply.";
      throw new AppError(502, reason, "AI_EMPTY_REPLY");
    }
    if (choice.finish_reason === "length") {
      throw new AppError(502, "The AI reply was cut off. Try fewer pages or a shorter brief.", "AI_REPLY_TRUNCATED");
    }
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new AppError(502, "The AI returned invalid JSON.", "AI_INVALID_JSON");
    }
  };
}
