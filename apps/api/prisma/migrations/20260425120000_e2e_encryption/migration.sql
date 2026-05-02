-- Migration: End-to-end encryption infrastructure
-- Adds public key storage on User, encrypted fields on ConversationMessage,
-- and client-side encryption metadata on Submission.

-- User: store RSA-OAEP public key (SPKI, base64)
ALTER TABLE "User" ADD COLUMN "publicKey" TEXT;

-- ConversationMessage: make body nullable (null when E2E encrypted),
-- add AES-256-GCM ciphertext + IV + two RSA-wrapped key blobs
ALTER TABLE "ConversationMessage" ALTER COLUMN "body" DROP NOT NULL;
ALTER TABLE "ConversationMessage" ADD COLUMN "encryptedBody"            TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "iv"                       TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "encryptedKeyForSender"    TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "encryptedKeyForRecipient" TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "isEncrypted"              BOOLEAN NOT NULL DEFAULT false;

-- Submission: store client-side encryption IV and wrapped AES key
-- so the authorised recipient can decrypt the deliverable file
ALTER TABLE "Submission" ADD COLUMN "clientIv"           TEXT;
ALTER TABLE "Submission" ADD COLUMN "clientEncryptedKey" TEXT;
