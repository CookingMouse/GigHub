import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
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

// Convert a Node Buffer to a properly-sliced Uint8Array view of just its bytes.
// Node Buffers are pooled, so a naive `new Uint8Array(buffer)` may include other Buffers' bytes.
const toTypedArray = (buffer: Buffer): Uint8Array =>
  new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

const safeExtractPdfWordCount = async (fileBuffer: Buffer): Promise<number | null> => {
  try {
    const parser = new PDFParse({ data: toTypedArray(fileBuffer) });
    const result = await parser.getText();
    return countWords(result.text ?? "");
  } catch (error) {
    console.warn("PDF word-count extraction failed (continuing without it):", error);
    return null;
  }
};

const safeExtractDocxWordCount = async (fileBuffer: Buffer): Promise<number | null> => {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return countWords(result.value ?? "");
  } catch (error) {
    console.warn("DOCX word-count extraction failed (continuing without it):", error);
    return null;
  }
};

const safeExtractImageDimensions = async (fileBuffer: Buffer): Promise<string | null> => {
  try {
    const metadata = await sharp(fileBuffer).metadata();
    return typeof metadata.width === "number" && typeof metadata.height === "number"
      ? `${metadata.width}x${metadata.height}`
      : null;
  } catch (error) {
    console.warn("Image dimension extraction failed (continuing without it):", error);
    return null;
  }
};

export const extractFileMetadata = async (
  fileBuffer: Buffer,
  fileName: string
): Promise<FileMetadataResult> => {
  const format = detectSubmissionFormat(fileName);

  if (format === "pdf") {
    return { format, wordCount: await safeExtractPdfWordCount(fileBuffer), dimensions: null };
  }

  if (format === "docx") {
    return { format, wordCount: await safeExtractDocxWordCount(fileBuffer), dimensions: null };
  }

  if (format === "png" || format === "jpg") {
    return { format, wordCount: null, dimensions: await safeExtractImageDimensions(fileBuffer) };
  }

  return { format, wordCount: null, dimensions: null };
};
