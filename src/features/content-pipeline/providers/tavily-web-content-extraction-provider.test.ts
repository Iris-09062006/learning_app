import { afterEach, describe, expect, it, vi } from "vitest";

import { TavilyWebContentExtractionProvider } from "./tavily-web-content-extraction-provider";

const request = {
  sourceUrl: "https://example.com/selected",
  capturedAt: "2026-08-14T00:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("TavilyWebContentExtractionProvider", () => {
  it("uses exactly one server-authenticated Basic full-page Markdown request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      results: [{ url: "https://example.com/final", raw_content: "# Full page" }],
      failed_results: [],
      request_id: "ignored",
      usage: { credits: 1 },
    }));
    const provider = new TavilyWebContentExtractionProvider({ apiKey: "server-secret", fetchImpl: fetchMock });

    await expect(provider.extract(request)).resolves.toEqual({
      sourceUrl: request.sourceUrl,
      canonicalUrlCandidate: "https://example.com/final",
      rawMarkdown: "# Full page",
      capturedAt: request.capturedAt,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.tavily.com/extract");
    expect(init).toMatchObject({ method: "POST", cache: "no-store" });
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer server-secret",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      urls: request.sourceUrl,
      extract_depth: "basic",
      format: "markdown",
      include_images: false,
      include_favicon: false,
      timeout: 10,
    });
    expect(String(init.body)).not.toMatch(/advanced|query|chunks_per_source|server-secret/i);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses only TAVILY_API_KEY and makes no request when it is absent", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_TAVILY_API_KEY", "public-key-must-be-ignored");
    const fetchMock = vi.fn();
    await expect(new TavilyWebContentExtractionProvider({ fetchImpl: fetchMock }).extract(request))
      .rejects.toMatchObject({ code: "CONFIGURATION", recoverable: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a blank adapter string for the application normalizer to reject", async () => {
    const provider = new TavilyWebContentExtractionProvider({
      apiKey: "secret",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({
        results: [{ url: request.sourceUrl, raw_content: "   " }], failed_results: [],
      })),
    });
    await expect(provider.extract(request)).resolves.toMatchObject({ rawMarkdown: "   " });
  });

  it.each([
    [{}, "INVALID_RESPONSE"],
    [{ results: [], failed_results: [] }, "INVALID_RESPONSE"],
    [{ results: [], failed_results: [{ url: request.sourceUrl, error: "blocked" }] }, "FAILED_RESULT"],
    [{ results: [{ url: request.sourceUrl, raw_content: "ok" }], failed_results: [{ url: request.sourceUrl, error: "failed" }] }, "INVALID_RESPONSE"],
    [{ results: [{ url: request.sourceUrl, raw_content: "a" }, { url: "https://other.example", raw_content: "b" }], failed_results: [] }, "INVALID_RESPONSE"],
    [{ results: [{ raw_content: "content" }], failed_results: [] }, "INVALID_RESPONSE"],
    [{ results: [{ url: 42, raw_content: "content" }], failed_results: [] }, "INVALID_RESPONSE"],
    [{ results: [{ url: " ", raw_content: "content" }], failed_results: [] }, "INVALID_RESPONSE"],
    [{ results: [{ url: request.sourceUrl }], failed_results: [] }, "INVALID_RESPONSE"],
    [{ results: [{ url: request.sourceUrl, raw_content: 42 }], failed_results: [] }, "INVALID_RESPONSE"],
    [{ results: "invalid", failed_results: [] }, "INVALID_RESPONSE"],
    [{ results: [], failed_results: "invalid" }, "INVALID_RESPONSE"],
  ] as const)("maps response shape %# to %s", async (body, code) => {
    const provider = new TavilyWebContentExtractionProvider({
      apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(jsonResponse(body)),
    });
    await expect(provider.extract(request)).rejects.toMatchObject({ code });
  });

  it.each([
    [401, "AUTHENTICATION"], [403, "AUTHENTICATION"],
    [429, "QUOTA"], [432, "QUOTA"], [433, "QUOTA"],
    [408, "TIMEOUT"], [504, "TIMEOUT"], [400, "UPSTREAM"], [500, "UPSTREAM"],
  ] as const)("maps HTTP %i to %s without exposing the response body", async (status, code) => {
    const provider = new TavilyWebContentExtractionProvider({
      apiKey: "secret",
      fetchImpl: vi.fn().mockResolvedValue(new Response("raw upstream secret", { status })),
    });
    const failure = provider.extract(request);
    await expect(failure).rejects.toMatchObject({ code });
    await expect(failure).rejects.not.toMatchObject({ message: expect.stringContaining("raw upstream secret") });
  });

  it("maps malformed JSON, aborts, and network failures without retrying", async () => {
    const malformedFetch = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));
    await expect(new TavilyWebContentExtractionProvider({ apiKey: "secret", fetchImpl: malformedFetch }).extract(request))
      .rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    expect(malformedFetch).toHaveBeenCalledTimes(1);

    const abortFetch = vi.fn().mockRejectedValue(Object.assign(new Error("secret abort"), { name: "AbortError" }));
    await expect(new TavilyWebContentExtractionProvider({ apiKey: "secret", fetchImpl: abortFetch }).extract(request))
      .rejects.toMatchObject({ code: "TIMEOUT" });
    expect(abortFetch).toHaveBeenCalledTimes(1);

    const networkFetch = vi.fn().mockRejectedValue(new Error("raw network secret"));
    await expect(new TavilyWebContentExtractionProvider({ apiKey: "secret", fetchImpl: networkFetch }).extract(request))
      .rejects.toMatchObject({ code: "UPSTREAM", message: "Web extraction provider request failed." });
    expect(networkFetch).toHaveBeenCalledTimes(1);
  });

  it("emits no credentials, provider bodies, URLs, or extracted content to logs", async () => {
    const logSpies = [
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
    ];
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      "raw-provider-response private-markdown request_id=private-id",
      { status: 500 },
    ));
    const provider = new TavilyWebContentExtractionProvider({
      apiKey: "private-tavily-key", fetchImpl: fetchMock,
    });

    await expect(provider.extract({
      sourceUrl: "https://private.example/evidence", capturedAt: request.capturedAt,
    })).rejects.toMatchObject({ code: "UPSTREAM" });
    for (const spy of logSpies) expect(spy).not.toHaveBeenCalled();
    expect(JSON.stringify(logSpies.flatMap((spy) => spy.mock.calls)))
      .not.toMatch(/private-tavily-key|raw-provider-response|private-markdown|private-id|private\.example/);
  });
});
