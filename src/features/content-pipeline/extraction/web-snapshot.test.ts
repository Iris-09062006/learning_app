import { describe, expect, it } from "vitest";

import { chunkDocumentText } from "./document-extractor";
import { hashWebSnapshot, serializeWebSnapshot } from "./web-snapshot";

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
});
