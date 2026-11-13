/**
 * Makes forms inside imported HTML work like the platform contact form on the live site:
 *  - `prepareImportedForms` (run on every save) marks each <form>, gives every control a clean
 *    field name and adds the spam trap, so the live-site runtime posts it to the contact endpoint;
 *  - `importedFormFields` reads the field definitions back from the *published* HTML, so the
 *    endpoint validates submissions against the real form (unknown fields are never accepted).
 */
import * as cheerio from "cheerio";
import { CONTACT_ID_PATTERN, CONTACT_LIMITS, type ContactFormField } from "../types/site-content.types.js";

/** Same spam-trap field the platform form uses (`_wb_hp`). */
const HONEYPOT = "_wb_hp";
const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "file", "password"]);

type $ = cheerio.CheerioAPI;
type Node = import("domhandler").AnyNode;

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+$/, "")
    .slice(0, 36);
  return base || "field";
}

function controlLabel($: $, form: cheerio.Cheerio<Node>, control: cheerio.Cheerio<Node>): string {
  const id = control.attr("id");
  const byFor = id ? form.find(`label[for="${id.replace(/"/g, '\\"')}"]`).first() : null;
  const wrap = control.closest("label");
  let text = "";
  if (byFor?.length) text = byFor.text();
  else if (wrap.length) {
    const copy = wrap.clone();
    copy.find("input, select, textarea").remove();
    text = copy.text();
  }
  return clean(text.replace(/\*/g, "")) || clean(control.attr("aria-label")) || clean(control.attr("placeholder")) || clean(control.attr("name"));
}

function isRequired($: $, form: cheerio.Cheerio<Node>, control: cheerio.Cheerio<Node>): boolean {
  if (control.attr("required") !== undefined) return true;
  const id = control.attr("id");
  const label = id ? form.find(`label[for="${id.replace(/"/g, '\\"')}"]`).first() : control.closest("label");
  return /\*/.test(label?.text() ?? "");
}

/** Marks forms and normalises control names in an imported fragment (idempotent). */
export function prepareImportedForms(html: string): string {
  if (!html.includes("<form")) return html;
  const $ = cheerio.load(html, null, false);
  $("form").each((index, raw) => {
    const form = $(raw);
    form.attr("data-wb-imported-form", "");
    form.attr("data-wb-form-index", String(index));
    form.removeAttr("action").removeAttr("method");

    const renamed = new Map<string, string>();
    const used = new Set<string>();
    form.find("input, select, textarea").each((_, el) => {
      const control = $(el);
      const type = (control.attr("type") || "text").toLowerCase();
      if (control.attr("name") === HONEYPOT || ((el as { name?: string }).name === "input" && SKIP_TYPES.has(type))) return;
      const original = control.attr("name") || "";
      // Radio/checkbox groups share one name; keep them together.
      if (original && renamed.has(original) && (type === "radio" || type === "checkbox")) {
        control.attr("name", renamed.get(original)!);
        return;
      }
      let name = CONTACT_ID_PATTERN.test(original) ? original : slug(original || controlLabel($, form, control));
      for (let i = 2; used.has(name); i += 1) name = `${slug(name).slice(0, 34)}_${i}`;
      used.add(name);
      if (original) renamed.set(original, name);
      control.attr("name", name);
    });

    if (form.find(`input[name="${HONEYPOT}"]`).length === 0) {
      form.append(
        `<input type="text" name="${HONEYPOT}" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-10000px;width:1px;height:1px;opacity:0">`,
      );
    }
  });
  return $.html();
}

/** Field definitions of form `formIndex` in published imported HTML; null when there is none. */
export function importedFormFields(html: string, formIndex: number): ContactFormField[] | null {
  if (!html.includes("data-wb-imported-form")) return null;
  const $ = cheerio.load(html, null, false);
  const form = $("form[data-wb-imported-form]").eq(Math.max(0, Math.floor(formIndex)));
  if (!form.length) return null;

  const fields: ContactFormField[] = [];
  const seen = new Set<string>();
  form.find("input, select, textarea").each((_, el) => {
    if (fields.length >= CONTACT_LIMITS.maxFields) return;
    const control = $(el);
    const tag = (el as { name?: string }).name;
    const inputType = (control.attr("type") || "text").toLowerCase();
    const name = control.attr("name") || "";
    if (!name || name === HONEYPOT || !CONTACT_ID_PATTERN.test(name) || seen.has(name)) return;
    if (tag === "input" && SKIP_TYPES.has(inputType)) return;
    seen.add(name);

    let type: ContactFormField["type"] = "text";
    let options: string[] | undefined;
    if (tag === "textarea") type = "textarea";
    else if (tag === "select") {
      type = "select";
      options = control
        .find("option")
        .toArray()
        .map((option) => clean($(option).attr("value") ?? $(option).text()))
        .filter(Boolean)
        .slice(0, CONTACT_LIMITS.maxOptions);
    } else if (inputType === "radio" || inputType === "checkbox") {
      type = inputType === "radio" ? "radio" : "checkboxes";
      options = form
        .find(`input[name="${name}"]`)
        .toArray()
        .map((input) => clean($(input).attr("value") ?? "on"))
        .slice(0, CONTACT_LIMITS.maxOptions);
    } else if (["email", "tel", "number", "date"].includes(inputType)) type = inputType as ContactFormField["type"];

    const label =
      type === "radio" || type === "checkboxes"
        ? clean(control.closest("fieldset").find("legend").first().text()) || name
        : controlLabel($, form, control);
    fields.push({
      id: name,
      type,
      label: label.slice(0, 80) || name,
      ...(isRequired($, form, control) ? { required: true } : {}),
      ...(options?.length ? { options } : {}),
    });
  });
  if (fields.length === 0) return null;
  // Many hand-written forms mark nothing as required (their own script did the checking). An
  // enquiry still needs someone to reply to: require the name and the first email/phone field.
  if (!fields.some((field) => field.required)) {
    const name = fields.find((field) => field.type === "text" && /name/i.test(`${field.id} ${field.label}`));
    const reply = fields.find((field) => field.type === "email") ?? fields.find((field) => field.type === "tel");
    const fallback = fields.find((field) => field.type === "text" || field.type === "textarea");
    for (const field of name || reply ? [name, reply] : [fallback]) if (field) field.required = true;
  }
  return fields;
}
