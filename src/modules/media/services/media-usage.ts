import { prisma } from "../../../config/prisma.js";

/**
 * Ids of every media file a client's content refers to, found in one pass instead of one search per
 * file. Looks in the same places as the single-file check before a delete: page drafts, headers,
 * footers, logos, live sites, templates and saved sections. Template Studio files (`everywhere`)
 * end up in sites created from platform templates, so every client's websites are searched for those.
 */
export async function usedMediaIds(clientId: string, everywhere: boolean): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH content AS (
      SELECT p.sections::text AS body FROM pages p
        WHERE ${everywhere}::boolean OR p."clientId" = ${clientId}::uuid
      UNION ALL
      SELECT concat(w.header::text, ' ', w.footer::text) FROM websites w
        WHERE ${everywhere}::boolean OR w."clientId" = ${clientId}::uuid
      UNION ALL
      SELECT v.snapshot::text FROM websites w JOIN website_versions v ON v.id = w."liveVersionId"
        WHERE ${everywhere}::boolean OR w."clientId" = ${clientId}::uuid
      UNION ALL
      SELECT concat(t.pages::text, ' ', t.header::text, ' ', t.footer::text) FROM website_templates t
        WHERE t."clientId" = ${clientId}::uuid OR t."clientId" IS NULL
      UNION ALL
      SELECT s.section::text FROM saved_sections s WHERE s."clientId" = ${clientId}::uuid
    )
    SELECT DISTINCT lower(m[1]) AS id
      FROM content, regexp_matches(content.body, '/media/files/([0-9a-fA-F-]{36})', 'g') AS m
    UNION
    SELECT w."logoMediaId"::text FROM websites w
      WHERE w."logoMediaId" IS NOT NULL AND (${everywhere}::boolean OR w."clientId" = ${clientId}::uuid)
  `;
  return new Set(rows.map((row) => row.id));
}

/** Used ids for one client, looking up whether it is the Template Studio. */
export async function usedMediaIdsForClient(clientId: string): Promise<Set<string>> {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { isInternal: true } });
  return usedMediaIds(clientId, client?.isInternal ?? false);
}
