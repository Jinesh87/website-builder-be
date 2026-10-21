import { randomUUID } from "node:crypto";
import Joi from "joi";
import { sectionSchema } from "../validators/site-content.validator.js";
import {
  cleanHref,
  isEditableSectionType,
  isGeneratedSectionType,
  resolveImageRef,
  type BriefImage,
  type CleanContext,
  type EditableSectionType,
  type SiteFacts,
} from "../services/site-generator.js";
import { applyOps, type CanvasOp, type SectionEnvelope } from "./ai-ops.js";
import { dataSpec, fieldAt, settingsSpec, type FieldSpec } from "./field-catalog.js";

import type { PageView } from "../types/website.types.js";
import type { ThemeSettings } from "../types/site-content.types.js";

/**
 * Field-level edits for AI-built pages. The AI names the exact fields it sets or removes on a section
 * (by path, checked against the field catalog), so every section type is edited the same way and
 * removing a field is as explicit as setting one. Results are validated with the real section schema;
 * problems come back as messages the AI can fix.
 */

type JsonRecord = Record<string, unknown>;

export type SectionDraft = { type: string; settings?: JsonRecord; data: JsonRecord };

export type AiClarification = {
  question: string;
  options: string[];
  allowCustomInput?: boolean;
};

export type CreatedPageEdit = {
  id: string;
  name: string;
  slug: string;
  pageType: string;
  showInNav: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sections: SectionEnvelope[];
};

export type UpdatedPageEdit = {
  pageId: string;
  name?: string;
  slug?: string;
  showInNav?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sections?: SectionEnvelope[];
};

export type NavigationPatchEdit = {
  headerMenu?: Array<{ label: string; href: string }>;
  headerCta?: { label?: string; href?: string };
  footerColumns?: Array<{ title?: string; links: Array<{ label: string; href: string }> }>;
};

export type ThemePatchEdit = Record<string, unknown>;

export type EditOp = (
  | { op: "update"; sectionId: string; set: JsonRecord; unset: string[] }
  | { op: "add"; position: number | null; section: SectionDraft }
  | { op: "remove"; sectionIds: string[] }
  | { op: "move"; sectionId: string; toIndex: number }
  | { op: "replace_page"; sections: SectionDraft[] }
  | {
      op: "create_page";
      page: {
        name: string;
        slug?: string;
        pageType?: string;
        showInNav?: boolean;
        seoTitle?: string;
        seoDescription?: string;
        sections: SectionDraft[];
      };
    }
  | {
      op: "update_page";
      pageIdOrSlug: string;
      name?: string;
      slug?: string;
      showInNav?: boolean;
      seoTitle?: string;
      seoDescription?: string;
      sections?: SectionDraft[];
    }
  | { op: "delete_page"; pageIdOrSlug: string }
  | {
      op: "update_navigation";
      headerMenu?: Array<{ label: string; href: string }>;
      headerCta?: { label?: string; href?: string };
      footerColumns?: Array<{ title?: string; links: Array<{ label: string; href: string }> }>;
    }
  | { op: "update_theme"; colors?: Record<string, string>; font?: string }
) & {
  /** The AI's one-line description of this operation, shown to the owner only once it's applied. */
  note?: string;
  /** Position in the AI's reply, so problems point at the operation the AI wrote. */
  index?: number;
};

export const IMAGE_SOURCES = ["library", "generate", "unspecified"] as const;
export type ImageSource = (typeof IMAGE_SOURCES)[number];

export type EditReply = {
  intent: "chat" | "edit" | "look" | "clarify";
  reply: string;
  clarification?: AiClarification | null;
  /** Sections the AI needs to see in full before it can answer. */
  look: string[];
  imageSource: ImageSource;
  /** The owner's own words that chose the image source; checked against what they wrote. */
  imageSourceQuote: string;
  ops: EditOp[];
  seo: { title: string; description: string } | null;
};

export const MAX_EDIT_OPS = 12;
export const MAX_PAGE_SECTIONS = 8;
const GENERATE_TOKEN = /^\s*GENERATE\s*:\s*(\S[\s\S]*)$/i;

