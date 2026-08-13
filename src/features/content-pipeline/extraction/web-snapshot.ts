import "server-only";

import { createHash } from "node:crypto";

import { normalizeDocumentText } from "./document-extractor";

function yamlString(value: string) {
  return JSON.stringify(value.normalize("NFC"));
}

function markdownText(value: string) {
  return normalizeDocumentText(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function serializeWebSnapshot(input: {
  title: string;
  canonicalUrl: string;
  fetchedAt: string;
  text: string;
  language?: string | null;
  excerpt?: string | null;
  publishedTime?: string | null;
}) {
  const metadata = [
    "---",
    `title: ${yamlString(markdownText(input.title))}`,
    `canonical_url: ${yamlString(input.canonicalUrl)}`,
    `fetched_at: ${yamlString(new Date(input.fetchedAt).toISOString())}`,
    ...(input.language ? [`language: ${yamlString(input.language)}`] : []),
    ...(input.publishedTime ? [`published_time: ${yamlString(input.publishedTime)}`] : []),
    ...(input.excerpt ? [`excerpt: ${yamlString(markdownText(input.excerpt))}`] : []),
    "---",
    "",
  ];
  return `${metadata.join("\n")}# ${markdownText(input.title)}\n\n${markdownText(input.text)}\n`;
}

export function hashWebSnapshot(snapshot: string) {
  return createHash("sha256").update(snapshot, "utf8").digest("hex");
}
