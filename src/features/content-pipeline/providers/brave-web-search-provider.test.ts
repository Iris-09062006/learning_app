import { describe, expect, it, vi } from "vitest";

import { BraveWebSearchProvider } from "./brave-web-search-provider";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("BraveWebSearchProvider", () => {
  it("requests only bounded undecorated web results with a server-only token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      type: "search",
      query: { original: "Python", more_results_available: true },
      web: { results: [
        { title: "Python docs", url: "https://docs.python.org/3/", description: "Official docs", language: "en", vendor: "ignored" },
      ] },
    }));
    const provider = new BraveWebSearchProvider({ apiKey: "server-secret", fetchImpl: fetchMock });

    await expect(provider.search({ query: "Python", searchLanguage: "vi", country: "VN", count: 20 }))
      .resolves.toEqual({
        results: [{ url: "https://docs.python.org/3/", title: "Python docs", snippet: "Official docs", language: "en", providerRank: 0 }],
        cursor: "brave:1",
        hasMore: true,
      });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe("https://api.search.brave.com/res/v1/web/search");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      q: "Python", country: "VN", search_lang: "vi", count: "20", offset: "0",
      result_filter: "web", text_decorations: "false", spellcheck: "false",
    });
    expect(init.headers).toMatchObject({ "X-Subscription-Token": "server-secret" });
    expect(url.toString()).not.toContain("server-secret");
  });

  it("uses a bounded opaque cursor and rejects invalid request bounds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ type: "search", query: { more_results_available: false }, web: { results: [] } }));
    const provider = new BraveWebSearchProvider({ apiKey: "secret", fetchImpl: fetchMock });
    await provider.search({ query: "Python", searchLanguage: "en", country: "US", count: 5, cursor: "brave:9" });
    expect((fetchMock.mock.calls[0][0] as URL).searchParams.get("offset")).toBe("9");
    await expect(provider.search({ query: "", searchLanguage: "vi", country: "VN", count: 20 })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(provider.search({ query: "Python", searchLanguage: "vi", country: "VN", count: 21 })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(provider.search({ query: "Python", searchLanguage: "vi", country: "VN", count: 20, cursor: "brave:10" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("accepts a successful search with no web cluster as an empty page", async () => {
    const provider = new BraveWebSearchProvider({
      apiKey: "secret",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ type: "search", query: { more_results_available: false } })),
    });
    await expect(provider.search({ query: "rare topic", searchLanguage: "vi", country: "VN", count: 20 }))
      .resolves.toEqual({ results: [], cursor: null, hasMore: false });
  });

  it.each([
    [401, "AUTH"], [403, "AUTH"], [429, "QUOTA"], [500, "UPSTREAM"], [422, "UPSTREAM"],
  ] as const)("maps HTTP %i to %s", async (status, code) => {
    const provider = new BraveWebSearchProvider({ apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(new Response("failure", { status })) });
    await expect(provider.search({ query: "Python", searchLanguage: "vi", country: "VN", count: 20 }))
      .rejects.toMatchObject({ code });
  });

  it("maps missing credentials, timeouts, and malformed responses", async () => {
    const request = { query: "Python", searchLanguage: "vi", country: "VN", count: 20 };
    await expect(new BraveWebSearchProvider({ apiKey: "", fetchImpl: vi.fn() }).search(request))
      .rejects.toMatchObject({ code: "AUTH" });
    const timeoutFetch = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(new BraveWebSearchProvider({ apiKey: "secret", fetchImpl: timeoutFetch }).search(request))
      .rejects.toMatchObject({ code: "TIMEOUT" });
    const malformed = new BraveWebSearchProvider({ apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ web: { results: [{ url: 3 }] } })) });
    await expect(malformed.search(request)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    const oversized = new BraveWebSearchProvider({ apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(jsonResponse({
      type: "search", web: { results: Array.from({ length: 21 }, () => ({ url: "https://example.com", title: "Title", description: "Snippet" })) },
    })) });
    await expect(oversized.search(request)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
