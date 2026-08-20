// @vitest-environment node

import { describe, expect, it } from "vitest";

import { chunkDocumentText } from "@/features/content-pipeline/extraction/document-extractor";
import {
  hashWebSnapshot,
  serializeNormalizedWebExtractionSnapshot,
} from "@/features/content-pipeline/extraction/web-snapshot";
import { TavilyWebContentExtractionProvider } from "./tavily-web-content-extraction-provider";
import { normalizeWebContentExtraction } from "./web-content-extraction-normalizer";

const SOURCE_URL = "https://example.com";
const liveSmokeEnabled = process.env.TAVILY_EXTRACT_SMOKE === "1"
  && Boolean(process.env.TAVILY_API_KEY?.trim());

describe("Tavily live smoke runtime", () => {
  it("uses a Node-native AbortSignal accepted by the server fetch implementation", () => {
    const signal = AbortSignal.timeout(10_000);

    expect(() => new Request("data:application/json,%7B%7D", { signal })).not.toThrow();
  });
});

describe.skipIf(!liveSmokeEnabled)("Tavily Basic Extract live smoke", () => {
  it("prepares deterministic provider-independent evidence with exactly one real call", async () => {
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    expect(apiKey).toBeTruthy();

    let callCount = 0;
    let requestBody: Record<string, unknown> | undefined;
    let observedHttpStatus: number | undefined;
    let transportFailure: { name: string; code?: string } | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      callCount += 1;
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      try {
        const response = await fetch(input, init);
        observedHttpStatus = response.status;
        return response;
      } catch (error) {
        const cause = error instanceof Error && error.cause && typeof error.cause === "object"
          ? error.cause as Record<string, unknown>
          : undefined;
        transportFailure = {
          name: error instanceof Error ? error.name : "NonErrorThrown",
          ...(typeof cause?.code === "string" ? { code: cause.code } : {}),
        };
        throw error;
      }
    };
    const capturedAt = new Date().toISOString();
    const provider = new TavilyWebContentExtractionProvider({ apiKey, fetchImpl });
    const startedAt = Date.now();

    const extracted = await provider.extract({ sourceUrl: SOURCE_URL, capturedAt }).catch((error) => {
      console.error("TAVILY_SMOKE_FAILURE", {
        realExtractCalls: callCount,
        providerCategory: error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "UNKNOWN",
        observedHttpStatus: observedHttpStatus ?? null,
        transportFailure: transportFailure ?? null,
        elapsedMs: Date.now() - startedAt,
      });
      throw error;
    });
    expect(callCount).toBe(1);
    const actualRequestBody = requestBody;
    if (!actualRequestBody) throw new Error("The live extraction request was not captured.");
    expect(actualRequestBody).toEqual({
      urls: SOURCE_URL,
      extract_depth: "basic",
      format: "markdown",
      include_images: false,
      include_favicon: false,
      timeout: 10,
    });
    expect(actualRequestBody).not.toHaveProperty("query");
    expect(actualRequestBody).not.toHaveProperty("chunks_per_source");
    expect(Object.keys(extracted).sort()).toEqual([
      "canonicalUrlCandidate",
      "capturedAt",
      "rawMarkdown",
      "sourceUrl",
    ]);

    const normalized = normalizeWebContentExtraction(extracted, { title: "Example Domain" });
    expect(normalized.sourceUrl).toBe(SOURCE_URL);
    expect(normalized.canonicalUrl).toMatch(/^https:\/\/example\.com\/?$/u);
    expect(normalized.normalizedCharacterCount).toBeGreaterThanOrEqual(80);
    expect(normalized.normalizedCharacterCount).toBeLessThanOrEqual(200_000);

    const snapshot = serializeNormalizedWebExtractionSnapshot({
      ...normalized,
      title: normalized.title ?? "Example Domain",
    });
    const repeatedSnapshot = serializeNormalizedWebExtractionSnapshot({
      ...normalized,
      title: normalized.title ?? "Example Domain",
    });
    const chunks = chunkDocumentText(normalized.markdown);
    expect(repeatedSnapshot).toBe(snapshot);
    expect(hashWebSnapshot(repeatedSnapshot)).toBe(hashWebSnapshot(snapshot));
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify({ extracted, normalized: {
      ...normalized,
      markdown: undefined,
    }, requestBody: actualRequestBody })).not.toContain(apiKey);

    console.info("TAVILY_SMOKE_METRICS", {
      url: SOURCE_URL,
      realExtractCalls: callCount,
      extractDepth: actualRequestBody.extract_depth,
      format: actualRequestBody.format,
      canonicalUrl: normalized.canonicalUrl,
      normalizedCharacterCount: normalized.normalizedCharacterCount,
      snapshotCharacterCount: snapshot.length,
      snapshotHash: hashWebSnapshot(snapshot),
      usableChunkCount: chunks.length,
      persistedExternalState: false,
      elapsedMs: Date.now() - startedAt,
    });
  });
});
