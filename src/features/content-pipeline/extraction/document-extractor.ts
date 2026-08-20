import "server-only";

import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { createHash } from "node:crypto";
import mammoth from "mammoth";

import type {
  DocumentChunkInput,
  SupportedSourceMimeType,
} from "@/features/content-pipeline/types";

export const MAX_EXTRACTED_CHARACTERS = 200_000;
const MAX_CHUNK_CHARACTERS = 4_000;
const MAX_LOGGED_ERROR_CHARACTERS = 500;

export class DocumentExtractionError extends Error {
  constructor(
    public readonly code:
      | "UNSUPPORTED_MIME_TYPE"
      | "EMPTY_DOCUMENT"
      | "DOCUMENT_TOO_LARGE"
      | "EXTRACTION_FAILED",
    message: string
  ) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

export function normalizeDocumentText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function summarizeExtractionError(error: unknown) {
  const normalize = (value: string) => value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .slice(0, MAX_LOGGED_ERROR_CHARACTERS);

  return error instanceof Error
    ? { errorName: normalize(error.name), errorMessage: normalize(error.message) }
    : { errorName: "NonErrorThrown", errorMessage: "No Error object was provided." };
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdfjs-dist attempts to resolve these globals through a runtime-computed
  // require("@napi-rs/canvas"). Import the native package explicitly so Next's
  // file tracer includes it, then install the globals before pdf-parse loads.
  if (typeof globalThis.DOMMatrix === "undefined") {
    Object.defineProperty(globalThis, "DOMMatrix", { value: DOMMatrix, configurable: true });
  }
  if (typeof globalThis.ImageData === "undefined") {
    Object.defineProperty(globalThis, "ImageData", { value: ImageData, configurable: true });
  }
  if (typeof globalThis.Path2D === "undefined") {
    Object.defineProperty(globalThis, "Path2D", { value: Path2D, configurable: true });
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function extractDocumentText(
  buffer: Buffer,
  mimeType: SupportedSourceMimeType
): Promise<string> {
  let extracted: string;

  try {
    if (mimeType === "text/plain" || mimeType === "text/markdown") {
      extracted = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } else if (mimeType === "application/pdf") {
      extracted = await extractPdf(buffer);
    } else if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      extracted = (await mammoth.extractRawText({ buffer })).value;
    } else {
      throw new DocumentExtractionError(
        "UNSUPPORTED_MIME_TYPE",
        "This document type is not supported."
      );
    }
  } catch (error: unknown) {
    if (error instanceof DocumentExtractionError) {
      throw error;
    }
    console.error("[content-pipeline] Document extraction failed.", {
      mimeType,
      ...summarizeExtractionError(error),
    });
    throw new DocumentExtractionError(
      "EXTRACTION_FAILED",
      "The document could not be parsed safely."
    );
  }

  const normalized = normalizeDocumentText(extracted);
  if (!normalized) {
    throw new DocumentExtractionError(
      "EMPTY_DOCUMENT",
      "The document does not contain extractable text."
    );
  }
  if (normalized.length > MAX_EXTRACTED_CHARACTERS) {
    throw new DocumentExtractionError(
      "DOCUMENT_TOO_LARGE",
      "The extracted document exceeds 200,000 characters."
    );
  }
  return normalized;
}

export function chunkDocumentText(text: string): DocumentChunkInput[] {
  const paragraphs = text.split(/\n{2,}/).map((value) => value.trim()).filter(Boolean);
  const chunks: DocumentChunkInput[] = [];
  let cursor = 0;
  let current = "";
  let currentStart = 0;

  const pushCurrent = () => {
    if (!current) return;
    const content = current.trim();
    const startOffset = text.indexOf(content, currentStart);
    const safeStart = startOffset >= 0 ? startOffset : currentStart;
    chunks.push({
      chunkIndex: chunks.length,
      content,
      startOffset: safeStart,
      endOffset: safeStart + content.length,
      contentHash: createHash("sha256").update(content).digest("hex"),
    });
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > MAX_CHUNK_CHARACTERS) {
      pushCurrent();
      for (let offset = 0; offset < paragraph.length; offset += MAX_CHUNK_CHARACTERS) {
        const content = paragraph.slice(offset, offset + MAX_CHUNK_CHARACTERS);
        const startOffset = text.indexOf(content, cursor);
        const safeStart = startOffset >= 0 ? startOffset : cursor;
        chunks.push({
          chunkIndex: chunks.length,
          content,
          startOffset: safeStart,
          endOffset: safeStart + content.length,
          contentHash: createHash("sha256").update(content).digest("hex"),
        });
        cursor = safeStart + content.length;
      }
      currentStart = cursor;
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > MAX_CHUNK_CHARACTERS) {
      pushCurrent();
      currentStart = text.indexOf(paragraph, cursor);
      current = paragraph;
    } else {
      if (!current) currentStart = text.indexOf(paragraph, cursor);
      current = candidate;
    }
    cursor = Math.max(cursor, currentStart + current.length);
  }
  pushCurrent();
  return chunks;
}

export function assertUsableDocumentChunks(chunks: DocumentChunkInput[]): DocumentChunkInput[] {
  if (!chunks.some((chunk) => chunk.content.trim().length > 0)) {
    throw new DocumentExtractionError(
      "EMPTY_DOCUMENT",
      "The document produced no usable evidence chunks.",
    );
  }
  return chunks;
}
