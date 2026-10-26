import Joi from "joi";
import type { SectionType } from "../types/site-content.types.js";

export type SectionEnvelope = {
  id: string;
  type: string;
  hidden: boolean;
  settings: Record<string, unknown>;
  data: Record<string, unknown>;
};

/** Section types the AI can generate from scratch (have schema guidance in the content prompts). */
export const AI_CREATABLE_TYPES = [
  "header",
  "footer",
  "hero",
  "features",
  "services",
  "stats",
  "pricing",
  "testimonials",
  "team",
  "marquee",
  "carousel",
  "faq",
  "cta",
  "contact",
  "custom",
  "products",
  "product_detail",
] as const satisfies readonly SectionType[];

export type AiCreatableType = (typeof AI_CREATABLE_TYPES)[number];

/** Operations the planner model may emit. Content-producing ops carry an instruction, not content. */
export type PlannedOp =
  | { op: "add"; sectionType: AiCreatableType; position: number | null; instruction: string }
  | { op: "update"; sectionId: string; instruction: string }
  | { op: "remove"; sectionIds: string[] }
  | { op: "move"; sectionId: string; toIndex: number }
  | { op: "replace_page"; sectionTypes: AiCreatableType[]; instruction: string }
  | { op: "clear" }
  | {
      op: "create_page";
      name: string;
      slug?: string | null;
      sectionTypes: AiCreatableType[];
      instruction: string;
      showInNav?: boolean;
    }
  | {
      op: "update_navigation";
      instruction: string;
      /** The complete header menu after the change, in order; null leaves the menu as it is. */
      headerMenu: PlannedLink[] | null;
      /** The header call-to-action button after the change; null leaves it as it is. */
      headerCta: PlannedLink | null;
    };

export type PlannedLink = { label: string; href: string };

export type AiPlan = {
  intent: "chat" | "edit" | "clarify";
  reply: string;
  clarification?: {
    question: string;
    options: string[];
    allowCustomInput: boolean;
  } | null;
  ops: PlannedOp[];
  /** Names of requested pages beyond MAX_PAGES_PER_REQUEST, left for a follow-up request. */
  deferredPages?: string[];
};

/** Planned ops after content generation; this is what gets applied to the canvas. */
export type CanvasOp =
  | { op: "add"; section: SectionEnvelope; position: number | null }
  | { op: "update"; section: SectionEnvelope }
  | { op: "remove"; sectionIds: string[] }
  | { op: "move"; sectionId: string; toIndex: number }
  | { op: "replace_page"; sections: SectionEnvelope[] }
  | { op: "clear" };

const MAX_OPS = 20;
/** Sections one planned page may have; extra types are trimmed instead of rejecting the plan. */
export const MAX_PLAN_SECTIONS = 16;
/** New pages built per request; the rest are deferred to a follow-up request. */
export const MAX_PAGES_PER_REQUEST = 8;
const MAX_INSTRUCTION_CHARS = 2000;
const MAX_REPLY_CHARS = 3000;

function opVariant(op: string, properties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["op", ...Object.keys(properties)],
    properties: { op: { type: "string", enum: [op] }, ...properties },
  };
}

const creatableTypeSchema = { type: "string", enum: [...AI_CREATABLE_TYPES] };

const linkSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label", "href"],
  properties: { label: { type: "string" }, href: { type: "string" } },
};

