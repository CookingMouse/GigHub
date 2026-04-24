import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import type { SupportedSubmissionFormat } from "@gighub/shared";
import { env } from "../lib/env";

type StoreSubmissionFileInput = {
  fileBuffer: Buffer;
  format: SupportedSubmissionFormat;
};

type StoreSubmissionFileResult = {
  fileHash: string;
  storageKey: string;
  retentionExpiresAt: Date;
};

const storageRoot = path.resolve(__dirname, "..", "..", env.FILE_STORAGE_ROOT);
const keyMaterial = Buffer.from(env.FILE_ENCRYPTION_SECRET, "utf8");
const encryptionKey = Buffer.from(
  hkdfSync("sha256", keyMaterial, Buffer.from("gighub-storage"), Buffer.from("submission"), 32)
);

const ensureStorageRoot = async () => {
  await mkdir(storageRoot, {
    recursive: true
  });
};

const buildStorageKey = (format: SupportedSubmissionFormat) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return path.join(`${year}`, `${month}`, `${day}`, `${randomUUID()}.${format}.enc`);
};

export const getLocalStorageRoot = () => storageRoot;

export const storeSubmissionFile = async ({
  fileBuffer,
  format
}: StoreSubmissionFileInput): Promise<StoreSubmissionFileResult> => {
  await ensureStorageRoot();

  const storageKey = buildStorageKey(format);
  const destination = path.join(storageRoot, storageKey);
  const destinationDirectory = path.dirname(destination);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encryptedPayload = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

  await mkdir(destinationDirectory, {
    recursive: true
  });

  await writeFile(destination, Buffer.concat([iv, authTag, encryptedPayload]));

  return {
    fileHash,
    storageKey: storageKey.replace(/\\/g, "/"),
    retentionExpiresAt: new Date(Date.now() + env.FILE_RETENTION_HOURS * 60 * 60 * 1000)
  };
};

export const retrieveSubmissionFile = async (storageKey: string): Promise<Buffer> => {
  const destination = path.join(storageRoot, storageKey);
  const encryptedPayloadWithHeader = await readFile(destination);

  const iv = encryptedPayloadWithHeader.slice(0, 12);
  const authTag = encryptedPayloadWithHeader.slice(12, 28);
  const encryptedPayload = encryptedPayloadWithHeader.slice(28);

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedPayload), decipher.final()]);
};

export const removeStoredSubmissionFile = async (storageKey: string) => {
  const destination = path.join(storageRoot, storageKey);

  await rm(destination, {
    force: true
  });
};
