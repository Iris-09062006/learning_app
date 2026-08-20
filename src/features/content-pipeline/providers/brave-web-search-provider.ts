import "server-only";

import type { WebSearchPage, WebSearchResult } from "@/features/content-pipeline/types";
import {
  WebSearchProviderError,
  type WebSearchProvider,
  type WebSearchRequest,
} from "./web-search-provider";

const BRAVE_WEB_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const MAX_QUERY_LENGTH = 400;
const MAX_QUERY_WORDS = 50;
const MAX_OFFSET = 9;

interface BraveProviderOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function requestOffset(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const match = /^brave:([0-9])$/.exec(cursor);
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
  return requestOffset(request.cursor);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseResponse(value: unknown, offset: number, count: number): WebSearchPage {
  const root = asRecord(value);
  if (!root || root.type !== "search") {
    throw new WebSearchProviderError("INVALID_RESPONSE", "The search provider returned an invalid response.");
  }
  const web = root.web === undefined || root.web === null ? null : asRecord(root.web);
  const query = asRecord(root?.query);
  const webResults = web?.results;
  if ((root.web !== undefined && root.web !== null && !web) || (web && !Array.isArray(webResults))
    || (Array.isArray(webResults) && webResults.length > count)
    || (root.query !== undefined && root.query !== null && !query)
    || (query?.more_results_available !== undefined && typeof query.more_results_available !== "boolean")) {
    throw new WebSearchProviderError("INVALID_RESPONSE", "The search provider returned an invalid response.");
  }
  const results: WebSearchResult[] = (Array.isArray(webResults) ? webResults : []).map((entry, providerRank) => {
    const item = asRecord(entry);
    if (!item || typeof item.url !== "string" || typeof item.title !== "string" || typeof item.description !== "string") {
      throw new WebSearchProviderError("INVALID_RESPONSE", "The search provider returned an invalid result.");
    }
    if (item.language !== undefined && item.language !== null && typeof item.language !== "string") {
      throw new WebSearchProviderError("INVALID_RESPONSE", "The search provider returned an invalid language.");
    }
    return {
      url: item.url,
      title: item.title,
      snippet: item.description,
      language: typeof item.language === "string" ? item.language : null,
      providerRank,
    };
  });
  const hasMore = query?.more_results_available === true && offset < MAX_OFFSET;
  return { results, cursor: hasMore ? `brave:${offset + 1}` : null, hasMore };
}

export class BraveWebSearchProvider implements WebSearchProvider {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: BraveProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.BRAVE_SEARCH_API_KEY ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async search(request: WebSearchRequest): Promise<WebSearchPage> {
    if (!this.apiKey) throw new WebSearchProviderError("AUTH", "Search provider credentials are unavailable.");
    const offset = validateRequest(request);
    const url = new URL(BRAVE_WEB_SEARCH_URL);
    url.searchParams.set("q", request.query);
    url.searchParams.set("country", request.country.toUpperCase());
    url.searchParams.set("search_lang", request.searchLanguage.toLowerCase());
    url.searchParams.set("ui_lang", request.searchLanguage.toLowerCase() === "vi" ? "vi-VN" : "en-US");
    url.searchParams.set("count", String(request.count));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("result_filter", "web");
    url.searchParams.set("text_decorations", "false");
    url.searchParams.set("spellcheck", "false");
    url.searchParams.set("safesearch", "moderate");
    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json", "X-Subscription-Token": this.apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (response.status === 401 || response.status === 403) throw new WebSearchProviderError("AUTH", "Search provider authentication failed.");
      if (response.status === 429) throw new WebSearchProviderError("QUOTA", "Search provider quota is exhausted.");
      if (!response.ok) throw new WebSearchProviderError("UPSTREAM", "Search provider request failed.");
      return parseResponse(await response.json(), offset, request.count);
    } catch (error) {
      if (error instanceof WebSearchProviderError) throw error;
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new WebSearchProviderError("TIMEOUT", "Search provider timed out.");
      }
      if (error instanceof SyntaxError) throw new WebSearchProviderError("INVALID_RESPONSE", "Search provider returned malformed JSON.");
      throw new WebSearchProviderError("UPSTREAM", "Search provider request failed.");
    }
  }
}