const sectionId = Joi.string().trim().min(1).max(128).required();
const draft = Joi.object({
  type: Joi.string().required(),
  settings: Joi.object().unknown(true).optional(),
  data: Joi.object().unknown(true).required(),
});

const common = { op: Joi.string().required(), note: Joi.string().trim().allow("").max(300).default("") };
const navLink = Joi.object({
  label: Joi.string().trim().min(1).max(100).required(),
  href: Joi.string().trim().min(1).max(200).required(),
});

const OP_SCHEMAS: Record<EditOp["op"], Joi.ObjectSchema> = {
  update: Joi.object({
    ...common,
    sectionId,
    set: Joi.object().unknown(true).default({}),
    unset: Joi.array().items(Joi.string().trim()).default([]),
  }),
  add: Joi.object({ ...common, position: Joi.number().integer().min(0).allow(null).default(null), section: draft.required() }),
  remove: Joi.object({ ...common, sectionIds: Joi.array().items(sectionId).min(1).required() }),
  move: Joi.object({ ...common, sectionId, toIndex: Joi.number().integer().min(0).required() }),
  replace_page: Joi.object({ ...common, sections: Joi.array().items(draft).min(1).max(MAX_PAGE_SECTIONS).required() }),
  create_page: Joi.object({
    ...common,
    page: Joi.object({
      name: Joi.string().trim().min(1).max(120).required(),
      slug: Joi.string().trim().max(160).optional(),
      pageType: Joi.string().trim().optional(),
      showInNav: Joi.boolean().default(true),
      seoTitle: Joi.string().allow("").max(160).optional(),
      seoDescription: Joi.string().allow("").max(320).optional(),
      sections: Joi.array().items(draft).min(1).max(MAX_PAGE_SECTIONS).required(),
    }).required(),
  }),
  update_page: Joi.object({
    ...common,
    pageIdOrSlug: Joi.string().trim().min(1).max(128).required(),
    name: Joi.string().trim().min(1).max(120).optional(),
    slug: Joi.string().trim().max(160).optional(),
    showInNav: Joi.boolean().optional(),
    seoTitle: Joi.string().allow("").max(160).optional(),
    seoDescription: Joi.string().allow("").max(320).optional(),
    sections: Joi.array().items(draft).max(MAX_PAGE_SECTIONS).optional(),
  }),
  delete_page: Joi.object({
    ...common,
    pageIdOrSlug: Joi.string().trim().min(1).max(128).required(),
  }),
  update_navigation: Joi.object({
    ...common,
    headerMenu: Joi.array().items(navLink).max(12).optional(),
    headerCta: Joi.object({
      label: Joi.string().trim().max(100).optional(),
      href: Joi.string().trim().max(200).optional(),
    }).optional(),
    footerColumns: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().trim().max(100).optional(),
          links: Joi.array().items(navLink).max(10).required(),
        }),
      )
      .max(6)
      .optional(),
  }),
  update_theme: Joi.object({
    ...common,
    colors: Joi.object().unknown(true).optional(),
    font: Joi.string().trim().optional(),
  }),
};

const clarificationSchema = Joi.object({
  question: Joi.string().trim().min(1).max(500).required(),
  options: Joi.array().items(Joi.string().trim().min(1).max(200)).min(2).max(6).required(),
  allowCustomInput: Joi.boolean().default(true),
})
  .allow(null)
  .optional();

const replySchema = Joi.object({
  intent: Joi.string().valid("chat", "edit", "look", "clarify").optional(),
  reply: Joi.string().allow("").max(4000).default(""),
  clarification: clarificationSchema,
  look: Joi.array().items(Joi.string().trim().max(64)).max(4).default([]),
  imageSource: Joi.string().valid(...IMAGE_SOURCES).default("unspecified"),
  imageSourceQuote: Joi.string().allow("").max(500).default(""),
  ops: Joi.array().max(MAX_EDIT_OPS).default([]),
  seo: Joi.object({
    title: Joi.string().allow("").max(160).default(""),
    description: Joi.string().allow("").max(320).default(""),
  })
    .allow(null)
    .default(null),
});

