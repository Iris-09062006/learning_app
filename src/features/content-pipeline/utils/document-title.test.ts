import { describe, expect, it } from "vitest";

import { documentTitleFromFilename, documentTitleFromWebSource } from "./document-title";

describe("documentTitleFromFilename", () => {
  it("uses the filename without its final extension", () => {
    expect(documentTitleFromFilename("week 5. Noi suy Spline.pdf")).toBe("week 5. Noi suy Spline");
    expect(documentTitleFromFilename("Chương 1.v2.docx")).toBe("Chương 1.v2");
  });

  it("normalizes paths and empty dotfiles safely", () => {
    expect(documentTitleFromFilename("C:\\uploads\\Nội suy.md")).toBe("Nội suy");
    expect(documentTitleFromFilename(".pdf")).toBe("Tài liệu");
  });
});

describe("documentTitleFromWebSource", () => {
  it("uses normalized Admin/candidate input before the canonical-domain fallback", () => {
    expect(documentTitleFromWebSource("  Example\u00a0 Guide  ", "https://canonical.example/path"))
      .toBe("Example Guide");
    expect(documentTitleFromWebSource(undefined, "https://Canonical.Example/path"))
      .toBe("canonical.example");
  });
});
