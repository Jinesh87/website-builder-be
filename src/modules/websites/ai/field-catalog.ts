import type Joi from "joi";
import type { SectionType } from "../types/site-content.types.js";
import {
  SECTION_DATA_SCHEMAS,
  sectionSettingsSchema,
  type FieldMeta,
} from "../validators/site-content.validator.js";

/**
 * Editable fields of every section type, derived from the content validators, so AI prompts,
 * edit validation and image handling stay in step with the real schema for every component.
 */

export type FieldKind = "text" | "enum" | "number" | "boolean" | "image" | "link" | "object" | "list" | "other";

export type FieldSpec = {
  name: string;
  kind: FieldKind;
  required: boolean;
  description?: string;
  values?: Array<string | number>;
  min?: number;
  max?: number;
  /** Object fields. */
  fields?: FieldSpec[];
  /** List item. */
  item?: FieldSpec;
  /** The AI may not set this field. */
  locked: boolean;
  /** The value must equal this business fact. */
  fact?: string;
  /** Aspect of new images for an image field. */
  shape?: "landscape" | "square" | "portrait";
  /** The value must be words taken from this sibling field. */
  partOf?: string;
};

type Description = {
  type: string;
  flags?: { presence?: string; only?: boolean; description?: string };
  allow?: unknown[];
  rules?: Array<{ name: string; args?: { limit?: number } }>;
  keys?: Record<string, Description>;
  items?: Description[];
  metas?: FieldMeta[];
};

function limit(description: Description, rule: string): number | undefined {
  // Rich text fields limit visible characters with `richMax`; to the AI it is the same as `max`.
  return description.rules?.find((candidate) => candidate.name === rule || (rule === "max" && candidate.name === "richMax"))?.args?.limit;
}

function toSpec(name: string, description: Description): FieldSpec {
  const meta: FieldMeta = Object.assign({}, ...(description.metas ?? []));
  const base = {
    name,
    required: description.flags?.presence === "required",
    description: description.flags?.description,
    locked: meta.ai === "locked",
    fact: meta.fact,
    partOf: meta.partOf,
  };
  if (meta.kind === "image") return { ...base, kind: "image", shape: meta.shape ?? "landscape" };
  if (meta.kind === "link") return { ...base, kind: "link" };

  const values = description.flags?.only
    ? (description.allow ?? []).filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    : undefined;
  switch (description.type) {
    case "string":
      return values
        ? { ...base, kind: "enum", values: values.filter((value) => value !== "") }
        : { ...base, kind: "text", max: limit(description, "max") };
    case "number":
      return values
        ? { ...base, kind: "enum", values }
        : { ...base, kind: "number", min: limit(description, "min"), max: limit(description, "max") };
    case "boolean":
      return { ...base, kind: "boolean" };
    case "object":
      return {
        ...base,
        kind: "object",
        fields: Object.entries(description.keys ?? {}).map(([key, child]) => toSpec(key, child)),
      };
    case "array": {
      const [item] = description.items ?? [];
      return { ...base, kind: "list", max: limit(description, "max"), item: item ? toSpec("item", item) : undefined };
    }
    default:
      return { ...base, kind: "other" };
  }
}

function describeSchema(schema: Joi.ObjectSchema): FieldSpec {
  return toSpec("", schema.describe() as Description);
}

const dataSpecs = new Map<string, FieldSpec>();
let cachedSettings: FieldSpec | undefined;

/** The `data` object of a section type. */
export function dataSpec(type: SectionType): FieldSpec {
  let spec = dataSpecs.get(type);
  if (!spec) {
    spec = describeSchema(SECTION_DATA_SCHEMAS[type]);
    dataSpecs.set(type, spec);
  }
  return spec;
}

/** The `settings` object shared by every section. */
export function settingsSpec(): FieldSpec {
  cachedSettings ??= describeSchema(sectionSettingsSchema);
  return cachedSettings;
}

/**
 * Field at a section path such as "data.items.2.title" or "settings.customColors.primary";
 * numeric segments index into lists. Undefined when the path doesn't exist in the schema.
 */
export function fieldAt(type: SectionType, path: string): FieldSpec | undefined {
  const [root, ...rest] = path.split(".");
  let spec: FieldSpec | undefined = root === "data" ? dataSpec(type) : root === "settings" ? settingsSpec() : undefined;
  for (const segment of rest) {
    if (!spec) return undefined;
    if (spec.kind === "list") {
      spec = /^\d+$/.test(segment) ? spec.item : undefined;
    } else if (spec.kind === "object") {
      spec = spec.fields?.find((field) => field.name === segment);
    } else {
      return undefined;
    }
  }
  return rest.length > 0 ? spec : undefined;
}

function typeLabel(spec: FieldSpec): string {
  switch (spec.kind) {
    case "text":
      return spec.max ? `text<=${spec.max}` : "text";
    case "enum":
      return spec.values!.map((value) => (typeof value === "string" ? `"${value}"` : value)).join("|");
    case "number":
      return spec.min !== undefined && spec.max !== undefined ? `number ${spec.min}-${spec.max}` : "number";
    case "boolean":
      return "boolean";
    case "image":
      return "IMAGE";
    case "link":
      return "LINK";
    case "list":
      return `list${spec.max ? `<=${spec.max}` : ""} of ${spec.item ? inline(spec.item) : "any"}`;
    case "object":
      return inline(spec);
    default:
      return "any";
  }
}

function inline(spec: FieldSpec): string {
  if (spec.kind !== "object") return typeLabel(spec);
  const fields = (spec.fields ?? []).filter((field) => !field.locked);
  return `{ ${fields.map((field) => `${field.name}${field.required ? "" : "?"}: ${typeLabel(field)}`).join(", ")} }`;
}

/** Compact, prompt-ready list of the fields the AI may edit. */
export function describeFields(spec: FieldSpec, prefix: string): string {
  return (spec.fields ?? [])
    .filter((field) => !field.locked)
    .map((field) => {
      const note = [
        field.description,
        field.fact ? "only the business's own value" : undefined,
        field.partOf ? `must be words copied exactly from ${field.partOf}` : undefined,
      ]
        .filter(Boolean)
        .join(" ");
      return `  ${prefix}${field.name}${field.required ? "" : "?"}: ${typeLabel(field)}${note ? `  // ${note}` : ""}`;
    })
    .join("\n");
}

/** Data fields of the given section types, for AI prompts. */
export function describeSectionTypes(types: readonly SectionType[]): string {
  return types.map((type) => `${type}:\n${describeFields(dataSpec(type), "data.")}`).join("\n");
}

/** Catalog of the given section types plus the shared settings, for AI prompts. */
export function describeCatalog(types: readonly SectionType[]): string {
  return `Every section:\n${describeFields(settingsSpec(), "settings.")}\n${describeSectionTypes(types)}
IMAGE = an image value (see IMAGES). LINK = { label, href }. "?" = optional.`;
}
