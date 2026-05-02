"use client";

// ── GigHub End-to-End Encryption ─────────────────────────────────────────────
//
// Architecture:
//   • Each user has a persistent RSA-OAEP-2048 key pair (generated in browser)
//   • Private key: stored in localStorage (never leaves the device)
//   • Public key:  uploaded to server so counterparties can encrypt for us
//
// Message encryption (AES-256-GCM hybrid):
//   1. Generate a random one-time AES-256-GCM key per message
//   2. Encrypt plaintext with AES key
//   3. Wrap AES key with sender's public key  → encryptedKeyForSender
//   4. Wrap AES key with recipient's public key → encryptedKeyForRecipient
//   5. Server stores all four blobs; never sees plaintext
//
// File encryption (per spec — deliverables):
//   1. Generate a random AES-256-GCM key per file
//   2. Compute SHA-256 of plaintext (immutable proof-of-delivery)
//   3. Encrypt file bytes with AES key
//   4. Wrap AES key with recipient's public key
//   5. Upload encrypted blob + wrapped key + SHA-256 hash
//   6. Server stores ciphertext only; blob auto-deleted after 72 h

const PRIVATE_KEY_LS_KEY = "gighub:e2e:privateKey:v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

const bufToBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (b64: string): ArrayBuffer => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
};

// ── Key generation ────────────────────────────────────────────────────────────

export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// ── Public key export / import ────────────────────────────────────────────────

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const buf = await crypto.subtle.exportKey("spki", key);
  return bufToBase64(buf);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(base64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
}

// ── Private key persistence (localStorage) ────────────────────────────────────

export async function persistPrivateKey(key: CryptoKey): Promise<void> {
  const buf = await crypto.subtle.exportKey("pkcs8", key);
  localStorage.setItem(PRIVATE_KEY_LS_KEY, bufToBase64(buf));
}

export async function loadPersistedPrivateKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(PRIVATE_KEY_LS_KEY);
  if (!stored) return null;
  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      base64ToArrayBuffer(stored),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );
  } catch {
    return null;
  }
}

export function hasPersistedKey(): boolean {
  return Boolean(localStorage.getItem(PRIVATE_KEY_LS_KEY));
}

// ── Message encryption ────────────────────────────────────────────────────────

export interface EncryptedMessagePayload {
  encryptedBody: string;
  iv: string;
  encryptedKeyForSender: string;
  encryptedKeyForRecipient: string;
}

export async function encryptMessage(
  plaintext: string,
  senderPublicKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<EncryptedMessagePayload> {
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const iv = ivBytes.buffer as ArrayBuffer;

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    aesKey,
    new TextEncoder().encode(plaintext)
  );

  const rawKey = await crypto.subtle.exportKey("raw", aesKey);

  const [wrappedForSender, wrappedForRecipient] = await Promise.all([
    crypto.subtle.encrypt({ name: "RSA-OAEP" }, senderPublicKey, rawKey),
    crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientPublicKey, rawKey),
  ]);

  return {
    encryptedBody: bufToBase64(ciphertext),
    iv: bufToBase64(iv),
    encryptedKeyForSender: bufToBase64(wrappedForSender),
    encryptedKeyForRecipient: bufToBase64(wrappedForRecipient),
  };
}

export async function decryptMessage(
  encryptedBody: string,
  iv: string,
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<string> {
  const rawKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToArrayBuffer(encryptedKey)
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
    aesKey,
    base64ToArrayBuffer(encryptedBody)
  );

  return new TextDecoder().decode(plaintext);
}

// ── File encryption (per-job deliverable E2E) ─────────────────────────────────

export interface EncryptedFileResult {
  encryptedBlob: Blob;
  iv: string;
  clientEncryptedKey: string;
  sha256Hash: string;
}

export async function encryptFile(
  file: File,
  recipientPublicKey: CryptoKey
): Promise<EncryptedFileResult> {
  const fileBytes = await file.arrayBuffer();

  const [hashBuf, aesKey] = await Promise.all([
    crypto.subtle.digest("SHA-256", fileBytes),
    crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]),
  ]);

  const sha256Hash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const ivBytes = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    aesKey,
    fileBytes
  );

  const rawKey = await crypto.subtle.exportKey("raw", aesKey);
  const wrappedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawKey
  );

  return {
    encryptedBlob: new Blob([ciphertext], { type: "application/octet-stream" }),
    iv: bufToBase64(ivBytes.buffer as ArrayBuffer),
    clientEncryptedKey: bufToBase64(wrappedKey),
    sha256Hash,
  };
}

export async function decryptFile(
  encryptedBytes: ArrayBuffer,
  iv: string,
  clientEncryptedKey: string,
  privateKey: CryptoKey,
  fileName: string
): Promise<File> {
  const rawKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToArrayBuffer(clientEncryptedKey)
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
    aesKey,
    encryptedBytes
  );

  return new File([plaintext], fileName);
}
