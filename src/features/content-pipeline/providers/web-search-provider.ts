import type { WebSearchPage } from "@/features/content-pipeline/types";

export interface WebSearchRequest {
  query: string;
  searchLanguage: string;
  country: string;
  count: number;
  cursor?: string | null;
}

export interface WebSearchProvider {
  search(request: WebSearchRequest): Promise<WebSearchPage>;
}

export type WebSearchProviderErrorCode =
  | "AUTH"
  | "QUOTA"
  | "TIMEOUT"
  | "UPSTREAM"
  | "INVALID_RESPONSE";

export class WebSearchProviderError extends Error {
  constructor(public readonly code: WebSearchProviderErrorCode, message: string) {
    super(message);
    this.name = "WebSearchProviderError";
  }
}
