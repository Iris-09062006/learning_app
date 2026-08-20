import { describe, expect, it } from "vitest";

import type { NormalizedSearchCandidate } from "./normalize-search-results";
import { rankSearchResults } from "./rank-search-results";

function candidate(overrides: Partial<NormalizedSearchCandidate>): NormalizedSearchCandidate {
  const canonicalUrl = overrides.canonicalUrl ?? "https://example.com/guide";
  return {
    candidateKey: overrides.candidateKey ?? canonicalUrl,
    url: overrides.url ?? canonicalUrl,
    canonicalUrl,
    domain: overrides.domain ?? new URL(canonicalUrl).hostname,
    title: overrides.title ?? "Guide",
    snippet: overrides.snippet ?? "Reference material",
    language: overrides.language ?? "en",
    providerRank: overrides.providerRank ?? 10,
  };
}

describe("rankSearchResults", () => {
  it("combines provider rank and topic/query overlap deterministically", () => {
    const relevant = candidate({ canonicalUrl: "https://example.com/python", title: "Python async programming", snippet: "Learn async Python", providerRank: 3 });
    const generic = candidate({ canonicalUrl: "https://example.com/generic", title: "Generic guide", snippet: "Reference", providerRank: 0 });
    const first = rankSearchResults([generic, relevant], "Python async programming", ["Python async programming official documentation"]);
    const second = rankSearchResults([generic, relevant], "Python async programming", ["Python async programming official documentation"]);
    expect(first).toEqual(second);
    expect(first[0].canonicalUrl).toBe(relevant.canonicalUrl);
    expect(first[0].relevanceScore).toBeGreaterThan(first[1].relevanceScore);
  });

  it("uses conservative HTTPS, government/education, and official-documentation authority signals", () => {
    const ranked = rankSearchResults([
      candidate({ canonicalUrl: "https://docs.python.org/3/reference/", domain: "docs.python.org", title: "Official Python documentation" }),
      candidate({ canonicalUrl: "https://example.edu.vn/course", domain: "example.edu.vn" }),
      candidate({ canonicalUrl: "http://example.com/guide", domain: "example.com" }),
    ], "unrelated topic", ["unrelated topic"]);
    const scores = Object.fromEntries(ranked.map((item) => [item.domain, item.authorityScore]));
    expect(scores["docs.python.org"]).toBeGreaterThan(scores["example.com"]);
    expect(scores["example.edu.vn"]).toBeGreaterThan(scores["example.com"]);
  });

  it("keeps every score bounded and does not add automatic-selection metadata", () => {
    const ranked = rankSearchResults([candidate({ providerRank: -99 }), candidate({ providerRank: 999 })], "Guide", ["Guide"]);
    for (const item of ranked) {
      expect(item.authorityScore).toBeGreaterThanOrEqual(0);
      expect(item.authorityScore).toBeLessThanOrEqual(1);
      expect(item.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(item.relevanceScore).toBeLessThanOrEqual(1);
      expect(item).not.toHaveProperty("selected");
    }
  });

  it("breaks exact score ties by canonical URL", () => {
    const ranked = rankSearchResults([
      candidate({ canonicalUrl: "https://b.example/", domain: "b.example" }),
      candidate({ canonicalUrl: "https://a.example/", domain: "a.example" }),
    ], "unrelated", ["unrelated"]);
    expect(ranked.map((item) => item.canonicalUrl)).toEqual(["https://a.example/", "https://b.example/"]);
  });
});
