export interface WebContentExtractionRequest {
  sourceUrl: string;
  capturedAt: string;
}

export interface WebContentExtractionResult {
  sourceUrl: string;
  canonicalUrlCandidate: string;
  rawMarkdown: string;
  capturedAt: string;
}

export interface NormalizedWebExtractionResult {
  sourceUrl: string;
  canonicalUrl: string;
  title?: string;
  markdown: string;
  normalizedCharacterCount: number;
  capturedAt: string;
}

export interface WebContentExtractionProvider {
  extract(request: WebContentExtractionRequest): Promise<WebContentExtractionResult>;
}

export type WebContentExtractionProviderErrorCode =
  | "CONFIGURATION"
  | "AUTHENTICATION"
  | "QUOTA"
  | "TIMEOUT"
  | "UPSTREAM"
  | "FAILED_RESULT"
  | "INVALID_RESPONSE"
  | "INVALID_CANONICAL_URL"
  | "UNUSABLE_CONTENT"
  | "CONTENT_TOO_LARGE"
  | "CHUNKLESS_CONTENT";

export class WebContentExtractionProviderError extends Error {
  readonly recoverable = true;

  constructor(
    public readonly code: WebContentExtractionProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WebContentExtractionProviderError";
  }
}