/** OpenAI Structured Outputs schema (strict mode: every property required, no extras). */
export const AI_PLAN_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "canvas_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["intent", "reply", "clarification", "ops"],
      properties: {
        intent: { type: "string", enum: ["chat", "edit", "clarify"] },
        reply: { type: "string" },
        clarification: {
          anyOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["question", "options", "allowCustomInput"],
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                allowCustomInput: { type: "boolean" },
              },
            },
            { type: "null" },
          ],
        },
        ops: {
          type: "array",
          items: {
            anyOf: [
              opVariant("add", {
                sectionType: creatableTypeSchema,
                position: { type: ["integer", "null"] },
                instruction: { type: "string" },
              }),
              opVariant("update", { sectionId: { type: "string" }, instruction: { type: "string" } }),
              opVariant("remove", { sectionIds: { type: "array", items: { type: "string" } } }),
              opVariant("move", { sectionId: { type: "string" }, toIndex: { type: "integer" } }),
              opVariant("replace_page", {
                sectionTypes: { type: "array", items: creatableTypeSchema },
                instruction: { type: "string" },
              }),
              opVariant("clear", {}),
              opVariant("create_page", {
                name: { type: "string" },
                slug: { type: ["string", "null"] },
                sectionTypes: { type: "array", items: creatableTypeSchema },
                instruction: { type: "string" },
                showInNav: { type: "boolean" },
              }),
              opVariant("update_navigation", {
                instruction: { type: "string" },
                headerMenu: { anyOf: [{ type: "array", items: linkSchema }, { type: "null" }] },
                headerCta: { anyOf: [linkSchema, { type: "null" }] },
              }),
            ],
          },
        },
      },
    },
  },
} as const;

const instruction = Joi.string().trim().min(1).max(MAX_INSTRUCTION_CHARS).required();
const sectionId = Joi.string().trim().min(1).max(128).required();
const creatableType = Joi.string().valid(...AI_CREATABLE_TYPES).required();
const sectionTypes = Joi.array().items(creatableType).min(1).max(MAX_PLAN_SECTIONS).required();
const plannedLink = Joi.object({
  label: Joi.string().trim().min(1).max(60).required(),
  href: Joi.string().trim().allow("").max(500).required(),
});

const opSchemas: Record<PlannedOp["op"], Joi.ObjectSchema> = {
  add: Joi.object({
    op: Joi.string().required(),
    sectionType: creatableType,
    position: Joi.number().integer().min(0).allow(null).required(),
    instruction,
  }),
  update: Joi.object({ op: Joi.string().required(), sectionId, instruction }),
  remove: Joi.object({
    op: Joi.string().required(),
    sectionIds: Joi.array().items(sectionId).min(1).max(60).required(),
  }),
  move: Joi.object({ op: Joi.string().required(), sectionId, toIndex: Joi.number().integer().min(0).required() }),
  replace_page: Joi.object({ op: Joi.string().required(), sectionTypes, instruction }),
  clear: Joi.object({ op: Joi.string().required() }),
  create_page: Joi.object({
    op: Joi.string().required(),
    name: Joi.string().trim().min(1).max(120).required(),
    slug: Joi.string().trim().max(160).allow(null).optional(),
    sectionTypes,
    instruction,
    showInNav: Joi.boolean().default(true),
  }),
  update_navigation: Joi.object({
    op: Joi.string().required(),
    instruction,
    headerMenu: Joi.array().items(plannedLink).max(24).allow(null).default(null),
    headerCta: plannedLink.allow(null).default(null),
  }),
};

