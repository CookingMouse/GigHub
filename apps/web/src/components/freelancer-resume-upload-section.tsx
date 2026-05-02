"use client";

import { useState } from "react";
import { FileUploadWidget, type UploadResponse } from "./file-upload-widget";

interface FreelancerResumeUploadSectionProps {
  onResumeUploaded?: (resume: UploadResponse) => void;
}

export function FreelancerResumeUploadSection({
  onResumeUploaded
}: FreelancerResumeUploadSectionProps) {
  const [resumeFile, setResumeFile] = useState<UploadResponse | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Resume/CV</h3>
        <p className="text-sm text-gray-600">
          Upload your resume to make it easier for companies to review your qualifications.
          Your resume will be securely stored and can be shared with potential clients.
        </p>
      </div>

      <FileUploadWidget
        fileType="resume"
        maxFileSize={15}
        label="Upload Resume"
        description="PDF, DOC, or DOCX files up to 15MB"
        initialFiles={resumeFile ? [resumeFile] : []}
        onUploadSuccess={(file) => {
          setResumeFile(file);
          onResumeUploaded?.(file);
        }}
        onUploadError={(error) => {
          console.error("Resume upload error:", error);
        }}
      />
    </div>
  );
}
