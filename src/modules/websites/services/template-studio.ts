import { prisma } from "../../../config/prisma.js";
import { ClientSource } from "../../../generated/prisma/enums.js";

/** Fixed id so every API instance upserts the same row instead of racing to create several. */
export const TEMPLATE_STUDIO_CLIENT_ID = "5b0c6a1e-7f4d-4a8e-9c2b-3d1e0f7a6b54";

/**
 * The internal workspace that owns the websites a Super Admin designs platform templates in,
 * and the media those templates use. It never appears in client lists and can't publish.
 */
export async function ensureTemplateStudio(): Promise<string> {
  await prisma.client.upsert({
    where: { id: TEMPLATE_STUDIO_CLIENT_ID },
    create: {
      id: TEMPLATE_STUDIO_CLIENT_ID,
      businessName: "Template Studio",
      source: ClientSource.ADMIN_CREATED,
      canPublish: false,
      isInternal: true,
    },
    update: { isInternal: true, canPublish: false },
  });
  return TEMPLATE_STUDIO_CLIENT_ID;
}
