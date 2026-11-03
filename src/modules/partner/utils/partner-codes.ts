import crypto from "node:crypto";

const CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // without 0, 1, I, O to avoid confusion

export function randomAlphanumeric(length: number): string {
  let result = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return result;
}

export function formatPartnerApplicationId(partnerNumber: number): string {
  return `PART-${partnerNumber}`;
}

export function formatPartnerReferenceId(
  partnerNumber?: number | null,
  applicationId?: string | null,
  year = 2026,
): string {
  if (applicationId?.startsWith("PA-")) {
    return applicationId;
  }
  const num =
    partnerNumber ??
    (applicationId ? parseInt(applicationId.replace(/\D/g, ""), 10) : 0);
  if (num > 0) {
    return `PA-${year}-${String(num).padStart(5, "0")}`;
  }
  return applicationId || `PA-${year}-00001`;
}

export function generateApplicationId(sequenceNumber?: number): string {
  if (typeof sequenceNumber === "number" && sequenceNumber > 0) {
    return formatPartnerApplicationId(sequenceNumber);
  }
  return formatPartnerApplicationId(1);
}

export function generateReferralCode(seedName?: string): string {
  let prefix = "BYZ";
  if (seedName) {
    const cleaned = seedName.replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (cleaned.length >= 3) {
      prefix = cleaned.slice(0, 3);
    }
  }
  return `${prefix}-${randomAlphanumeric(4)}`;
}

