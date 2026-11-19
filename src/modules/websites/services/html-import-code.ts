import { randomBytes } from "node:crypto";
import * as cheerio from "cheerio";
import type { ImportedHtmlData, ImportedHtmlText } from "../types/site-content.types.js";
import { extractEditableFields } from "./html-import-components.js";
import {
  enforceScopedCss,
  IMPORT_SCOPE_PATTERN,
  mediaToContainerPrelude,
  parseCss,
  scopeRootSelector,
  serializeCss,
  splitSelectorList,
  type CssNode,
} from "./html-import-css.js";
import { prepareImportedForms } from "./html-import-forms.js";
import { sanitizeImportedHtml } from "./html-import-sanitize.js";

/**
 * Hand-edited code of one imported block (the editor's "Edit code" panel).
 *
 * The editor shows the block's CSS without its scope prefix: `.card {…}` instead of
 * `.wb-site .wbi-x .card {…}`, and `&` for the block's own root (`&.dark {…}`).
 */
export type ImportedBlockCode = {
  html: string;
  css?: string;
  /** The block's current scope; a new one is made when missing or invalid. */
  scope?: string;
  /** Current texts, so their labels survive. */
  texts?: ImportedHtmlText[];
};

export type RebuiltImportedBlock = Pick<ImportedHtmlData, "html" | "css" | "scope" | "texts" | "mediaSlots">;

const newScope = () => `wbi-${randomBytes(6).toString("hex")}`;

/** `&` (the block root) → the scope root; `@media` width queries → `@container` like at import time. */
function expandEditorCss(nodes: CssNode[], root: string): CssNode[] {
  return nodes.map((node): CssNode => {
    if (node.kind === "rule") {
      const selector = splitSelectorList(node.selector)
        .map((part) => (part.startsWith("&") ? `${root}${part.slice(1)}` : part))
        .join(", ");
      return { ...node, selector };
    }
    if (node.name === "media" && node.children) {
      const container = mediaToContainerPrelude(node.prelude);
      const children = expandEditorCss(node.children, root);
      return container ? { ...node, name: "container", prelude: container, children } : { ...node, children };
    }
    return node.children ? { ...node, children: expandEditorCss(node.children, root) } : node;
  });
}

/** Scoped, safe CSS for the block from the editor's unscoped form. */
export function scopeEditorCss(css: string, scope: string): string {
  if (!css.trim()) return "";
  const expanded = serializeCss(expandEditorCss(parseCss(css), scopeRootSelector(scope)));
  return enforceScopedCss(expanded, scope);
}

/**
 * Turns hand-edited HTML/CSS back into a stored block: sanitized like an import, CSS kept inside
 * the block, and texts/images re-tagged so click-to-edit keeps working. Existing ids are kept.
 */
export function rebuildImportedBlock(code: ImportedBlockCode): RebuiltImportedBlock {
  const scope = code.scope && IMPORT_SCOPE_PATTERN.test(code.scope) ? code.scope : newScope();
  const $ = cheerio.load(prepareImportedForms(sanitizeImportedHtml(code.html)), null, false);
  const { texts, mediaSlots } = extractEditableFields($, { texts: code.texts });
  return {
    html: $.html().trim(),
    css: scopeEditorCss(code.css ?? "", scope),
    scope,
    texts,
    mediaSlots,
  };
}
