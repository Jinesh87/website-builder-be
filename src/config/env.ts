import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredSecret(name: string, minLength = 32): string {
  const value = required(name);
  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters`);
  }
  return value;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1";
}

function sameSite(raw: string | undefined): "lax" | "strict" | "none" {
  const value = raw?.trim().toLowerCase();
  if (value === "strict" || value === "none") return value;
  return "lax";
}

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";

export const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT ?? 3000),
  LOG_LEVEL: process.env.LOG_LEVEL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  FRONTEND_URL: (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  /** Express "trust proxy" setting, needed behind nginx/a load balancer so req.ip is the client IP. */
  TRUST_PROXY: bool("TRUST_PROXY", false),

  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX ?? "webbuilder:",

  JWT_ACCESS_SECRET: requiredSecret("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: requiredSecret("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",

  COOKIE_SECURE: bool("COOKIE_SECURE", isProd),
  COOKIE_SAMESITE: sameSite(process.env.COOKIE_SAMESITE),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN?.trim() || undefined,

  /** Encrypts secrets stored in the database (e.g. the Resend API key). */
  APP_ENCRYPTION_KEY: requiredSecret("APP_ENCRYPTION_KEY"),

  /** Linode Object Storage (S3-compatible). Files go to UPLOAD_LOCAL_DIR on disk when any of these is unset. */
  LINODE_OBJECT_STORAGE_ENDPOINT: process.env.LINODE_OBJECT_STORAGE_ENDPOINT?.trim() ?? "",
  LINODE_OBJECT_STORAGE_REGION: process.env.LINODE_OBJECT_STORAGE_REGION?.trim() || "ap-south-1",
  LINODE_OBJECT_STORAGE_BUCKET: process.env.LINODE_OBJECT_STORAGE_BUCKET?.trim() ?? "",
  LINODE_OBJECT_STORAGE_ACCESS_KEY: process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY?.trim() ?? "",
  LINODE_OBJECT_STORAGE_SECRET_KEY: process.env.LINODE_OBJECT_STORAGE_SECRET_KEY?.trim() ?? "",
  /** Optional prefix inside the bucket, e.g. "webbuilder". Empty = bucket root. */
  STORAGE_FOLDER: process.env.STORAGE_FOLDER?.trim() ?? "",
  UPLOAD_LOCAL_DIR: process.env.UPLOAD_LOCAL_DIR?.trim() || "uploads",
  /** Public base URL of this API, used to build media URLs embedded in website content. */
  API_PUBLIC_URL: (process.env.API_PUBLIC_URL?.trim() || `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, ""),

  SEED_SUPER_ADMIN_EMAIL: required("SEED_SUPER_ADMIN_EMAIL").toLowerCase(),
  SEED_SUPER_ADMIN_PASSWORD: required("SEED_SUPER_ADMIN_PASSWORD"),
  SEED_SUPER_ADMIN_NAME: process.env.SEED_SUPER_ADMIN_NAME?.trim() || "Super Admin",

  OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  PUBLIC_SITE_DOMAIN: (process.env.PUBLIC_SITE_DOMAIN?.trim() || "bytezora.site").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""),

  /** Renders live pages with the editor's components (frontend `site-renderer`). Falls back to the built-in renderer when unreachable. */
  SITE_RENDERER_URL: (process.env.SITE_RENDERER_URL?.trim() || "http://127.0.0.1:3100").replace(/\/$/, ""),
  /** Public IPs custom domains must point at (A/AAAA records), comma-separated. Unset = routing isn't checked. */
  SITE_SERVER_IPS: (process.env.SITE_SERVER_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
  /** Hostname sub-domains like www.example.com may CNAME to instead of using A records, e.g. "sites.example.com". */
  SITE_CNAME_TARGET: (process.env.SITE_CNAME_TARGET?.trim() ?? "").toLowerCase().replace(/\.$/, ""),
  /** Shared with the server's nginx domain-sync script (deploy/nginx-domain-sync). Unset = endpoint disabled. */
  DOMAIN_SYNC_TOKEN: process.env.DOMAIN_SYNC_TOKEN?.trim() || "",
};

export const isProduction = isProd;
