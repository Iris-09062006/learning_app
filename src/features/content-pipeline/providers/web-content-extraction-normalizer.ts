import "server-only";

import type { DocumentChunkInput } from "@/features/content-pipeline/types";
import {
  MAX_EXTRACTED_CHARACTERS,
  assertUsableDocumentChunks,
  chunkDocumentText,
  normalizeDocumentText,
} from "@/features/content-pipeline/extraction/document-extractor";
import { validateWebUrl } from "@/features/content-pipeline/extraction/web-page-fetcher";
import { canonicalizeResearchUrl } from "@/features/content-pipeline/research/normalize-search-results";
import {
  WebContentExtractionProviderError,
  type NormalizedWebExtractionResult,
  type WebContentExtractionResult,
} from "./web-content-extraction-provider";

export const MIN_WEB_EXTRACTION_CHARACTERS = 80;
export const MAX_WEB_EXTRACTION_CHARACTERS = MAX_EXTRACTED_CHARACTERS;

interface WebContentExtractionNormalizerOptions {
  title?: string | null;
  chunkText?: (text: string) => DocumentChunkInput[];
}

function normalizeCanonicalUrl(value: string): string {
  try {
    const validated = validateWebUrl(value);
    const hostname = validated.hostname.toLowerCase().replace(/\.$/u, "");
    if (hostname === "localhost" || hostname.endsWith(".localhost")
      || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      throw new Error("local hostname");
    }
    const canonical = canonicalizeResearchUrl(validated.toString());
    if (!canonical) throw new Error("invalid canonical URL");
    return canonical;
  } catch {
    throw new WebContentExtractionProviderError(
      "INVALID_CANONICAL_URL",
      "Web extraction provider returned an invalid canonical URL.",
    );
  }
}

function normalizeTitle(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  return normalized || undefined;
}

export function normalizeWebContentExtraction(
  result: WebContentExtractionResult,
  options: WebContentExtractionNormalizerOptions = {},
): NormalizedWebExtractionResult {
  const markdown = normalizeDocumentText(result.rawMarkdown);
  if (markdown.length < MIN_WEB_EXTRACTION_CHARACTERS) {
    throw new WebContentExtractionProviderError(
      "UNUSABLE_CONTENT",
      "The extracted web content is too short to use as evidence.",
    );
  }
  if (markdown.length > MAX_WEB_EXTRACTION_CHARACTERS) {
    throw new WebContentExtractionProviderError(
      "CONTENT_TOO_LARGE",
      "The extracted web content exceeds 200,000 characters.",
    );
  }

  try {
    assertUsableDocumentChunks((options.chunkText ?? chunkDocumentText)(markdown));
  } catch {
    throw new WebContentExtractionProviderError(
      "CHUNKLESS_CONTENT",
      "The extracted web content produced no usable evidence chunks.",
    );
  }

  const title = normalizeTitle(options.title);
  return {
    sourceUrl: result.sourceUrl,
    canonicalUrl: normalizeCanonicalUrl(result.canonicalUrlCandidate),
    ...(title ? { title } : {}),
    markdown,
    normalizedCharacterCount: markdown.length,
    capturedAt: result.capturedAt,
  };
}
