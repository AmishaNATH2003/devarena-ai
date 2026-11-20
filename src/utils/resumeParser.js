
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const MAX_RESUME_CHARS = 12000;

// Clean extracted resume text.
function normalizeText(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Extract text from PDF resumes.
async function extractPdfText(file) {
  const pdfjs = await import("pdfjs-dist");

  // Configure the PDF.js worker for Vite.
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(
    await file.arrayBuffer()
  );

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  });

  let pdfDocument;

  try {
    pdfDocument = await loadingTask.promise;

    if (pdfDocument.numPages > MAX_PDF_PAGES) {
      throw new Error(
        `PDF must have no more than ${MAX_PDF_PAGES} pages.`
      );
    }

    const pages = [];

    for (
      let pageNumber = 1;
      pageNumber <= pdfDocument.numPages;
      pageNumber++
    ) {
      const page = await pdfDocument.getPage(pageNumber);

      try {
        const content = await page.getTextContent();

        const pageText = content.items
          .map((item) => {
            if (typeof item.str !== "string") {
              return "";
            }

            return (
              item.str +
              (item.hasEOL ? "\n" : " ")
            );
          })
          .join("");

        pages.push(pageText);
      } finally {
        // Different PDF.js objects may expose
        // different cleanup methods.
        if (typeof page.cleanup === "function") {
          page.cleanup();
        }
      }
    }

    return pages.join("\n\n");
  } finally {
    // Avoid throwing a new error during cleanup,
    // which could hide an extraction result/error.
    try {
      if (
        pdfDocument &&
        typeof pdfDocument.destroy === "function"
      ) {
        await pdfDocument.destroy();
      } else if (
        typeof loadingTask.destroy === "function"
      ) {
        await loadingTask.destroy();
      }
    } catch (cleanupError) {
      console.warn(
        "PDF document cleanup failed:",
        cleanupError
      );
    }
  }
}

// Extract text from DOCX resumes.
async function extractDocxText(file) {
  const module = await import(
    "mammoth/mammoth.browser"
  );

  const mammoth = module.default || module;

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({
    arrayBuffer,
  });

  return result.value || "";
}

// Validate and extract resume contents.
export async function parseResume(file) {
  if (!file) {
    throw new Error(
      "Please select a resume."
    );
  }

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  // Support PDF and DOCX.
  if (!["pdf", "docx"].includes(extension)) {
    throw new Error(
      "Only PDF and DOCX resumes are supported."
    );
  }

  // Reject empty files.
  if (file.size === 0) {
    throw new Error(
      "The selected file is empty."
    );
  }

  // Maximum size: 5 MB.
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Resume file must be smaller than 5 MB."
    );
  }

  // Validate the file signature.
  const signature = new Uint8Array(
    await file.slice(0, 5).arrayBuffer()
  );

  // PDF magic bytes: %PDF-
  const isPdf =
    signature[0] === 0x25 &&
    signature[1] === 0x50 &&
    signature[2] === 0x44 &&
    signature[3] === 0x46 &&
    signature[4] === 0x2d;

  // DOCX is a ZIP-based format.
  const isZip =
    signature[0] === 0x50 &&
    signature[1] === 0x4b &&
    [0x03, 0x05, 0x07].includes(signature[2]) &&
    [0x04, 0x06, 0x08].includes(signature[3]);

  if (
    (extension === "pdf" && !isPdf) ||
    (extension === "docx" && !isZip)
  ) {
    throw new Error(
      "The file content does not match its extension."
    );
  }

  let extractedText;

  try {
    if (extension === "pdf") {
      extractedText = await extractPdfText(file);
    } else {
      extractedText = await extractDocxText(file);
    }
  } catch (error) {
    // Preserve the specific PDF page-limit error.
    if (
      error.message?.includes("no more than")
    ) {
      throw error;
    }

    // Useful during local development.
    // Avoid logging resume content.
    console.error(
      "Resume parsing failed:",
      error
    );

    throw new Error(
      "Could not read the resume. Please try another PDF or DOCX file.",
      { cause: error }
    );
  }

  const text = normalizeText(extractedText);

  // Detect empty or image-only documents.
  if (text.length < 50) {
    throw new Error(
      "No readable resume text was found. Scanned or image-only PDFs are not supported yet."
    );
  }

  return {
    fileName: file.name,
    text: text.slice(0, MAX_RESUME_CHARS),
    truncated: text.length > MAX_RESUME_CHARS,
    characterCount: text.length,
  };
}
