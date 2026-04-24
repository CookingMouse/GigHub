import pdf from "pdf-parse";
import mammoth from "mammoth";

export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return "";
  }
};

export const extractTextFromDocx = async (buffer: Buffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    return "";
  }
};

export const extractTextFromFile = async (buffer: Buffer, originalName: string): Promise<string> => {
  const extension = originalName.split(".").pop()?.toLowerCase();

  if (extension === "pdf") {
    return extractTextFromPdf(buffer);
  }

  if (extension === "docx") {
    return extractTextFromDocx(buffer);
  }

  return "";
};
