import { describe, expect, it } from "vitest";

import {
  WebContentExtractionProviderError,
  type NormalizedWebExtractionResult,
  type WebContentExtractionProvider,
  type WebContentExtractionRequest,
  type WebContentExtractionResult,
} from "./web-content-extraction-provider";

describe("web content extraction provider contract", () => {
  it("keeps adapter and normalized application results distinct and provider-neutral", async () => {
    const request: WebContentExtractionRequest = {
      sourceUrl: "https://example.com/selected",
      capturedAt: "2026-08-14T00:00:00.000Z",
    };
    const adapterResult: WebContentExtractionResult = {
      sourceUrl: request.sourceUrl,
      canonicalUrlCandidate: "https://example.com/final",
      rawMarkdown: "# Evidence",
      capturedAt: request.capturedAt,
    };
    const provider: WebContentExtractionProvider = { extract: async () => adapterResult };
    const normalized: NormalizedWebExtractionResult = {
      sourceUrl: request.sourceUrl,
      canonicalUrl: "https://example.com/final",
      title: "Evidence",
      markdown: "# Evidence",
      normalizedCharacterCount: 10,
      capturedAt: request.capturedAt,
    };

    await expect(provider.extract(request)).resolves.toEqual(adapterResult);
    expect(Object.keys(normalized)).toEqual([
      "sourceUrl", "canonicalUrl", "title", "markdown", "normalizedCharacterCount", "capturedAt",
    ]);
    expect(Object.keys(adapterResult)).toEqual([
      "sourceUrl", "canonicalUrlCandidate", "rawMarkdown", "capturedAt",
    ]);
  });

  it.each([
    "CONFIGURATION", "AUTHENTICATION", "QUOTA", "TIMEOUT", "UPSTREAM",
    "FAILED_RESULT", "INVALID_RESPONSE", "INVALID_CANONICAL_URL",
    "UNUSABLE_CONTENT", "CONTENT_TOO_LARGE", "CHUNKLESS_CONTENT",
  ] as const)("exposes stable recoverable category %s", (code) => {
    const error = new WebContentExtractionProviderError(code, "safe message");
    expect(error).toMatchObject({ name: "WebContentExtractionProviderError", code, recoverable: true });
  });
});
