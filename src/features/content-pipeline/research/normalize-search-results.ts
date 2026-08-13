import { createHash } from "node:crypto";

import type { WebSearchResult } from "@/features/content-pipeline/types";

const TRACKING_PARAMETERS = new Set([
  "dclid", "fbclid", "gclid", "mc_cid", "mc_eid", "msclkid", "twclid",
]);

export interface NormalizedSearchCandidate extends WebSearchResult {
  candidateKey: string;
  canonicalUrl: string;
  domain: string;
}

function normalizeDisplayText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function canonicalizeResearchUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || url.username || url.password) return null;
    url.hash = "";
    url.pathname = url.pathname.replace(/\/{2,}/gu, "/");
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/iu.test(key) || TRACKING_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

function candidateKey(canonicalUrl: string): string {
  return createHash("sha256").update(canonicalUrl).digest("base64url").slice(0, 24);
}

export function normalizeSearchResults(results: WebSearchResult[]): NormalizedSearchCandidate[] {
  const seen = new Set<string>();
  const normalized: NormalizedSearchCandidate[] = [];
  for (const result of results) {
    const canonicalUrl = canonicalizeResearchUrl(result.url);
    const title = normalizeDisplayText(result.title);
    const snippet = normalizeDisplayText(result.snippet);
    if (!canonicalUrl || !title || !snippet || seen.has(canonicalUrl)) continue;
    seen.add(canonicalUrl);
    normalized.push({
      url: result.url,
      canonicalUrl,
      candidateKey: candidateKey(canonicalUrl),
      domain: new URL(canonicalUrl).hostname,
      title,
      snippet,
      language: result.language ? normalizeDisplayText(result.language).toLowerCase() : null,
      providerRank: result.providerRank,
    });
  }
  return normalized;
}
