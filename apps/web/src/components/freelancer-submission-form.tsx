"use client";

import React from "react";

type FreelancerSubmissionFormProps = {
  disabled?: boolean;
  errorMessage?: string | null;
  file: File | null;
  isSubmitting: boolean;
  notes: string;
  onFileChange: (file: File | null) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export const FreelancerSubmissionForm = ({
  disabled = false,
  errorMessage,
  file,
  isSubmitting,
  notes,
  onFileChange,
  onNotesChange,
  onSubmit
}: FreelancerSubmissionFormProps) => {
  return (
    <form className="job-form" onSubmit={onSubmit}>
      <label className="field" htmlFor="submission-file">
        <span>Submission file</span>
        <input
          accept=".pdf,.docx,.png,.jpg,.jpeg,.zip"
          disabled={disabled || isSubmitting}
          id="submission-file"
          name="file"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          type="file"
        />
      </label>

      <label className="field" htmlFor="submission-notes">
        <span>Submission notes</span>
        <textarea
          disabled={disabled || isSubmitting}
          id="submission-notes"
          name="notes"
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Add delivery notes, implementation caveats, or revision context for this milestone."
          value={notes}
        />
      </label>

      <p className="helper-copy">
        Supported formats: PDF, DOCX, PNG, JPG, and ZIP. GigHub stores the uploaded file in the
        confidential storage mode and only later exposes metadata and hash evidence to GLM.
      </p>

      {file ? <p className="helper-copy">Selected file: {file.name}</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="job-form-actions">
        <button className="button-primary" disabled={disabled || isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit milestone"}
        </button>
      </div>
    </form>
  );
};
