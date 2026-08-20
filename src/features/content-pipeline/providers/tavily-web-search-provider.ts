import "server-only";

import type { WebSearchPage, WebSearchResult } from "@/features/content-pipeline/types";
import {
  WebSearchProviderError,
  type WebSearchProvider,
  type WebSearchRequest,
} from "./web-search-provider";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const MAX_QUERY_LENGTH = 400;
const MAX_QUERY_WORDS = 50;
const MAX_PAGE = 2;

interface TavilyProviderOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function requestPage(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const match = /^tavily:([1-2])$/.exec(cursor);
  if (!match) throw new WebSearchProviderError("INVALID_RESPONSE", "The search cursor is invalid.");
  return Number(match[1]);
}

function validateRequest(request: WebSearchRequest): number {
  const words = request.query.trim().split(/\s+/u).filter(Boolean);
  if (!request.query.trim() || request.query.length > MAX_QUERY_LENGTH || words.length > MAX_QUERY_WORDS) {
    throw new WebSearchProviderError("INVALID_RESPONSE", "The search query is outside provider bounds.");
  }
  if (!Number.isInteger(request.count) || request.count < 1 || request.count > 20) {
    throw new WebSearchProviderError("INVALID_RESPONSE", "The search result count is outside provider bounds.");
  }
  if (!/^[a-z]{2,3}$/i.test(request.searchLanguage) || !/^[a-z]{2}$/i.test(request.country)) {
    throw new WebSearchProviderError("INVALID_RESPONSE", "The provider locale is invalid.");
  }
  return requestPage(request.cursor);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function refinedQuery(request: WebSearchRequest, page: number): string {
  if (page === 0) return request.query;
  const suffix = request.searchLanguage.toLowerCase() === "vi"
    ? page === 1 ? "nguồn bổ sung" : "tài liệu tham khảo khác"
    : page === 1 ? "additional sources" : "alternative references";
  const suffixWords = suffix.split(" ");
  const queryWords = request.query.trim().split(/\s+/u).slice(0, MAX_QUERY_WORDS - suffixWords.length);
  return [...queryWords, ...suffixWords].join(" ").slice(0, MAX_QUERY_LENGTH);
}

function tavilyCountry(country: string): string | undefined {
  const countries: Record<string, string> = { US: "united states", VN: "vietnam" };
  return countries[country.toUpperCase()];
}

function parseResponse(value: unknown, page: number, count: number): WebSearchPage {
  const root = asRecord(value);
  if (!root || !Array.isArray(root.results) || root.results.length > count) {
    throw new WebSearchProviderError("INVALID_RESPONSE", "The search provider returned an invalid response.");
  }
  const results: WebSearchResult[] = root.results.map((entry, providerRank) => {
    const item = asRecord(entry);
    if (!item || typeof item.url !== "string" || typeof item.title !== "string" || typeof item.content !== "string") {
      throw new WebSearchProviderError("INVALID_RESPONSE", "The search provider returned an invalid result.");
    }
    return {
      url: item.url,
      title: item.title,
      snippet: item.content,
      language: null,
      providerRank,
    };
  });
  const hasMore = results.length === count && page < MAX_PAGE;
  return { results, cursor: hasMore ? `tavily:${page + 1}` : null, hasMore };
}

export class TavilyWebSearchProvider implements WebSearchProvider {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: TavilyProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.TAVILY_API_KEY ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async search(request: WebSearchRequest): Promise<WebSearchPage> {
    if (!this.apiKey) throw new WebSearchProviderError("AUTH", "Search provider credentials are unavailable.");
    const page = validateRequest(request);
    const country = tavilyCountry(request.country);
    const body = {
      query: refinedQuery(request, page),
      search_depth: "basic",
      auto_parameters: false,
      max_results: request.count,
      topic: "general",
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      ...(country ? { country } : {}),
    };
    try {
      const response = await this.fetchImpl(TAVILY_SEARCH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (response.status === 401 || response.status === 403) {
        throw new WebSearchProviderError("AUTH", "Search provider authentication failed.");
      }
      if (response.status === 429 || response.status === 432 || response.status === 433) {
        throw new WebSearchProviderError("QUOTA", "Search provider quota is exhausted.");
      }
      if (response.status === 408 || response.status === 504) {
        throw new WebSearchProviderError("TIMEOUT", "Search provider timed out.");
      }
      if (!response.ok) throw new WebSearchProviderError("UPSTREAM", "Search provider request failed.");
      return parseResponse(await response.json(), page, request.count);
    } catch (error) {
      if (error instanceof WebSearchProviderError) throw error;
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new WebSearchProviderError("TIMEOUT", "Search provider timed out.");
      }
      if (error instanceof SyntaxError) {
        throw new WebSearchProviderError("INVALID_RESPONSE", "Search provider returned malformed JSON.");
      }
      throw new WebSearchProviderError("UPSTREAM", "Search provider request failed.");
    }
  }
}
