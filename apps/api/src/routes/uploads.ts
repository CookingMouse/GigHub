import type { Request } from "express";
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

interface AuthRequest extends Request {
  auth?: { userId: string; role: "freelancer" | "company" | "admin"; sessionId?: string };
  file?: Express.Multer.File;
}

// Upload resume or deliverable
uploadsRouter.post(
  "/upload",
  requireAuth,
  submissionUpload.single("file"),
  asyncHandler(async (request: AuthRequest, response): Promise<void> => {
    if (!request.file) {
      response.status(400).json({
        error: "No file provided"
      });
      return;
    }

    if (env.STORAGE_PROVIDER !== "r2") {
      response.status(503).json({
        error: "File storage is not configured for R2"
      });
      return;
    }

    try {
      const userId = request.auth?.userId;
      if (!userId) {
        response.status(401).json({
          error: "Authentication required"
        });
        return;
      }

      const fileType = (request.body?.fileType as string) || "document";
      const extension = request.file.originalname.split('.').pop() || "bin";
      const fileName = `${fileType}-${Date.now()}-${randomUUID()}.${extension}`;
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
  asyncHandler(async (request: AuthRequest, response): Promise<void> => {
    const storageKey = request.params.storageKey as string;

    if (!storageKey) {
      response.status(400).json({
        error: "Storage key is required"
      });
      return;
    }

    if (env.STORAGE_PROVIDER !== "r2") {
      response.status(503).json({
        error: "File storage is not configured for R2"
      });
      return;
    }

    try {
      const userId = request.auth?.userId;
      if (!userId) {
        response.status(401).json({
          error: "Authentication required"
        });
        return;
      }

      // Verify user owns this file (basic check)
      if (!storageKey.startsWith(`user-uploads/${userId}/`)) {
        response.status(403).json({
          error: "You don't have permission to access this file"
        });
        return;
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
  asyncHandler(async (request: AuthRequest, response): Promise<void> => {
    const storageKey = request.params.storageKey as string;

    if (!storageKey) {
      response.status(400).json({
        error: "Storage key is required"
      });
      return;
    }

    if (env.STORAGE_PROVIDER !== "r2") {
      response.status(503).json({
        error: "File storage is not configured for R2"
      });
      return;
    }

    try {
      const userId = request.auth?.userId;
      if (!userId) {
        response.status(401).json({
          error: "Authentication required"
        });
        return;
      }

      // Verify user owns this file
      if (!storageKey.startsWith(`user-uploads/${userId}/`)) {
        response.status(403).json({
          error: "You don't have permission to delete this file"
        });
        return;
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
