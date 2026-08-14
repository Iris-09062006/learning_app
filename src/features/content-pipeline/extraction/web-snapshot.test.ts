import { describe, expect, it } from "vitest";

import { chunkDocumentText } from "./document-extractor";
import {
  hashWebSnapshot,
  serializeNormalizedWebExtractionSnapshot,
  serializeWebSnapshot,
} from "./web-snapshot";

describe("web snapshot", () => {
  it("serializes identical captured evidence deterministically", () => {
    const input = {
      title: "Bài học <script>alert(1)</script>", canonicalUrl: "https://example.com/course",
      fetchedAt: "2026-08-13T00:00:00.000Z", text: "Nội dung\r\n\r\nBằng chứng ổn định.", language: "vi",
    };
    const first = serializeWebSnapshot(input);
    const second = serializeWebSnapshot(input);
    expect(first).toBe(second);
    expect(hashWebSnapshot(first)).toBe(hashWebSnapshot(second));
    expect(first).not.toContain("<script>");
    expect(first).toContain("canonical_url: \"https://example.com/course\"");
    expect(chunkDocumentText(first)).toEqual(chunkDocumentText(second));
  });

  it("produces byte-identical Markdown and one hash across 100 normalized serializations", () => {
    const normalized = {
      sourceUrl: "https://example.com/selected",
      canonicalUrl: "https://example.com/final",
      title: "Evidence",
      markdown: `# Evidence\n\n${"a".repeat(80)}`,
      normalizedCharacterCount: 92,
      capturedAt: "2026-08-14T00:00:00.000Z",
    };
    const snapshots = Array.from({ length: 100 }, () => serializeNormalizedWebExtractionSnapshot(normalized));
    expect(new Set(snapshots).size).toBe(1);
    expect(new Set(snapshots.map(hashWebSnapshot)).size).toBe(1);
    expect(snapshots[0]).toContain(normalized.markdown);
  });
});
