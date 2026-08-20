import { describe, expect, it, vi } from "vitest";

import { assertUsableDocumentChunks, chunkDocumentText, extractDocumentText } from "./document-extractor";

function createTextLayerPdf(): Buffer {
  const stream = [
    "BT",
    "/F1 18 Tf",
    "72 720 Td",
    "(LearningApp PDF extraction works) Tj",
    "0 -24 Td",
    "(This document contains a real text layer.) Tj",
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = Buffer.byteLength(pdf);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}

describe("document extraction", () => {
  it("normalizes UTF-8 text and creates stable chunks", async () => {
    const text = await extractDocumentText(
      Buffer.from("Tiêu đề\r\n\r\nNội dung bài học.\u0000"),
      "text/plain"
    );
    const chunks = chunkDocumentText(text);
    expect(text).toBe("Tiêu đề\n\nNội dung bài học.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ chunkIndex: 0, startOffset: 0 });
    expect(chunks[0].contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects empty documents", async () => {
    await expect(extractDocumentText(Buffer.from(" \n "), "text/markdown")).rejects.toMatchObject({
      code: "EMPTY_DOCUMENT",
    });
  });

  it("preserves the existing 200,000-character maximum", async () => {
    await expect(extractDocumentText(Buffer.from("a".repeat(200_000)), "text/markdown"))
      .resolves.toHaveLength(200_000);
    await expect(extractDocumentText(Buffer.from("a".repeat(200_001)), "text/markdown"))
      .rejects.toMatchObject({ code: "DOCUMENT_TOO_LARGE" });
  });

  it("rejects promotion when no usable application chunk exists", () => {
    expect(() => assertUsableDocumentChunks([])).toThrowError(expect.objectContaining({ code: "EMPTY_DOCUMENT" }));
    expect(assertUsableDocumentChunks(chunkDocumentText("usable evidence"))).toHaveLength(1);
  });

  it("extracts text from a PDF with a real text layer", async () => {
    const text = await extractDocumentText(createTextLayerPdf(), "application/pdf");

    expect(text).toContain("LearningApp PDF extraction works");
    expect(text).toContain("This document contains a real text layer.");
  });

  it("logs sanitized parser diagnostics while preserving the generic extraction error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      extractDocumentText(Buffer.from("not a PDF"), "application/pdf")
    ).rejects.toMatchObject({ code: "EXTRACTION_FAILED" });

    expect(log).toHaveBeenCalledWith(
      "[content-pipeline] Document extraction failed.",
      {
        mimeType: "application/pdf",
        errorName: expect.any(String),
        errorMessage: expect.any(String),
      }
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("not a PDF");
    log.mockRestore();
  });

  it("splits oversized paragraphs without losing text", () => {
    const text = "a".repeat(8_500);
    const chunks = chunkDocumentText(text);
    expect(chunks.map((chunk) => chunk.content).join("")).toBe(text);
    expect(chunks.every((chunk) => chunk.content.length <= 4_000)).toBe(true);
  });
});
