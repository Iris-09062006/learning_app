import { describe, expect, it, vi } from "vitest";

import { normalizeWebContentExtraction } from "./web-content-extraction-normalizer";

const capturedAt = "2026-08-14T00:00:00.000Z";

function result(rawMarkdown: string, canonicalUrlCandidate = "https://EXAMPLE.com:443/guide#part") {
  return {
    sourceUrl: "https://example.com/selected",
    canonicalUrlCandidate,
    rawMarkdown,
    capturedAt,
  };
}

describe("normalizeWebContentExtraction", () => {
  it.each(["", "   \n\t ", "\u0000\n\r\t"])("rejects empty normalized content %#", (content) => {
    expect(() => normalizeWebContentExtraction(result(content))).toThrowError(expect.objectContaining({
      code: "UNUSABLE_CONTENT",
    }));
  });

  it("locks the normalized 79/80 and 200000/200001 character boundaries", () => {
    expect(() => normalizeWebContentExtraction(result("a".repeat(79)))).toThrowError(expect.objectContaining({
      code: "UNUSABLE_CONTENT",
    }));
    expect(normalizeWebContentExtraction(result("a".repeat(80))).normalizedCharacterCount).toBe(80);
    expect(normalizeWebContentExtraction(result("a".repeat(200_000))).normalizedCharacterCount).toBe(200_000);
    expect(() => normalizeWebContentExtraction(result("a".repeat(200_001)))).toThrowError(expect.objectContaining({
      code: "CONTENT_TOO_LARGE",
    }));
  });

  it("measures normalized Markdown before snapshot metadata and preserves Markdown", () => {
    const markdown = `# Heading\r\n\r\n${"a".repeat(80)}\r\n\r\n`;
    const normalized = normalizeWebContentExtraction(result(markdown), { title: "  Evidence  " });
    expect(normalized).toEqual({
      sourceUrl: "https://example.com/selected",
      canonicalUrl: "https://example.com/guide",
      title: "Evidence",
      markdown: `# Heading\n\n${"a".repeat(80)}`,
      normalizedCharacterCount: 91,
      capturedAt,
    });
  });

  it("accepts a valid differing origin and rejects invalid final URL candidates", () => {
    expect(normalizeWebContentExtraction(result("a".repeat(80), "https://other.example/final")).canonicalUrl)
      .toBe("https://other.example/final");
    for (const candidate of [
      "javascript:alert(1)", "ftp://example.com/file", "https://user:pass@example.com/",
      "http://127.0.0.1/", "http://[::1]/", "http://localhost/", "not a url",
    ]) {
      expect(() => normalizeWebContentExtraction(result("a".repeat(80), candidate)))
        .toThrowError(expect.objectContaining({ code: "INVALID_CANONICAL_URL" }));
    }
  });

  it("requires at least one usable application chunk", () => {
    const chunkText = vi.fn().mockReturnValue([]);
    expect(() => normalizeWebContentExtraction(result("a".repeat(80)), { chunkText }))
      .toThrowError(expect.objectContaining({ code: "CHUNKLESS_CONTENT" }));
    expect(chunkText).toHaveBeenCalledWith("a".repeat(80));
  });
});
