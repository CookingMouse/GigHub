import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import type { SupportedSubmissionFormat } from "@gighub/shared";
import { env } from "../lib/env";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// --- S3 Setup ---
let s3Client: S3Client | null = null;

if (env.STORAGE_PROVIDER === "r2") {
  s3Client = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!
    }
  });
}

// --- Local Storage Setup ---
const storageRoot = path.resolve(__dirname, "..", "..", env.FILE_STORAGE_ROOT);
const keyMaterial = Buffer.from(env.FILE_ENCRYPTION_SECRET, "utf8");
const encryptionKey = Buffer.from(
  hkdfSync("sha256", keyMaterial, Buffer.from("gighub-storage"), Buffer.from("submission"), 32)
);

const ensureStorageRoot = async () => {
  if (env.STORAGE_PROVIDER !== "r2") {
    await mkdir(storageRoot, {
      recursive: true
    });
  }
};

const buildStorageKey = (format: SupportedSubmissionFormat) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return path.join(`${year}`, `${month}`, `${day}`, `${randomUUID()}.${format}.enc`).replace(/\\/g, "/");
};

export const getLocalStorageRoot = () => storageRoot;

type StoreSubmissionFileInput = {
  fileBuffer: Buffer;
  format: SupportedSubmissionFormat;
  encrypted?: boolean;
};

type StoreSubmissionFileResult = {
  fileHash: string;
  storageKey: string;
  retentionExpiresAt: Date;
};

export const storeSubmissionFile = async ({
  fileBuffer,
  format,
  encrypted = true
}: StoreSubmissionFileInput): Promise<StoreSubmissionFileResult> => {
  await ensureStorageRoot();

  const storageKey = buildStorageKey(format);
  const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

  let finalBuffer: Buffer;

  if (encrypted) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
    const encryptedPayload = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    finalBuffer = Buffer.concat([iv, authTag, encryptedPayload]);
  } else {
    finalBuffer = fileBuffer;
  }

  if (env.STORAGE_PROVIDER === "r2") {
    console.log(`Storing file to R2 at: ${storageKey}`);
    await s3Client!.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: storageKey,
      Body: finalBuffer,
      ContentType: "application/octet-stream"
    }));
  } else {
    const destination = path.join(storageRoot, storageKey);
    console.log(`Storing file locally at: ${destination}`);
    const destinationDirectory = path.dirname(destination);
    
    await mkdir(destinationDirectory, {
      recursive: true
    });

    await writeFile(destination, finalBuffer);
  }

  return {
    fileHash,
    storageKey,
    retentionExpiresAt: new Date(Date.now() + env.FILE_RETENTION_HOURS * 60 * 60 * 1000)
  };
};

const streamToBuffer = async (stream: Readable | ReadableStream | Blob): Promise<Buffer> => {
  if (stream instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  const arrayBuffer = await new Response(stream as any).arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const retrieveSubmissionFile = async (storageKey: string): Promise<Buffer> => {
  let fileBuffer: Buffer;

  if (env.STORAGE_PROVIDER === "r2") {
    const response = await s3Client!.send(new GetObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: storageKey
    }));
    fileBuffer = await streamToBuffer(response.Body as Readable);
  } else {
    const destination = path.join(storageRoot, storageKey);
    fileBuffer = await readFile(destination);
  }

  // If file ends with .enc, it's encrypted, otherwise it's plain
  if (!storageKey.endsWith(".enc")) {
    return fileBuffer;
  }

  const iv = fileBuffer.slice(0, 12);
  const authTag = fileBuffer.slice(12, 28);
  const encryptedPayload = fileBuffer.slice(28);

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedPayload), decipher.final()]);
};

export const removeStoredSubmissionFile = async (storageKey: string) => {
  if (env.STORAGE_PROVIDER === "r2") {
    await s3Client!.send(new DeleteObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: storageKey
    }));
  } else {
    const destination = path.join(storageRoot, storageKey);
    await rm(destination, {
      force: true
    });
  }
};
