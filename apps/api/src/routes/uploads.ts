import { Router } from "express";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../lib/env";
import { asyncHandler } from "../lib/async-handler";
import { submissionUpload } from "../lib/upload";
import { requireAuth } from "../middleware/auth";
import { randomUUID } from "crypto";

export const uploadsRouter = Router();

// Initialize S3 client for R2
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

// Upload resume or deliverable
uploadsRouter.post(
  "/upload",
  requireAuth,
  submissionUpload.single("file"),
  asyncHandler(async (request, response) => {
    if (!request.file) {
      return response.status(400).json({
        error: "No file provided"
      });
    }

    if (env.STORAGE_PROVIDER !== "r2") {
      return response.status(503).json({
        error: "File storage is not configured for R2"
      });
    }

    try {
      const userId = request.auth.id;
      const fileType = request.body.fileType || "document"; // "resume", "deliverable", etc.
      const fileName = `${fileType}-${Date.now()}-${randomUUID()}.${request.file.originalname.split('.').pop()}`;
      const storageKey = `user-uploads/${userId}/${fileType}/${fileName}`;

      console.log(`Uploading file to R2 at: ${storageKey}`);

      // Upload to R2
      await s3Client!.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET!,
        Key: storageKey,
        Body: request.file.buffer,
        ContentType: request.file.mimetype
      }));

      response.json({
        success: true,
        fileName: request.file.originalname,
        storageKey: storageKey,
        size: request.file.size,
        mimetype: request.file.mimetype,
        uploadedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Upload error:", error);
      response.status(500).json({
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

// Generate download URL (pre-signed URL valid for 1 hour)
uploadsRouter.get(
  "/download-url/:storageKey",
  requireAuth,
  asyncHandler(async (request, response) => {
    const storageKey = request.params.storageKey;

    if (!storageKey) {
      return response.status(400).json({
        error: "Storage key is required"
      });
    }

    if (env.STORAGE_PROVIDER !== "r2") {
      return response.status(503).json({
        error: "File storage is not configured for R2"
      });
    }

    try {
      // Verify user owns this file (basic check)
      const userId = request.auth.id;
      if (!storageKey.startsWith(`user-uploads/${userId}/`)) {
        return response.status(403).json({
          error: "You don't have permission to access this file"
        });
      }

      // Generate pre-signed URL
      const command = new GetObjectCommand({
        Bucket: env.R2_BUCKET!,
        Key: storageKey
      });

      const url = await getSignedUrl(s3Client!, command, { expiresIn: 3600 });

      response.json({
        success: true,
        url: url,
        expiresIn: 3600
      });
    } catch (error) {
      console.error("Download URL generation error:", error);
      response.status(500).json({
        error: "Failed to generate download URL",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

// Delete file (cleanup)
uploadsRouter.delete(
  "/:storageKey",
  requireAuth,
  asyncHandler(async (request, response) => {
    const storageKey = request.params.storageKey;

    if (!storageKey) {
      return response.status(400).json({
        error: "Storage key is required"
      });
    }

    if (env.STORAGE_PROVIDER !== "r2") {
      return response.status(503).json({
        error: "File storage is not configured for R2"
      });
    }

    try {
      // Verify user owns this file
      const userId = request.auth.id;
      if (!storageKey.startsWith(`user-uploads/${userId}/`)) {
        return response.status(403).json({
          error: "You don't have permission to delete this file"
        });
      }

      await s3Client!.send(new DeleteObjectCommand({
        Bucket: env.R2_BUCKET!,
        Key: storageKey
      }));

      response.json({
        success: true,
        message: "File deleted successfully"
      });
    } catch (error) {
      console.error("Delete error:", error);
      response.status(500).json({
        error: "Failed to delete file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);
