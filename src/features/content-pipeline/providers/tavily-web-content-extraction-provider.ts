import "server-only";

import {
  WebContentExtractionProviderError,
  type WebContentExtractionProvider,
  type WebContentExtractionRequest,
  type WebContentExtractionResult,
} from "./web-content-extraction-provider";

const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const TAVILY_EXTRACT_TIMEOUT_MS = 10_000;
const TAVILY_EXTRACT_TIMEOUT_SECONDS = 10;

interface TavilyExtractProviderOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isFailedResult(value: unknown): boolean {
  const item = asRecord(value);
  return Boolean(item && typeof item.url === "string" && item.url.trim()
    && typeof item.error === "string" && item.error.trim());
}

function parseResponse(
  value: unknown,
  request: WebContentExtractionRequest,
): WebContentExtractionResult {
  const root = asRecord(value);
  if (!root || !Array.isArray(root.results) || !Array.isArray(root.failed_results)
    || !root.failed_results.every(isFailedResult)) {
    throw new WebContentExtractionProviderError(
      "INVALID_RESPONSE",
      "Web extraction provider returned an invalid response.",
    );
  }

  if (root.results.length === 0 && root.failed_results.length === 1) {
    throw new WebContentExtractionProviderError(
      "FAILED_RESULT",
      "Web extraction provider could not extract this source.",
    );
  }
  if (root.results.length !== 1 || root.failed_results.length !== 0) {
    throw new WebContentExtractionProviderError(
      "INVALID_RESPONSE",
      "Web extraction provider returned an invalid result set.",
    );
  }

  const result = asRecord(root.results[0]);
  if (!result || typeof result.url !== "string" || !result.url.trim()
    || typeof result.raw_content !== "string") {
    throw new WebContentExtractionProviderError(
      "INVALID_RESPONSE",
      "Web extraction provider returned an invalid result.",
    );
  }

  return {
    sourceUrl: request.sourceUrl,
    canonicalUrlCandidate: result.url,
    rawMarkdown: result.raw_content,
    capturedAt: request.capturedAt,
  };
}

export class TavilyWebContentExtractionProvider implements WebContentExtractionProvider {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: TavilyExtractProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.TAVILY_API_KEY ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? TAVILY_EXTRACT_TIMEOUT_MS;
  }

  async extract(request: WebContentExtractionRequest): Promise<WebContentExtractionResult> {
    if (!this.apiKey) {
      throw new WebContentExtractionProviderError(
        "CONFIGURATION",
        "Web extraction provider credentials are unavailable.",
      );
    }

    try {
      const response = await this.fetchImpl(TAVILY_EXTRACT_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls: request.sourceUrl,
          extract_depth: "basic",
          format: "markdown",
          include_images: false,
          include_favicon: false,
          timeout: TAVILY_EXTRACT_TIMEOUT_SECONDS,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (response.status === 401 || response.status === 403) {
        throw new WebContentExtractionProviderError(
          "AUTHENTICATION",
          "Web extraction provider authentication failed.",
        );
      }
      if (response.status === 429 || response.status === 432 || response.status === 433) {
        throw new WebContentExtractionProviderError(
          "QUOTA",
          "Web extraction provider capacity is unavailable.",
        );
      }
      if (response.status === 408 || response.status === 504) {
        throw new WebContentExtractionProviderError("TIMEOUT", "Web extraction provider timed out.");
      }
      if (!response.ok) {
        throw new WebContentExtractionProviderError(
          "UPSTREAM",
          "Web extraction provider request failed.",
        );
      }

      return parseResponse(await response.json(), request);
    } catch (error) {
      if (error instanceof WebContentExtractionProviderError) throw error;
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new WebContentExtractionProviderError("TIMEOUT", "Web extraction provider timed out.");
      }
      if (error instanceof SyntaxError) {
        throw new WebContentExtractionProviderError(
          "INVALID_RESPONSE",
          "Web extraction provider returned malformed JSON.",
        );
      }
      throw new WebContentExtractionProviderError(
        "UPSTREAM",
        "Web extraction provider request failed.",
      );
    }
  }
}