const planHeadSchema = Joi.object({
  intent: Joi.string().valid("chat", "edit", "clarify").required(),
  reply: Joi.string().allow("").max(MAX_REPLY_CHARS).required(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clip(value: unknown, max: number): unknown {
  return typeof value === "string" ? value.trim().slice(0, max) : value;
}

function isCreatableType(value: unknown): value is AiCreatableType {
  return typeof value === "string" && (AI_CREATABLE_TYPES as readonly string[]).includes(value);
}

/** Fixes recoverable model slips (overlong text, too many sections, negative indexes) before validation. */
function normalizeOp(raw: Record<string, unknown>): Record<string, unknown> {
  const op: Record<string, unknown> = { ...raw };
  if ("instruction" in op) op.instruction = clip(op.instruction, MAX_INSTRUCTION_CHARS);
  if ("name" in op) op.name = clip(op.name, 120);
  if (typeof op.slug === "string") op.slug = op.slug.trim().slice(0, 160) || null;
  if (Array.isArray(op.sectionTypes)) {
    op.sectionTypes = op.sectionTypes.filter(isCreatableType).slice(0, MAX_PLAN_SECTIONS);
  }
  for (const key of ["position", "toIndex"] as const) {
    const value = op[key];
    if (typeof value === "number" && Number.isFinite(value)) op[key] = Math.max(0, Math.trunc(value));
  }
  if (Array.isArray(op.headerMenu)) {
    op.headerMenu = op.headerMenu.filter(isRecord).map(clipLink);
  }
  if (isRecord(op.headerCta)) op.headerCta = clipLink(op.headerCta);
  return op;
}

function clipLink(link: Record<string, unknown>): Record<string, unknown> {
  return { ...link, label: clip(link.label, 60), href: clip(link.href, 500) };
}

function parseOp(raw: unknown): { op: PlannedOp } | { error: string } {
  if (!isRecord(raw) || typeof raw.op !== "string" || !(raw.op in opSchemas)) {
    return { error: `unknown operation ${JSON.stringify(isRecord(raw) ? raw.op : raw)}` };
  }
  const name = raw.op as PlannedOp["op"];
  const { value, error } = opSchemas[name].validate(normalizeOp(raw), { stripUnknown: true });
  return error ? { error: `${name}: ${error.message}` } : { op: value as PlannedOp };
}

function parseClarification(raw: unknown): AiPlan["clarification"] {
  if (!isRecord(raw)) return null;
  const question = typeof raw.question === "string" ? raw.question.trim().slice(0, 500) : "";
  const options = Array.isArray(raw.options)
    ? [
        ...new Set(
          raw.options
            .filter((option): option is string => typeof option === "string")
            .map((option) => option.trim().slice(0, 200))
            .filter(Boolean),
        ),
      ].slice(0, 6)
    : [];
  if (!question || options.length < 2) return null;
  return { question, options, allowCustomInput: raw.allowCustomInput !== false };
}

/**
 * Validates the planner's JSON. Recoverable slips are repaired, invalid single ops are dropped, ops that
 * reference sections not on the canvas are dropped, and pages beyond the per-request cap are deferred.
 * Throws only when nothing usable remains, so the caller can ask the model to correct itself.
 */
export function parsePlan(raw: unknown, sections: readonly SectionEnvelope[]): AiPlan {
  if (!isRecord(raw)) throw new Error("Invalid AI plan: expected a JSON object");

  const { value: head, error } = planHeadSchema.validate({
    intent: raw.intent,
    reply: clip(typeof raw.reply === "string" ? raw.reply : "", MAX_REPLY_CHARS),
  });
  if (error) throw new Error(`Invalid AI plan: ${error.message}`);

  let intent = head.intent as AiPlan["intent"];
  let reply = head.reply as string;
  const clarification = intent === "clarify" ? parseClarification(raw.clarification) : null;
  if (intent === "clarify" && !clarification) {
    intent = "chat";
    const question = isRecord(raw.clarification) ? clip(raw.clarification.question, 500) : "";
    reply = reply || (typeof question === "string" ? question : "");
  }

  const rawOps = Array.isArray(raw.ops) ? raw.ops : [];
  const errors: string[] = [];
  const parsedOps = rawOps.flatMap((candidate): PlannedOp[] => {
    const result = parseOp(candidate);
    if ("error" in result) {
      errors.push(result.error);
      return [];
    }
    return [result.op];
  });
  if (intent === "edit" && rawOps.length > 0 && parsedOps.length === 0) {
    throw new Error(`Invalid AI plan: ${errors.join("; ")}`);
  }

  const ids = new Set(sections.map((s) => s.id));
  const deferredPages: string[] = [];
  let pageCount = 0;

  const ops = parsedOps
    .flatMap((op): PlannedOp[] => {
      switch (op.op) {
        case "update":
        case "move":
          return ids.has(op.sectionId) ? [op] : [];
        case "remove": {
          const sectionIds = [...new Set(op.sectionIds)].filter((id) => ids.has(id));
          return sectionIds.length > 0 ? [{ op: "remove", sectionIds }] : [];
        }
        case "create_page":
          pageCount += 1;
          if (pageCount > MAX_PAGES_PER_REQUEST) {
            deferredPages.push(op.name);
            return [];
          }
          return [op];
        default:
          return [op];
      }
    })
    .slice(0, MAX_OPS);

  return {
    intent,
    reply,
    clarification,
    ops: intent === "edit" ? ops : [],
    ...(deferredPages.length > 0 ? { deferredPages } : {}),
  };
}

const SINGLETON_TYPES = new Set(["header", "footer"]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function defaultInsertIndex(sections: readonly SectionEnvelope[], type: string): number {
  if (type === "header") return 0;
  if (type === "footer") return sections.length;
  const footerIdx = sections.findIndex((s) => s.type === "footer");
  return footerIdx === -1 ? sections.length : footerIdx;
}

/** Pure, deterministic reducer: applies ops in order and returns the new section list. */
export function applyOps(sections: readonly SectionEnvelope[], ops: readonly CanvasOp[]): SectionEnvelope[] {
  let next = [...sections];

  for (const op of ops) {
    switch (op.op) {
      case "clear":
        next = [];
        break;
      case "replace_page":
        next = [...op.sections];
        break;
      case "remove": {
        const ids = new Set(op.sectionIds);
        next = next.filter((s) => !ids.has(s.id));
        break;
      }
      case "update":
        next = next.map((s) => (s.id === op.section.id ? op.section : s));
        break;
      case "move": {
        const from = next.findIndex((s) => s.id === op.sectionId);
        if (from === -1) break;
        const [moved] = next.splice(from, 1);
        next.splice(clamp(op.toIndex, 0, next.length), 0, moved!);
        break;
      }
      case "add": {
        // A page has at most one header and one footer; adding another replaces it in place.
        if (SINGLETON_TYPES.has(op.section.type)) {
          const existing = next.findIndex((s) => s.type === op.section.type);
          if (existing !== -1) {
            next[existing] = op.section;
            break;
          }
        }
        const index =
          op.position === null
            ? defaultInsertIndex(next, op.section.type)
            : clamp(op.position, 0, next.length);
        next.splice(index, 0, op.section);
        break;
      }
    }
  }

  return next;
}

export type LayoutSlotStatus = "existing" | "pending" | "updating";

/** One section position in the planned layout, sent before content generation finishes. */
export type LayoutSlot = { id: string; type: string; status: LayoutSlotStatus };

/**
 * Resolves where every section will land once the plan is applied, without generated content.
 * `addIds[i]` is the id reserved for `ops[i]` when it is an add, so the final section keeps it.
 */
export function previewLayout(
  sections: readonly SectionEnvelope[],
  ops: readonly PlannedOp[],
  addIds: readonly (string | undefined)[],
): LayoutSlot[] {
  const pending = new Set<string>();
  const updating = new Set<string>();
  const stub = (id: string, type: string): SectionEnvelope => {
    pending.add(id);
    return { id, type, hidden: false, settings: {}, data: {} };
  };

  const stubOps = ops.flatMap((op, i): CanvasOp[] => {
    switch (op.op) {
      case "add":
        return [{ op: "add", position: op.position, section: stub(addIds[i] ?? `pending-${i}`, op.sectionType) }];
      case "update":
        updating.add(op.sectionId);
        return [{ op: "remove", sectionIds: [] }];
      case "replace_page":
        return [{ op: "replace_page", sections: op.sectionTypes.map((type, j) => stub(`pending-${i}-${j}`, type)) }];
      case "remove":
      case "move":
      case "clear":
        return [op];
      case "create_page":
      case "update_navigation":
        return [];
    }
  });

  return applyOps(sections, stubOps).map((s) => ({
    id: s.id,
    type: s.type,
    status: pending.has(s.id) ? "pending" : updating.has(s.id) ? "updating" : "existing",
  }));
}
