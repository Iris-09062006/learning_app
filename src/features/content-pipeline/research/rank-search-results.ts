import type { ResearchCandidate } from "@/features/content-pipeline/types";
import type { NormalizedSearchCandidate } from "./normalize-search-results";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function rounded(value: number): number {
  return Math.round(clamp(value) * 1000) / 1000;
}

function tokens(value: string): Set<string> {
  return new Set(value.normalize("NFKD").toLocaleLowerCase("vi")
    .replace(/[\p{Diacritic}]/gu, "")
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((token) => token.length >= 2));
}

function overlap(needles: Set<string>, text: Set<string>): number {
  if (!needles.size) return 0;
  let matches = 0;
  for (const token of needles) if (text.has(token)) matches += 1;
  return matches / needles.size;
}

function relevance(candidate: NormalizedSearchCandidate, topic: string, queries: string[]): number {
  const textTokens = tokens(`${candidate.title} ${candidate.snippet} ${candidate.domain}`);
  const topicOverlap = overlap(tokens(topic), textTokens);
  const queryOverlap = overlap(tokens(queries.join(" ")), textTokens);
  const normalizedRank = 1 - Math.min(19, Math.max(0, candidate.providerRank)) / 19;
  return rounded(normalizedRank * 0.4 + topicOverlap * 0.45 + queryOverlap * 0.15);
}

function authority(candidate: NormalizedSearchCandidate): number {
  const url = new URL(candidate.canonicalUrl);
  const host = url.hostname.toLowerCase();
  const text = `${host} ${url.pathname} ${candidate.title}`.toLowerCase();
  let score = 0.5;
  if (url.protocol === "https:") score += 0.1;
  if (/(^|\.)gov(\.vn)?$/u.test(host)) score += 0.25;
  else if (/(^|\.)edu(\.vn)?$/u.test(host)) score += 0.2;
  if (/(^|[\s./-])(docs?|documentation|developer|reference|official)([\s./-]|$)/u.test(text)) score += 0.1;
  return rounded(score);
}

export function rankSearchResults(
  candidates: NormalizedSearchCandidate[],
  topic: string,
  queries: string[],
): ResearchCandidate[] {
  return candidates.map((candidate) => ({
    candidateKey: candidate.candidateKey,
    url: candidate.url,
    canonicalUrl: candidate.canonicalUrl,
    title: candidate.title,
    domain: candidate.domain,
    snippet: candidate.snippet,
    language: candidate.language,
    discovery: "discovered" as const,
    authorityScore: authority(candidate),
    relevanceScore: relevance(candidate, topic, queries),
  })).sort((left, right) =>
    right.relevanceScore - left.relevanceScore
    || right.authorityScore - left.authorityScore
    || left.canonicalUrl.localeCompare(right.canonicalUrl, "en"));
}
