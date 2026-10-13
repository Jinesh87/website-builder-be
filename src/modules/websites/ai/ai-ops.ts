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
] as const satisfies readonly SectionType[];

export type AiCreatableType = (typeof AI_CREATABLE_TYPES)[number];

/** Operations the planner model may emit. Content-producing ops carry an instruction, not content. */
export type PlannedOp =
  | { op: "add"; sectionType: AiCreatableType; position: number | null; instruction: string }
  | { op: "update"; sectionId: string; instruction: string }
  | { op: "remove"; sectionIds: string[] }
  | { op: "move"; sectionId: string; toIndex: number }
  | { op: "replace_page"; sectionTypes: AiCreatableType[]; instruction: string }
  | { op: "clear" };

export type AiPlan = {
  intent: "chat" | "edit" | "clarify";
  reply: string;
  ops: PlannedOp[];
};

/** Planned ops after content generation; this is what gets applied to the canvas. */
export type CanvasOp =
  | { op: "add"; section: SectionEnvelope; position: number | null }
  | { op: "update"; section: SectionEnvelope }
  | { op: "remove"; sectionIds: string[] }
  | { op: "move"; sectionId: string; toIndex: number }
  | { op: "replace_page"; sections: SectionEnvelope[] }
  | { op: "clear" };

const MAX_OPS = 12;

function opVariant(op: string, properties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["op", ...Object.keys(properties)],
    properties: { op: { type: "string", enum: [op] }, ...properties },
  };
}

const creatableTypeSchema = { type: "string", enum: [...AI_CREATABLE_TYPES] };

/** OpenAI Structured Outputs schema (strict mode: every property required, no extras). */
export const AI_PLAN_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "canvas_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["intent", "reply", "ops"],
      properties: {
        intent: { type: "string", enum: ["chat", "edit", "clarify"] },
        reply: { type: "string" },
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
            ],
          },
        },
      },
    },
  },
} as const;

const instruction = Joi.string().trim().min(1).max(2000).required();
const sectionId = Joi.string().trim().min(1).max(128).required();
const creatableType = Joi.string().valid(...AI_CREATABLE_TYPES).required();

const opName = (name: PlannedOp["op"]) => Joi.string().valid(name).required();

const plannedOpSchema = Joi.alternatives().try(
  Joi.object({
    op: opName("add"),
    sectionType: creatableType,
    position: Joi.number().integer().min(0).allow(null).required(),
    instruction,
  }),
  Joi.object({ op: opName("update"), sectionId, instruction }),
  Joi.object({ op: opName("remove"), sectionIds: Joi.array().items(sectionId).min(1).max(60).required() }),
  Joi.object({ op: opName("move"), sectionId, toIndex: Joi.number().integer().min(0).required() }),
  Joi.object({
    op: opName("replace_page"),
    sectionTypes: Joi.array().items(creatableType).min(1).max(12).required(),
    instruction,
  }),
  Joi.object({ op: opName("clear") }),
);

const aiPlanSchema = Joi.object({
  intent: Joi.string().valid("chat", "edit", "clarify").required(),
  reply: Joi.string().allow("").max(3000).required(),
  ops: Joi.array().items(plannedOpSchema).max(MAX_OPS).required(),
});

/** Validates the planner's JSON and drops ops that reference sections not on the canvas. */
export function parsePlan(raw: unknown, sections: readonly SectionEnvelope[]): AiPlan {
  const { value, error } = aiPlanSchema.validate(raw, { stripUnknown: true });
  if (error) {
    throw new Error(`Invalid AI plan: ${error.message}`);
  }
  const plan = value as AiPlan;
  const ids = new Set(sections.map((s) => s.id));

  const ops = plan.ops.flatMap((op): PlannedOp[] => {
    switch (op.op) {
      case "update":
      case "move":
        return ids.has(op.sectionId) ? [op] : [];
      case "remove": {
        const sectionIds = [...new Set(op.sectionIds)].filter((id) => ids.has(id));
        return sectionIds.length > 0 ? [{ op: "remove", sectionIds }] : [];
      }
      default:
        return [op];
    }
  });

  return { ...plan, ops };
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

  const stubOps = ops.map((op, i): CanvasOp => {
    switch (op.op) {
      case "add":
        return { op: "add", position: op.position, section: stub(addIds[i] ?? `pending-${i}`, op.sectionType) };
      case "update":
        updating.add(op.sectionId);
        return { op: "remove", sectionIds: [] };
      case "replace_page":
        return { op: "replace_page", sections: op.sectionTypes.map((type, j) => stub(`pending-${i}-${j}`, type)) };
      default:
        return op;
    }
  });

  return applyOps(sections, stubOps).map((s) => ({
    id: s.id,
    type: s.type,
    status: pending.has(s.id) ? "pending" : updating.has(s.id) ? "updating" : "existing",
  }));
}
