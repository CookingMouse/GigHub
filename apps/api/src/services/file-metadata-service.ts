import path from "path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import sharp from "sharp";
import type { SupportedSubmissionFormat } from "@gighub/shared";
import { supportedSubmissionFormats } from "@gighub/shared";
import { HttpError } from "../lib/http-error";

type FileMetadataResult = {
  format: SupportedSubmissionFormat;
  wordCount: number | null;
  dimensions: string | null;
};

const supportedFormatSet = new Set<string>(supportedSubmissionFormats);

const countWords = (value: string) => {
  const normalized = value.trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
};

export const detectSubmissionFormat = (fileName: string): SupportedSubmissionFormat => {
  const normalizedExtension = path.extname(fileName).toLowerCase().replace(/^\./, "");
  const format = normalizedExtension === "jpeg" ? "jpg" : normalizedExtension;

  if (!supportedFormatSet.has(format)) {
    throw new HttpError(
      400,
      "SUBMISSION_FORMAT_UNSUPPORTED",
      "Only PDF, DOCX, PNG, JPG, and ZIP files are supported in this phase."
    );
  }

  return format as SupportedSubmissionFormat;
};

export const extractFileMetadata = async (
  fileBuffer: Buffer,
  fileName: string
): Promise<FileMetadataResult> => {
  const format = detectSubmissionFormat(fileName);

  try {
    if (format === "pdf") {
      // Ensure we have a proper Buffer or Uint8Array
      const data = await pdfParse(Buffer.from(fileBuffer));

      return {
        format,
        wordCount: countWords(data.text ?? ""),
        dimensions: null
      };
    }

    if (format === "docx") {
      const result = await mammoth.extractRawText({
        buffer: fileBuffer
      });

      return {
        format,
        wordCount: countWords(result.value ?? ""),
        dimensions: null
      };
    }

    if (format === "png" || format === "jpg") {
      const metadata = await sharp(fileBuffer).metadata();
      const dimensions =
        typeof metadata.width === "number" && typeof metadata.height === "number"
          ? `${metadata.width}x${metadata.height}`
          : null;

      return {
        format,
        wordCount: null,
        dimensions
      };
    }

    return {
      format,
      wordCount: null,
      dimensions: null
    };
  } catch (error) {
    console.error("Metadata extraction failed:", error);
    throw new HttpError(
      400,
      "SUBMISSION_METADATA_EXTRACTION_FAILED",
      `GigHub could not read the uploaded ${format.toUpperCase()} file metadata. Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