const validationOptions = { stripUnknown: true, abortEarly: false } as const;

function messagesOf(error: Joi.ValidationError, label: string): string[] {
  return error.details.map((detail) => `${label}: ${detail.message}`);
}

export type ParsedEditReply = {
  reply: EditReply;
  errors: string[];
  /** Notes of operations that were malformed and left out. */
  droppedNotes: string[];
};

/** Validates the AI's reply envelope; invalid ops are left out and reported. */
export function parseEditReply(raw: unknown): ParsedEditReply {
  const { value, error } = replySchema.validate(raw, { ...validationOptions, convert: true });
  if (error) {
    return {
      reply: { intent: "chat", reply: "", look: [], imageSource: "unspecified", imageSourceQuote: "", ops: [], seo: null },
      errors: messagesOf(error, "reply"),
      droppedNotes: [],
    };
  }
  const errors: string[] = [];
  const droppedNotes: string[] = [];
  const ops: EditOp[] = [];
  (value.ops as unknown[]).forEach((rawOp, index) => {
    const name = isRecord(rawOp) ? rawOp.op : undefined;
    const schema = typeof name === "string" ? OP_SCHEMAS[name as EditOp["op"]] : undefined;
    const result = schema?.validate(rawOp, validationOptions);
    if (result && !result.error) {
      ops.push({ ...(result.value as EditOp), index });
      return;
    }
    errors.push(...(result?.error ? messagesOf(result.error, `ops[${index}]`) : [`ops[${index}]: op must be one of ${Object.keys(OP_SCHEMAS).join(", ")}`]));
    const note = isRecord(rawOp) && typeof rawOp.note === "string" ? rawOp.note.trim() : "";
    if (note) droppedNotes.push(note);
  });
  const intent = value.intent ?? (value.clarification ? "clarify" : ops.length > 0 || value.seo ? "edit" : "chat");
  return { reply: { ...value, intent, ops } as EditReply, errors, droppedNotes };
}

export type ImageNeed = { description: string; shape: NonNullable<FieldSpec["shape"]> };

export type EditEnv = {
  sections: readonly SectionEnvelope[];
  facts: SiteFacts;
  clean: CleanContext;
  /** Images already created for "GENERATE: <description>" values. */
  generated?: ReadonlyMap<string, BriefImage>;
  maxGeneratedImages: number;
  /** Other pages on the site, so cross-page edits can validate and update them. */
  pages?: readonly PageView[];
  theme?: ThemeSettings;
  currentPageId?: string;
  currentPageSlug?: string;
  headerMenu?: Array<{ label: string; href: string }>;
};

/** What happened to one of the AI's operations. */
export type EditOutcome = { op: EditOp; applied: boolean; problems: string[] };

export type CompiledEdits = {
  ops: CanvasOp[];
  after: SectionEnvelope[];
  /** Sections updated or added, in order. */
  changedIds: string[];
  rebuild: boolean;
  outcomes: EditOutcome[];
  errors: string[];
  /** New images the edits ask to generate. */
  imageNeeds: ImageNeed[];
  /** Some image value isn't on the page yet (library photo or generated). */
  newImages: boolean;
  /** Pages created by create_page ops. */
  createdPages: CreatedPageEdit[];
  /** Other pages updated by update_page ops. */
  updatedPages: UpdatedPageEdit[];
  /** Page ids deleted by delete_page ops. */
  deletedPageIds: string[];
  /** Navigation updates. */
  navigationPatch?: NavigationPatchEdit;
  /** Theme updates. */
  themePatch?: ThemePatchEdit;
};

