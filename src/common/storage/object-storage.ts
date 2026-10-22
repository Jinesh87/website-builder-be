import { createReadStream, existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../errors/AppError.js";

/** Inclusive byte range, as in an HTTP `Range: bytes=start-end` header. */
export type ByteRange = { start: number; end: number };

export function isRemoteObjectStorage(): boolean {
  return Boolean(
    env.LINODE_OBJECT_STORAGE_ENDPOINT &&
      env.LINODE_OBJECT_STORAGE_BUCKET &&
      env.LINODE_OBJECT_STORAGE_ACCESS_KEY &&
      env.LINODE_OBJECT_STORAGE_SECRET_KEY,
  );
}

let s3: S3Client | null = null;

function getS3(): S3Client {
  s3 ??= new S3Client({
    region: env.LINODE_OBJECT_STORAGE_REGION,
    endpoint: env.LINODE_OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: false,
    credentials: {
      accessKeyId: env.LINODE_OBJECT_STORAGE_ACCESS_KEY,
      secretAccessKey: env.LINODE_OBJECT_STORAGE_SECRET_KEY,
    },
  });
  return s3;
}

/** Logical key → bucket key, prefixed with STORAGE_FOLDER when set. */
function remoteKey(key: string): string {
  const folder = env.STORAGE_FOLDER.replace(/^\/+|\/+$/g, "");
  const trimmed = key.replace(/^\/+/, "");
  return folder ? `${folder}/${trimmed}` : trimmed;
}

const localRoot = resolve(process.cwd(), env.UPLOAD_LOCAL_DIR);

function localPathForKey(key: string): string {
  const path = resolve(localRoot, key);
  if (!path.startsWith(localRoot + sep)) {
    throw new AppError(400, "Invalid storage key", "INVALID_STORAGE_KEY");
  }
  return path;
}

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  const cacheControl = params.cacheControl ?? "public, max-age=31536000, immutable";
  if (isRemoteObjectStorage()) {
    await getS3().send(
      new PutObjectCommand({
        Bucket: env.LINODE_OBJECT_STORAGE_BUCKET,
        Key: remoteKey(params.key),
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: cacheControl,
      }),
    );
    return;
  }

  const path = localPathForKey(params.key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, params.body);
  logger.debug({ key: params.key }, "Stored object on local disk (Linode not configured)");
}

export async function deleteObject(key: string): Promise<void> {
  if (isRemoteObjectStorage()) {
    await getS3().send(new DeleteObjectCommand({ Bucket: env.LINODE_OBJECT_STORAGE_BUCKET, Key: remoteKey(key) }));
    return;
  }
  try {
    await unlink(localPathForKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/** Streams an object, or one byte range of it. Throws 404 when the bytes are missing. */
export async function openObjectStream(key: string, range?: ByteRange): Promise<Readable> {
  if (isRemoteObjectStorage()) {
    try {
      const result = await getS3().send(
        new GetObjectCommand({
          Bucket: env.LINODE_OBJECT_STORAGE_BUCKET,
          Key: remoteKey(key),
          Range: range ? `bytes=${range.start}-${range.end}` : undefined,
        }),
      );
      if (!result.Body) throw new AppError(404, "File not found", "NOT_FOUND");
      return result.Body as Readable;
    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchKey") {
        throw new AppError(404, "File not found", "NOT_FOUND");
      }
      throw error;
    }
  }

  const path = localPathForKey(key);
  if (!existsSync(path)) throw new AppError(404, "File not found", "NOT_FOUND");
  return createReadStream(path, range);
}

/** Reads a whole object into memory; only for files within the upload size limits. */
export async function readObject(key: string): Promise<Buffer> {
  return buffer(await openObjectStream(key));
}
