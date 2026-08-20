import { afterEach, describe, expect, it, vi } from "vitest";

import { TavilyWebSearchProvider } from "./tavily-web-search-provider";

const request = { query: "Python", searchLanguage: "vi", country: "VN", count: 2 };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.unstubAllEnvs());

describe("TavilyWebSearchProvider", () => {
  it("uses the free-tier basic search parameters and a server-only bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      query: "Python",
      results: [
        { title: "Python docs", url: "https://docs.python.org/3/", content: "Official docs", score: 0.9, vendor: "ignored" },
        { title: "Python guide", url: "https://example.com/python", content: "A guide", score: 0.8 },
      ],
      response_time: 0.5,
    }));
    const provider = new TavilyWebSearchProvider({ apiKey: "server-secret", fetchImpl: fetchMock });

    await expect(provider.search(request)).resolves.toEqual({
      results: [
        { url: "https://docs.python.org/3/", title: "Python docs", snippet: "Official docs", language: null, providerRank: 0 },
        { url: "https://example.com/python", title: "Python guide", snippet: "A guide", language: null, providerRank: 1 },
      ],
      cursor: "tavily:1",
      hasMore: true,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.tavily.com/search");
    expect(init).toMatchObject({ method: "POST", cache: "no-store" });
    expect(init.headers).toMatchObject({ Authorization: "Bearer server-secret", "Content-Type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({
      query: "Python",
      search_depth: "basic",
      auto_parameters: false,
      max_results: 2,
      topic: "general",
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      country: "vietnam",
    });
    expect(String(init.body)).not.toContain("server-secret");
  });

  it("uses a bounded stateless cursor for deterministic Research More refinements", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    const provider = new TavilyWebSearchProvider({ apiKey: "secret", fetchImpl: fetchMock });
    await provider.search({ ...request, cursor: "tavily:1" });
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toMatchObject({
      query: "Python nguồn bổ sung",
      search_depth: "basic",
      auto_parameters: false,
    });
    await expect(provider.search({ ...request, cursor: "tavily:3" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(provider.search({ ...request, query: "" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(provider.search({ ...request, count: 21 })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it.each([
    [401, "AUTH"], [403, "AUTH"], [429, "QUOTA"], [432, "QUOTA"], [433, "QUOTA"],
    [408, "TIMEOUT"], [504, "TIMEOUT"], [400, "UPSTREAM"], [500, "UPSTREAM"],
  ] as const)("maps HTTP %i to %s", async (status, code) => {
    const provider = new TavilyWebSearchProvider({
      apiKey: "secret",
      fetchImpl: vi.fn().mockResolvedValue(new Response("failure", { status })),
    });
    await expect(provider.search(request)).rejects.toMatchObject({ code });
  });

  it("ignores a public key and maps missing credentials and timeouts", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_TAVILY_API_KEY", "must-not-be-used");
    const fetchMock = vi.fn();
    await expect(new TavilyWebSearchProvider({ fetchImpl: fetchMock }).search(request))
      .rejects.toMatchObject({ code: "AUTH" });
    expect(fetchMock).not.toHaveBeenCalled();

    const timeoutFetch = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(new TavilyWebSearchProvider({ apiKey: "secret", fetchImpl: timeoutFetch }).search(request))
      .rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("rejects malformed JSON, invalid results, and oversized responses", async () => {
    const malformedJson = new TavilyWebSearchProvider({
      apiKey: "secret",
      fetchImpl: vi.fn().mockResolvedValue(new Response("not json", { status: 200 })),
    });
    await expect(malformedJson.search(request)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });

    for (const body of [
      { query: "Python" },
      { results: [{ url: 3, title: "Title", content: "Snippet" }] },
      { results: Array.from({ length: 3 }, () => ({ url: "https://example.com", title: "Title", content: "Snippet" })) },
    ]) {
      const provider = new TavilyWebSearchProvider({ apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(jsonResponse(body)) });
      await expect(provider.search(request)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    }
  });
});