type Resolver = {
  env: EditEnv;
  errors: string[];
  imageNeeds: ImageNeed[];
  newImages: boolean;
  pageJson: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveImage(value: unknown, spec: FieldSpec, path: string, resolver: Resolver): unknown {
  if (value === null) return null;
  const ref = typeof value === "string" ? value : isRecord(value) && typeof value.url === "string" ? value.url : "";
  const alt = isRecord(value) && typeof value.alt === "string" ? value.alt.trim().slice(0, 300) : "";
  const generate = GENERATE_TOKEN.exec(ref);
  if (generate) {
    const description = generate[1]!.trim();
    if (!resolver.imageNeeds.some((need) => need.description === description)) {
      resolver.imageNeeds.push({ description, shape: spec.shape ?? "landscape" });
    }
    if (resolver.imageNeeds.length > resolver.env.maxGeneratedImages) {
      resolver.errors.push(`${path}: at most ${resolver.env.maxGeneratedImages} new images per reply`);
    }
    resolver.newImages = true;
    const image = resolver.env.generated?.get(description);
    return { url: image?.url ?? "/generated-image-pending.jpg", alt: alt || image?.alt || "" };
  }
  const image = resolveImageRef(value, resolver.env.clean);
  if (!image) {
    resolver.errors.push(
      `${path}: ${JSON.stringify(ref || value)} is not an available image; use a library token like "IMAGE_1", "GENERATE: <description>", or remove the field with "unset"`,
    );
    return undefined;
  }
  if (!resolver.env.clean.keepUrls?.has(image.url)) resolver.newImages = true;
  return alt ? { ...image, alt } : image;
}

function factValue(spec: FieldSpec, facts: SiteFacts): string | undefined {
  const value = (facts as Record<string, unknown>)[spec.fact!];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Turns an AI value into a stored value for the field: images and links are resolved, locked fields
 * keep only values already on the page, and business facts can't be changed. `strict` reports
 * a mismatched fact instead of correcting it (when the AI set that field directly).
 */
function resolveValue(spec: FieldSpec, value: unknown, path: string, resolver: Resolver, strict: boolean): unknown {
  if (spec.locked && !resolver.pageJson.includes(JSON.stringify(value))) {
    if (strict) resolver.errors.push(`${path}: can't be set by the assistant; leave it out`);
    return undefined;
  }
  if (spec.fact) {
    const fact = factValue(spec, resolver.env.facts);
    if (strict && value !== fact) {
      resolver.errors.push(
        fact ? `${path}: must be the business's ${spec.fact} "${fact}"` : `${path}: no ${spec.fact} on file; leave it out`,
      );
    }
    return fact;
  }
  switch (spec.kind) {
    case "image":
      return resolveImage(value, spec, path, resolver);
    case "link":
      return isRecord(value) && typeof value.href === "string"
        ? { ...value, href: cleanHref(value.href, resolver.env.clean) }
        : value;
    case "text":
      if (typeof value !== "string") return value;
      return spec.name === "href" ? cleanHref(value, resolver.env.clean) : value.trim();
    case "list":
      if (!Array.isArray(value) || !spec.item) return value;
      return value
        .map((item, index) => resolveValue(spec.item!, item, `${path}.${index}`, resolver, false))
        .filter((item) => item !== undefined);
    case "object": {
      if (!isRecord(value)) return value;
      const result: JsonRecord = {};
      for (const [key, child] of Object.entries(value)) {
        const childSpec = spec.fields?.find((field) => field.name === key);
        if (!childSpec) {
          resolver.errors.push(`${path ? `${path}.` : ""}${key}: unknown field`);
          continue;
        }
        const resolved = resolveValue(childSpec, child, path ? `${path}.${key}` : key, resolver, false);
        if (resolved !== undefined) result[key] = resolved;
      }
      return result;
    }
    default:
      return value;
  }
}

/** Sets a value at a dotted path, creating missing objects; a list index equal to the length appends. */
function setPath(root: JsonRecord, segments: string[], value: unknown): string | null {
  let node: unknown = root;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    const last = i === segments.length - 1;
    if (Array.isArray(node)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index > node.length) return `list position ${segment} doesn't exist`;
      if (last) node[index] = value;
      else node = node[index] ??= /^\d+$/.test(segments[i + 1]!) ? [] : {};
    } else if (isRecord(node)) {
      if (last) node[segment] = value;
      else {
        if (!isRecord(node[segment]) && !Array.isArray(node[segment])) node[segment] = /^\d+$/.test(segments[i + 1]!) ? [] : {};
        node = node[segment];
      }
    } else {
      return "parent isn't an object or list";
    }
  }
  return null;
}

