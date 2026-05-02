"use client";

import { useState } from "react";
import { FileUploadWidget, type UploadResponse } from "./file-upload-widget";

interface DeliverableUploadSectionProps {
  milestoneId: string;
  onDeliverableUploaded?: (deliverable: UploadResponse) => void;
  onUploadError?: (error: Error) => void;
}

export function DeliverableUploadSection({
  milestoneId,
  onDeliverableUploaded,
  onUploadError
}: DeliverableUploadSectionProps) {
  const [deliverables, setDeliverables] = useState<UploadResponse[]>([]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Submit Deliverables</h3>
        <p className="text-sm text-gray-600">
          Upload your completed work files. Companies will be able to download and review them.
          You can upload multiple files for this milestone.
        </p>
      </div>

      <FileUploadWidget
        fileType="deliverable"
        maxFileSize={15}
        label="Upload Deliverable Files"
        description="Upload any file type. Max 15MB per file"
        initialFiles={deliverables}
        onUploadSuccess={(file) => {
          setDeliverables([...deliverables, file]);
          onDeliverableUploaded?.(file);
        }}
        onUploadError={(error) => {
          onUploadError?.(error);
        }}
      />

      {deliverables.length > 0 && (
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-medium">
            {deliverables.length} file{deliverables.length !== 1 ? "s" : ""} uploaded for review
          </p>
        </div>
      )}
    </div>
  );
}
