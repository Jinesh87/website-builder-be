import type { ValidationErrorItem } from "joi";
import { logger } from "../../../config/logger.js";
import { sectionSchema } from "../validators/site-content.validator.js";
import type { SectionEnvelope } from "./ai-ops.js";

/** Same options the draft-save endpoint validates with, so a repaired section always saves. */
const VALIDATION_OPTIONS = { stripUnknown: true, abortEarly: false } as const;
const MAX_ROUNDS = 4;
const REMOVED = Symbol("removed");

type Node = Record<string | number, unknown>;

function isNode(value: unknown): value is Node {
  return value !== null && typeof value === "object";
}

/** Position of the deepest list index in a path, or -1 when the path crosses no list. */
function lastListIndex(path: readonly (string | number)[]): number {
  for (let index = path.length - 1; index >= 0; index--) {
    if (typeof path[index] === "number") return index;
  }
  return -1;
}

/**
 * Drops the part of `root` an error points at: an invalid optional value is deleted, and a list item
 * missing a required field is removed from its list. Returns false when nothing safe can be dropped
 * (e.g. a required top-level field is wrong), so the caller gives up instead of guessing.
 */
function dropInvalid(root: Node, detail: ValidationErrorItem): boolean {
  const path = detail.path;
  if (path.length < 2 || (path[0] !== "data" && path[0] !== "settings")) return false;

  const target = detail.type === "any.required" ? path.slice(0, lastListIndex(path) + 1) : path;
  if (target.length < 2) return false;

  let parent: unknown = root;
  for (const key of target.slice(0, -1)) {
    if (!isNode(parent)) return false;
    parent = parent[key];
    // Another error already removed this list item.
    if (parent === REMOVED) return true;
  }
  const last = target.at(-1)!;
  if (!isNode(parent)) return false;
  if (parent[last] === REMOVED) return true;
  if (!(last in parent)) return false;

  if (Array.isArray(parent)) parent[last as number] = REMOVED;
  else delete parent[last];
  return true;
}

function withoutRemoved(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((item) => item !== REMOVED).map(withoutRemoved);
  if (isNode(value)) {
    for (const key of Object.keys(value)) value[key] = withoutRemoved(value[key]);
  }
  return value;
}

function describe(detail: ValidationErrorItem): string {
  return `${detail.path.join(".")}: ${detail.message}`;
}

/**
 * Makes AI output safe to put on the canvas: the result passes the same `sectionSchema` as saving a
 * draft, so the editor never shows content that would then fail to save. Invalid optional values the
 * model made up (e.g. an unknown icon colour) are dropped and fall back to their defaults.
 * Returns null when the section can't be repaired without inventing content.
 */
export function repairSection(section: SectionEnvelope, context: string): SectionEnvelope | null {
  let candidate = structuredClone(section) as unknown as Node;
  const dropped: string[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { value, error } = sectionSchema.validate(candidate, VALIDATION_OPTIONS);
    if (!error) {
      if (dropped.length > 0) {
        logger.warn({ context, type: section.type, dropped }, "Dropped invalid fields from AI section");
      }
      return value as SectionEnvelope;
    }

    const changed = error.details.filter((detail) => dropInvalid(candidate, detail));
    if (changed.length < error.details.length) {
      const unrepairable = error.details.filter((detail) => !changed.includes(detail)).map(describe);
      logger.warn({ context, type: section.type, problems: unrepairable }, "AI section failed validation");
      return null;
    }
    dropped.push(...changed.map(describe));
    candidate = withoutRemoved(candidate) as Node;
  }

  logger.warn({ context, type: section.type, dropped }, "AI section still invalid after repair");
  return null;
}