/** Removes the field (or list item) at a dotted path; missing paths are already removed. */
function unsetPath(root: JsonRecord, segments: string[]): void {
  let node: unknown = root;
  for (const segment of segments.slice(0, -1)) {
    node = Array.isArray(node) ? node[Number(segment)] : isRecord(node) ? node[segment] : undefined;
    if (node === undefined) return;
  }
  const last = segments.at(-1)!;
  if (Array.isArray(node)) node.splice(Number(last), 1);
  else if (isRecord(node)) delete node[last];
}

/** Later list items first, so removing one doesn't shift the next. */
function listIndexDescending(a: string, b: string): number {
  const index = (path: string) => Number(/\.(\d+)$/.exec(path)?.[1] ?? -1);
  return index(b) - index(a);
}

function sameValue(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : isRecord(value)
        ? Object.fromEntries(
            Object.keys(value)
              .filter((key) => value[key] !== undefined)
              .sort()
              .map((key) => [key, canonical(value[key])]),
          )
        : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function validateSection(section: SectionEnvelope, label: string, errors: string[]): SectionEnvelope | null {
  const { value, error } = sectionSchema.validate(section, validationOptions);
  if (error) {
    errors.push(...error.details.map((detail) => `${label} ${detail.path.join(".")}: ${detail.message}`));
    return null;
  }
  return value as SectionEnvelope;
}

export type SectionIssue = { path: string; related: string; message: string };

/** Content the schema accepts but that won't show, e.g. highlighted words that aren't in the heading. */
export function sectionIssues(section: Pick<SectionEnvelope, "type" | "data">): SectionIssue[] {
  if (!isEditableSectionType(section.type)) return [];
  return (dataSpec(section.type).fields ?? []).flatMap((field): SectionIssue[] => {
    const value = section.data[field.name];
    const whole = field.partOf ? section.data[field.partOf] : undefined;
    if (!field.partOf || typeof value !== "string" || !value.trim()) return [];
    if (typeof whole === "string" && whole.includes(value)) return [];
    return [
      {
        path: `data.${field.name}`,
        related: `data.${field.partOf}`,
        message: `data.${field.name} ${JSON.stringify(value)} isn't words from data.${field.partOf} ${JSON.stringify(whole ?? "")}, so it isn't shown`,
      },
    ];
  });
}

function editableSection(
  sections: readonly SectionEnvelope[],
  id: string,
  errors: string[],
  label: string,
  change: "update" | "remove" | "move",
) {
  const section = sections.find((candidate) => candidate.id === id);
  if (!section) errors.push(`${label}: no section "${id}" on this page`);
  else if (!isEditableSectionType(section.type)) errors.push(`${label}: the ${section.type} section can't be changed here`);
  else if (change !== "update" && !isGeneratedSectionType(section.type)) {
    errors.push(`${label}: the ${section.type} can only be updated, not ${change === "remove" ? "removed" : "moved"}`);
  } else return section as SectionEnvelope & { type: EditableSectionType };
  return null;
}

function updateSection(
  section: SectionEnvelope & { type: EditableSectionType },
  op: Extract<EditOp, { op: "update" }>,
  label: string,
  resolver: Resolver,
): SectionEnvelope | null {
  const next = structuredClone(section) as unknown as JsonRecord;
  const errorCount = resolver.errors.length;
  const unset = [...op.unset];
  for (const [path, value] of Object.entries(op.set)) {
    if (value === null) {
      unset.push(path);
      continue;
    }
    const spec = fieldAt(section.type, path);
    if (!spec) {
      resolver.errors.push(`${label} ${path}: not a field of a ${section.type} section`);
      continue;
    }
    const resolved = resolveValue(spec, value, path, resolver, true);
    if (resolved === undefined) continue;
    const problem = setPath(next, path.split("."), resolved);
    if (problem) resolver.errors.push(`${label} ${path}: ${problem}`);
  }
  for (const path of unset.sort(listIndexDescending)) {
    const spec = fieldAt(section.type, path);
    if (!spec) resolver.errors.push(`${label} ${path}: not a field of a ${section.type} section`);
    else if (spec.required) resolver.errors.push(`${label} ${path}: required, so it can't be removed; set a new value instead`);
    else unsetPath(next, path.split("."));
  }
  if (resolver.errors.length > errorCount) return null;
  const updated = validateSection(next as unknown as SectionEnvelope, label, resolver.errors);
  if (!updated) return null;
  const touched = (path: string) => [...Object.keys(op.set), ...unset].some((changed) => changed === path || changed.startsWith(`${path}.`));
  const issues = sectionIssues(updated).filter((issue) => touched(issue.path) || touched(issue.related));
  if (issues.length > 0) {
    resolver.errors.push(...issues.map((issue) => `${label} ${issue.message}`));
    return null;
  }
  if (sameValue(updated, validateSection(section, label, []) ?? section)) {
    resolver.errors.push(
      `${label}: changes nothing, section ${section.id} (${section.type}) already has these values, so it still looks the same to the owner. Use values that make the change they asked for (e.g. the values of the section they refer to; for a different image another library token or GENERATE). Reply with intent "chat" only if the page's values show the request is already done or it can't be done. Don't change anything the owner didn't ask for`,
    );
    return null;
  }
  return updated;
}

function createSection(sectionDraft: SectionDraft, label: string, resolver: Resolver): SectionEnvelope | null {
  if (!isGeneratedSectionType(sectionDraft.type)) {
    resolver.errors.push(`${label}: "${sectionDraft.type}" sections can't be created here`);
    return null;
  }
  const errorCount = resolver.errors.length;
  const data = resolveValue(dataSpec(sectionDraft.type), sectionDraft.data, `${label} data`, resolver, false);
  const settings = resolveValue(settingsSpec(), sectionDraft.settings ?? {}, `${label} settings`, resolver, false);
  if (resolver.errors.length > errorCount) return null;
  const created = validateSection(
    {
      id: randomUUID(),
      type: sectionDraft.type,
      hidden: false,
      settings: { background: "default", hideOnMobile: false, ...(settings as JsonRecord) },
      data: data as JsonRecord,
    },
    label,
    resolver.errors,
  );
  const issues = created ? sectionIssues(created) : [];
  if (issues.length > 0) {
    resolver.errors.push(...issues.map((issue) => `${label} ${issue.message}`));
    return null;
  }
  return created;
}

function toSlug(name: string): string {
  const clean = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `/${clean || "page"}`;
}

/** Checks the AI's edits against the page and the schema and turns the valid ones into canvas ops. */
export function compileEdits(ops: readonly EditOp[], env: EditEnv): CompiledEdits {
  const resolver: Resolver = { env, errors: [], imageNeeds: [], newImages: false, pageJson: JSON.stringify(env.sections) };
  let page = [...env.sections];
  const applied: CanvasOp[] = [];
  const changedIds: string[] = [];
  const createdPages: CreatedPageEdit[] = [];
  const updatedPages: UpdatedPageEdit[] = [];
  const deletedPageIds: string[] = [];
  let navigationPatch: NavigationPatchEdit | undefined = undefined;
  let themePatch: ThemePatchEdit | undefined = undefined;
  let rebuild = false;
  const apply = (op: CanvasOp) => {
    applied.push(op);
    page = applyOps(page, [op]);
  };

  const outcomes: EditOutcome[] = [];
  ops.forEach((op, at) => {
    const label = `ops[${op.index ?? at}]`;
    const appliedBefore = applied.length;
    const errorsBefore = resolver.errors.length;
    compileOne(op, label);
    outcomes.push({ op, applied: applied.length > appliedBefore, problems: resolver.errors.slice(errorsBefore) });
  });

  function compileOne(op: EditOp, label: string): void {
    switch (op.op) {
      case "update": {
        const section = editableSection(page, op.sectionId, resolver.errors, label, "update");
        const updated = section && updateSection(section, op, label, resolver);
        if (updated) {
          apply({ op: "update", section: updated });
          changedIds.push(updated.id);
        }
        break;
      }
      case "add": {
        const created = createSection(op.section, label, resolver);
        if (created) {
          apply({ op: "add", section: created, position: op.position });
          changedIds.push(created.id);
        }
        break;
      }
      case "remove": {
        const removable = op.sectionIds.filter((id) => editableSection(page, id, resolver.errors, label, "remove"));
        if (removable.length > 0) apply({ op: "remove", sectionIds: removable });
        break;
      }
      case "move":
        if (editableSection(page, op.sectionId, resolver.errors, label, "move")) apply({ op: "move", sectionId: op.sectionId, toIndex: op.toIndex });
        break;
      case "replace_page": {
        const body = op.sections.map((item, at) => createSection(item, `${label}.sections[${at}]`, resolver));
        if (body.every((item) => item !== null)) {
          const kept = (type: string) => page.filter((section) => section.type === type);
          apply({ op: "replace_page", sections: [...kept("header"), ...(body as SectionEnvelope[]), ...kept("footer")] });
          changedIds.push(...body.map((item) => item!.id));
          rebuild = true;
        }
        break;
      }
      case "create_page": {
        const pageDraft = op.page;
        const pageSections: SectionEnvelope[] = [];
        (pageDraft.sections ?? []).forEach((secDraft, idx) => {
          const created = createSection(secDraft, `${label}.page.sections[${idx}]`, resolver);
          if (created) pageSections.push(created);
        });
        if (pageSections.length > 0) {
          const rawSlug = pageDraft.slug?.trim() || toSlug(pageDraft.name);
          const slug = rawSlug.startsWith("/") ? rawSlug : `/${rawSlug}`;

          const normalizeSlug = (s: string) => s.trim().toLowerCase().replace(/^\/+/, "");
          const isCurrentActivePage =
            (Boolean(env.currentPageSlug) && normalizeSlug(slug) === normalizeSlug(env.currentPageSlug!)) ||
            (Boolean(env.currentPageSlug) && normalizeSlug(pageDraft.name) === normalizeSlug(env.currentPageSlug!));

          // If the user is currently on the matching page or on the Home page (or active page has no body sections)
          // and the AI tried to create a redundant "Landing Page" (/landing-page) or "Home" (/home),
          // redirect it to populate the active page directly so the user sees the content immediately on their canvas!
          const isCurrentHome = env.currentPageSlug === "/" || !env.currentPageSlug;
          const currentHasBody = page.some((s) => s.type !== "header" && s.type !== "footer");
          const isLandingOrHomeRequest =
            slug === "/landing-page" ||
            slug === "/landing" ||
            slug === "/home" ||
            pageDraft.name.toLowerCase() === "landing page" ||
            pageDraft.name.toLowerCase() === "home";

          if (isCurrentActivePage || (isCurrentHome && !currentHasBody && isLandingOrHomeRequest)) {
            const kept = (type: string) => page.filter((section) => section.type === type);
            apply({ op: "replace_page", sections: [...kept("header"), ...(pageSections as SectionEnvelope[]), ...kept("footer")] });
            changedIds.push(...pageSections.map((item) => item.id));
            rebuild = true;

            if (pageDraft.showInNav !== false) {
              const currentMenu =
                navigationPatch?.headerMenu ??
                env.headerMenu ??
                env.pages?.filter((p) => p.showInNav).map((p) => ({ label: p.name, href: p.slug })) ??
                [];
              const matchingIdx = currentMenu.findIndex(
                (m) => normalizeSlug(m.label) === normalizeSlug(pageDraft.name) || normalizeSlug(m.href) === normalizeSlug(slug),
              );
              if (matchingIdx >= 0 && currentMenu[matchingIdx]?.href !== slug) {
                const nextMenu = [...currentMenu];
                nextMenu[matchingIdx] = { ...nextMenu[matchingIdx]!, href: slug };
                navigationPatch = { ...(navigationPatch ?? {}), headerMenu: nextMenu };
              } else if (matchingIdx < 0) {
                navigationPatch = {
                  ...(navigationPatch ?? {}),
                  headerMenu: [...currentMenu, { label: pageDraft.name.trim(), href: slug }],
                };
              }
            }
            break;
          }

          // If the slug or name matches an existing page that is not active, update that page instead of duplicating it
          const existingPage = env.pages?.find(
            (p) => normalizeSlug(p.slug) === normalizeSlug(slug) || normalizeSlug(p.name) === normalizeSlug(pageDraft.name),
          );
          if (existingPage) {
            updatedPages.push({
              pageId: existingPage.id,
              name: pageDraft.name.trim(),
              slug,
              showInNav: pageDraft.showInNav ?? existingPage.showInNav,
              seoTitle: pageDraft.seoTitle ?? null,
              seoDescription: pageDraft.seoDescription ?? null,
              sections: pageSections,
            });
            break;
          }

          const newPageId = randomUUID();
          createdPages.push({
            id: newPageId,
            name: pageDraft.name.trim(),
            slug,
            pageType: pageDraft.pageType ?? "CUSTOM",
            showInNav: pageDraft.showInNav ?? true,
            seoTitle: pageDraft.seoTitle ?? null,
            seoDescription: pageDraft.seoDescription ?? null,
            sections: pageSections,
          });
          if (pageDraft.showInNav !== false) {
            const currentMenu =
              navigationPatch?.headerMenu ??
              env.headerMenu ??
              env.pages?.filter((p) => p.showInNav).map((p) => ({ label: p.name, href: p.slug })) ??
              [];
            if (!currentMenu.some((m) => m.href === slug)) {
              navigationPatch = {
                ...(navigationPatch ?? {}),
                headerMenu: [...currentMenu, { label: pageDraft.name.trim(), href: slug }],
              };
            }
          }
        }
        break;
      }
      case "update_page": {
        const targetPage = env.pages?.find(
          (p) =>
            p.id === op.pageIdOrSlug ||
            p.slug === op.pageIdOrSlug ||
            p.name.toLowerCase() === op.pageIdOrSlug.toLowerCase(),
        );
        if (targetPage) {
          const updatedSections: SectionEnvelope[] = [];
          if (op.sections && op.sections.length > 0) {
            op.sections.forEach((secDraft, idx) => {
              const created = createSection(secDraft, `${label}.sections[${idx}]`, resolver);
              if (created) updatedSections.push(created);
            });
          }
          updatedPages.push({
            pageId: targetPage.id,
            name: op.name,
            slug: op.slug ? (op.slug.startsWith("/") ? op.slug : `/${op.slug}`) : undefined,
            showInNav: op.showInNav,
            seoTitle: op.seoTitle,
            seoDescription: op.seoDescription,
            sections: updatedSections.length > 0 ? updatedSections : undefined,
          });
        }
        break;
      }
      case "delete_page": {
        const targetPage = env.pages?.find(
          (p) =>
            p.id === op.pageIdOrSlug ||
            p.slug === op.pageIdOrSlug ||
            p.name.toLowerCase() === op.pageIdOrSlug.toLowerCase(),
        );
        if (targetPage && targetPage.slug !== "/") {
          deletedPageIds.push(targetPage.id);
        }
        break;
      }
      case "update_navigation": {
        navigationPatch = {
          ...(navigationPatch ?? {}),
          ...(op.headerMenu ? { headerMenu: op.headerMenu } : {}),
          ...(op.headerCta ? { headerCta: op.headerCta } : {}),
          ...(op.footerColumns ? { footerColumns: op.footerColumns } : {}),
        };
        break;
      }
      case "update_theme": {
        themePatch = {
          ...(themePatch ?? {}),
          ...(op.colors ? { colors: op.colors } : {}),
          ...(op.font ? { font: op.font } : {}),
        };
        break;
      }
    }
  }

  return {
    ops: applied,
    after: page,
    changedIds: [...new Set(changedIds)],
    rebuild,
    outcomes,
    errors: resolver.errors,
    imageNeeds: resolver.imageNeeds,
    newImages: resolver.newImages,
    createdPages,
    updatedPages,
    deletedPageIds: [...new Set(deletedPageIds)],
    navigationPatch,
    themePatch,
  };
}
