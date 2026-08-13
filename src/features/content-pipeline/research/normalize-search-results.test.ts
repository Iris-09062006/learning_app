import { describe, expect, it } from "vitest";

import { canonicalizeResearchUrl, normalizeSearchResults } from "./normalize-search-results";

describe("research URL normalization", () => {
  it("normalizes scheme/host, default ports, path syntax, fragments, and query ordering", () => {
    expect(canonicalizeResearchUrl("HTTPS://Example.COM:443/a/../guide?b=2&a=1#section"))
      .toBe("https://example.com/guide?a=1&b=2");
    expect(canonicalizeResearchUrl("http://EXAMPLE.com:80//guide"))
      .toBe("http://example.com/guide");
  });

  it("removes only the explicit tracking denylist and preserves meaningful parameters", () => {
    expect(canonicalizeResearchUrl("https://example.com/doc?id=7&utm_source=newsletter&fbclid=abc&gclid=def&ref=keep"))
      .toBe("https://example.com/doc?id=7&ref=keep");
  });

  it("rejects unsupported and malformed URLs", () => {
    expect(canonicalizeResearchUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeResearchUrl("ftp://example.com/file")).toBeNull();
    expect(canonicalizeResearchUrl("not a url")).toBeNull();
  });

  it("deduplicates by canonical URL and produces stable candidate keys", () => {
    const results = normalizeSearchResults([
      { url: "https://Example.com/guide?utm_medium=email", title: " Guide ", snippet: " Useful   source ", language: "en", providerRank: 2 },
      { url: "https://example.com/guide#top", title: "Duplicate", snippet: "Duplicate", language: null, providerRank: 0 },
      { url: "mailto:admin@example.com", title: "Mail", snippet: "No", language: null, providerRank: 1 },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      canonicalUrl: "https://example.com/guide",
      domain: "example.com",
      title: "Guide",
      snippet: "Useful source",
      providerRank: 2,
    });
    expect(normalizeSearchResults([{ ...results[0], url: results[0].url }])[0].candidateKey)
      .toBe(results[0].candidateKey);
  });
});
