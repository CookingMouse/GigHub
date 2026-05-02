"use client";

import { useState } from "react";
import { uploadFile, deleteFile, downloadFile, UploadResponse } from "@/lib/uploads-api";

interface FileUploadWidgetProps {
  fileType: "resume" | "deliverable" | "portfolio" | "document";
  maxFileSize?: number; // in MB
  onUploadSuccess?: (file: UploadResponse) => void;
  onUploadError?: (error: Error) => void;
  label?: string;
  description?: string;
  initialFiles?: UploadResponse[];
}

export function FileUploadWidget({
  fileType,
  maxFileSize = 15,
  onUploadSuccess,
  onUploadError,
  label,
  description,
  initialFiles = []
}: FileUploadWidgetProps) {
  const [files, setFiles] = useState<UploadResponse[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileTypeLabel = {
    resume: "Resume",
    deliverable: "Deliverable",
    portfolio: "Portfolio",
    document: "Document"
  }[fileType];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      const err = new Error(`File size must be less than ${maxFileSize}MB`);
      setError(err.message);
      onUploadError?.(err);
      return;
    }

    setIsUploading(true);
    try {
      const uploadedFile = await uploadFile(file, fileType);
      setFiles([...files, uploadedFile]);
      onUploadSuccess?.(uploadedFile);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Upload failed");
      setError(error.message);
      onUploadError?.(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (storageKey: string) => {
    try {
      await deleteFile(storageKey);
      setFiles(files.filter(f => f.storageKey !== storageKey));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Delete failed");
      setError(error.message);
      onUploadError?.(error);
    }
  };

  const handleDownload = async (storageKey: string) => {
    try {
      await downloadFile(storageKey);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Download failed");
      setError(error.message);
      onUploadError?.(error);
    }
  };

  return (
    <div className="space-y-4">
      {label && <label className="block text-sm font-medium text-gray-900">{label}</label>}
      {description && <p className="text-sm text-gray-600">{description}</p>}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${isUploading ? "opacity-50" : ""}`}
      >
        <input
          type="file"
          onChange={handleChange}
          disabled={isUploading}
          className="hidden"
          id={`file-input-${fileType}`}
          accept="*/*"
        />

        <label
          htmlFor={`file-input-${fileType}`}
          className="flex cursor-pointer flex-col items-center justify-center space-y-2 px-6 py-10"
        >
          <svg
            className="h-8 w-8 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v24a4 4 0 004 4h24a4 4 0 004-4V20m-10-10v14m0 0l-4-4m4 4l4-4"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-center">
            <span className="font-medium text-gray-900">
              {isUploading ? "Uploading..." : `Drop ${fileTypeLabel.toLowerCase()} or click to upload`}
            </span>
            <p className="text-xs text-gray-600">Max {maxFileSize}MB</p>
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Uploaded Files</h3>
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.storageKey}
                className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                  <p className="text-xs text-gray-600">
                    {(file.size / 1024).toFixed(2)} KB • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(file.storageKey)}
                    className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 border border-gray-300"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.storageKey)}
                    className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 border border-red-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
