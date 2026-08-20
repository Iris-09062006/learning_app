import { describe, expect, it } from "vitest";

import { extractWebPage } from "./web-page-extractor";

describe("extractWebPage", () => {
  it("extracts bounded main content without executing scripts or loading resources", () => {
    delete (globalThis as { webPageScriptRan?: boolean }).webPageScriptRan;
    const result = extractWebPage({
      url: "https://example.com/article",
      contentType: "text/html",
      body: Buffer.from(`<html lang="vi"><head><title>Bài học</title></head><body>
        <nav>${"menu ".repeat(30)}</nav><article><h1>Bài học an toàn</h1><p>${"Nội dung học tập hữu ích. ".repeat(20)}</p></article>
        <script>globalThis.webPageScriptRan=true</script><img src="https://127.0.0.1/private.png"></body></html>`),
    });
    expect(result.title).toContain("Bài học");
    expect(result.text).toContain("Nội dung học tập hữu ích");
    expect(result.text).not.toContain("webPageScriptRan");
    expect((globalThis as { webPageScriptRan?: boolean }).webPageScriptRan).toBeUndefined();
  });

  it("accepts normalized plain text and rejects empty or invalid charset content", () => {
    expect(extractWebPage({
      url: "https://example.com/notes",
      contentType: "text/plain",
      body: Buffer.from("Một tài liệu văn bản an toàn. ".repeat(8)),
    }).text).toContain("Một tài liệu");
    expect(() => extractWebPage({
      url: "https://example.com/empty", contentType: "text/plain", body: Buffer.from("short"),
    })).toThrowError(expect.objectContaining({ code: "EMPTY_PAGE" }));
    expect(() => extractWebPage({
      url: "https://example.com/bad", contentType: "text/plain", charset: "utf-8", body: Buffer.from([0xff]),
    })).toThrowError(expect.objectContaining({ code: "UNREADABLE_PAGE" }));
  });

  it("rejects an unreadable HTML shell", () => {
    expect(() => extractWebPage({
      url: "https://example.com", contentType: "text/html", body: Buffer.from("<html><body><nav>menu</nav></body></html>"),
    })).toThrowError(expect.objectContaining({ code: "EMPTY_PAGE" }));
  });
});
