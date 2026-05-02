"use client";

import { webConfig } from "./config";
import { ApiRequestError } from "./api";

export type UploadResponse = {
  success: boolean;
  fileName: string;
  storageKey: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
};

export type DownloadUrlResponse = {
  success: boolean;
  url: string;
  expiresIn: number;
};

/**
 * Upload a file to R2 storage
 * @param file - The file to upload
 * @param fileType - Type of file ("resume", "deliverable", etc.)
 */
export const uploadFile = async (
  file: File,
  fileType: string = "document"
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileType", fileType);

  const response = await fetch(`${webConfig.apiBaseUrl}/api/v1/uploads/upload`, {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const payload = (await response.json().catch(() => null)) as
    | { success: boolean; data: UploadResponse }
    | { error: string; details?: string }
    | null;

  if (!response.ok) {
    const errorPayload = payload as { error: string; details?: string } | null;
    throw new ApiRequestError(
      errorPayload?.error ?? "Upload failed",
      response.status
    );
  }

  return (payload as any).success ? (payload as any) : (payload as any).data;
};

/**
 * Get a pre-signed download URL for a file
 * @param storageKey - The storage key returned from upload
 */
export const getDownloadUrl = async (
  storageKey: string
): Promise<DownloadUrlResponse> => {
  const response = await fetch(
    `${webConfig.apiBaseUrl}/api/v1/uploads/download-url/${encodeURIComponent(storageKey)}`,
    {
      method: "GET",
      credentials: "include"
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | { success: boolean; url: string; expiresIn: number }
    | { error: string; details?: string }
    | null;

  if (!response.ok) {
    const errorPayload = payload as { error: string; details?: string } | null;
    throw new ApiRequestError(
      errorPayload?.error ?? "Failed to get download URL",
      response.status
    );
  }

  return payload as DownloadUrlResponse;
};

/**
 * Delete a file from R2 storage
 * @param storageKey - The storage key of the file to delete
 */
export const deleteFile = async (storageKey: string): Promise<void> => {
  const response = await fetch(
    `${webConfig.apiBaseUrl}/api/v1/uploads/${encodeURIComponent(storageKey)}`,
    {
      method: "DELETE",
      credentials: "include"
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | { success: boolean }
    | { error: string; details?: string }
    | null;

  if (!response.ok) {
    const errorPayload = payload as { error: string; details?: string } | null;
    throw new ApiRequestError(
      errorPayload?.error ?? "Failed to delete file",
      response.status
    );
  }
};

/**
 * Download a file directly
 * @param storageKey - The storage key of the file
 */
export const downloadFile = async (storageKey: string): Promise<void> => {
  try {
    const { url } = await getDownloadUrl(storageKey);
    // Open in new window to trigger download
    window.open(url, "_blank");
  } catch (error) {
    throw new ApiRequestError(
      "Failed to download file",
      500
    );
  }
};
