import {
  CONTACT_FIELD_TYPES,
  CONTACT_ID_PATTERN,
  CONTACT_LIMITS,
  type ContactFieldType,
  type ContactFormField,
} from "../types/site-content.types.js";
import type { PublishSnapshot } from "../types/website.types.js";

/** One answered field of a submitted contact form, in form order. */
export type ContactEntry = { id: string; label: string; type: ContactFieldType; value: string };

export type ContactSubmissionResult = { ok: true; entries: ContactEntry[] } | { ok: false; error: string };

export type ContactLeadContent = {
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  /** Plain-text summary of every answered field. */
  message: string;
  fields: { label: string; value: string }[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+0-9()\-.\s]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHOICE_TYPES: ReadonlySet<ContactFieldType> = new Set(["select", "radio", "checkboxes"]);
const FIELD_TYPES: ReadonlySet<string> = new Set(CONTACT_FIELD_TYPES);

function isContactField(value: unknown): value is ContactFormField {
  if (!value || typeof value !== "object") return false;
  const field = value as Partial<ContactFormField>;
  return typeof field.id === "string" && CONTACT_ID_PATTERN.test(field.id) && typeof field.type === "string" && FIELD_TYPES.has(field.type);
}

/**
 * Custom fields of a published contact section. Null when the live site has no such section
 * or the section still uses the default name/email/message form.
 */
export function findContactFormFields(snapshot: PublishSnapshot | null | undefined, sectionId: string): ContactFormField[] | null {
  for (const page of snapshot?.pages ?? []) {
    for (const section of page.sections ?? []) {
      if (section.id !== sectionId || section.type !== "contact") continue;
      const fields = (section.data as { formFields?: unknown }).formFields;
      if (!Array.isArray(fields)) return null;
      const valid = fields.filter(isContactField);
      return valid.length > 0 ? valid : null;
    }
  }
  return null;
}

function fieldLabel(field: ContactFormField, index: number): string {
  return field.label?.trim() || `Field ${index + 1}`;
}

function fieldOptions(field: ContactFormField): string[] {
  return (field.options ?? []).map((option) => option.trim()).filter(Boolean);
}

/** Submitted strings for a field id; other keys and non-string values are ignored. */
function submittedValues(values: Record<string, unknown>, id: string): string[] {
  if (!Object.hasOwn(values, id)) return [];
  const raw = values[id];
  return (Array.isArray(raw) ? raw : [raw])
    .slice(0, CONTACT_LIMITS.maxOptions)
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function invalidReason(field: ContactFormField, label: string, values: string[], options: string[]): string | null {
  const max = field.type === "textarea" ? CONTACT_LIMITS.maxLongValue : CONTACT_LIMITS.maxTextValue;
  if (values.some((value) => value.length > max)) return `"${label}" is too long.`;
  const [first = ""] = values;
  switch (field.type) {
    case "email":
      return EMAIL.test(first) ? null : `Please enter a valid email address for "${label}".`;
    case "tel":
      return PHONE.test(first) && first.replace(/\D/g, "").length >= 5 ? null : `Please enter a valid phone number for "${label}".`;
    case "number":
      return Number.isFinite(Number(first)) ? null : `Please enter a number for "${label}".`;
    case "date":
      return isValidDate(first) ? null : `Please enter a valid date for "${label}".`;
    case "select":
    case "radio":
    case "checkboxes":
      return values.every((value) => options.includes(value)) ? null : `Please choose a valid option for "${label}".`;
    default:
      return null;
  }
}

/**
 * Checks submitted values against the published field list. Only known field ids are read, so
 * visitors can't add fields of their own; choice answers must be one of the field's options.
 */
export function validateContactSubmission(fields: readonly ContactFormField[], submitted: unknown): ContactSubmissionResult {
  if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) {
    return { ok: false, error: "Please fill in the form before sending." };
  }
  const values = submitted as Record<string, unknown>;
  const entries: ContactEntry[] = [];

  for (const [index, field] of fields.entries()) {
    const label = fieldLabel(field, index);
    const options = fieldOptions(field);
    if (CHOICE_TYPES.has(field.type) && options.length === 0) continue;

    const all = submittedValues(values, field.id);
    const answers = field.type === "checkboxes" ? [...new Set(all)] : all.slice(0, 1);
    if (answers.length === 0) {
      if (field.required) return { ok: false, error: `Please fill in "${label}".` };
      continue;
    }
    const reason = invalidReason(field, label, answers, options);
    if (reason) return { ok: false, error: reason };
    entries.push({ id: field.id, label, type: field.type, value: answers.join(", ") });
  }

  if (entries.length === 0) return { ok: false, error: "Please fill in the form before sending." };
  return { ok: true, entries };
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** Maps answered fields onto the lead email: who sent it, how to reply, and every answer. */
export function leadFromEntries(entries: readonly ContactEntry[]): ContactLeadContent {
  const name =
    entries.find((entry) => entry.id === "name")?.value ??
    entries.find((entry) => entry.type === "text" && /name/i.test(entry.label))?.value;
  return {
    senderName: oneLine(name ?? "").slice(0, 120) || "Website visitor",
    senderEmail: entries.find((entry) => entry.type === "email")?.value,
    senderPhone: entries.find((entry) => entry.type === "tel")?.value,
    message: entries.map((entry) => `${entry.label}: ${entry.value}`).join("\n"),
    fields: entries.map(({ label, value }) => ({ label, value })),
  };
}
