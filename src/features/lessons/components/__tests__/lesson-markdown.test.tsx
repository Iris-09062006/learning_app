import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonMarkdown } from "@/features/lessons/components/lesson-markdown";

const markdown = [
  "## Biến là gì?",
  "",
  "Biến giúp lưu **dữ liệu** và *nhớ* giá trị. Đọc thêm tại [Python](https://python.org).",
  "",
  "- Tên biến rõ nghĩa",
  "- Không bắt đầu bằng số",
  "",
  "3. Nhất quán",
  "4. Rõ ràng",
  "",
  "### Quy tắc đặt tên",
  "",
  "Tham khảo [PEP 8](https://peps.python.org/pep-0008/) — *nguồn chính thức*.",
  "",
  "> Lưu ý: tên biến phân biệt hoa thường.",
  "",
  "```python",
  "message = 'Xin chào'",
  "print(message)",
  "```",
  "",
  "Đọc thêm `print()` trên [python.org](https://www.python.org/).",
].join("\n");

function renderMarkdown(content = markdown) {
  return render(<LessonMarkdown content={content} />);
}

describe("LessonMarkdown", () => {
  it("renders markdown text content unchanged", () => {
    renderMarkdown();

    expect(screen.getByRole("heading", { level: 2, name: "Biến là gì?" })).toBeInTheDocument();
    expect(screen.getByText(/Biến giúp lưu/)).toBeInTheDocument();
    expect(screen.getByText("Tên biến rõ nghĩa")).toBeInTheDocument();
    expect(screen.getByText("Không bắt đầu bằng số")).toBeInTheDocument();
    expect(screen.getByText("Nhất quán")).toBeInTheDocument();
    expect(screen.getByText("Rõ ràng")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Quy tắc đặt tên" })).toBeInTheDocument();
    expect(screen.getByText(/Tham khảo/)).toBeInTheDocument();
    expect(screen.getByText("Lưu ý: tên biến phân biệt hoa thường.")).toBeInTheDocument();
    expect(screen.getByText(/message = 'Xin chào'/)).toBeInTheDocument();
    expect(screen.getByText("print()")).toBeInTheDocument();
  });

  it("keeps markdown heading semantics (h2 for ##, h3 for ###)", () => {
    renderMarkdown();

    expect(screen.getByRole("heading", { level: 2, name: "Biến là gì?" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3, name: "Quy tắc đặt tên" })).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(2);
  });

  it("preserves link hrefs and external-link security attributes", () => {
    renderMarkdown();

    const external = screen.getByRole("link", { name: "Python" });
    expect(external).toHaveAttribute("href", "https://python.org");
    expect(external).toHaveAttribute("rel", "noreferrer");
    expect(external).toHaveAttribute("target", "_blank");
  });

  it("styles in-prose links with the primary token and a persistent cue", () => {
    renderMarkdown();

    const link = screen.getByRole("link", { name: "Python" });
    expect(link).toHaveClass("text-primary");
    expect(link.className).toContain("underline");
    expect(link.className).toContain("decoration-primary/30");
    expect(link.className).toContain("focus-visible:ring-primary");
    expect(link.className).toContain("focus-visible:ring-2");
  });

  it("applies semantic-token typography to prose container and headings", () => {
    renderMarkdown();

    const container = screen.getByTestId("lesson-markdown");
    expect(container).toHaveClass("space-y-4", "text-base", "leading-6", "text-text-secondary");

    const h2 = screen.getByRole("heading", { level: 2, name: "Biến là gì?" });
    expect(h2).toHaveClass("text-text-primary", "text-xl", "font-semibold", "leading-7");

    const h3 = screen.getByRole("heading", { level: 3, name: "Quy tắc đặt tên" });
    expect(h3).toHaveClass("text-text-primary", "text-base", "font-semibold", "leading-6");
  });

  it("renders strong and emphasis with distinct in-prose treatment", () => {
    const { container } = renderMarkdown();

    const strong = container.querySelector("strong");
    expect(strong).toHaveTextContent("dữ liệu");
    expect(strong).toHaveClass("font-semibold", "text-text-primary");

    const emphasis = container.querySelector("em");
    expect(emphasis).toHaveTextContent("nhớ");
    expect(emphasis?.tagName).toBe("EM");
  });

  it("colors list markers with the primary token without touching list structure", () => {
    const { container } = renderMarkdown();

    const ul = container.querySelector("ul");
    expect(ul).toHaveClass("list-disc", "marker:text-primary", "space-y-1", "pl-6");
    expect(ul?.querySelectorAll("li")).toHaveLength(2);

    const ol = container.querySelector("ol");
    expect(ol).toHaveClass("list-decimal", "marker:text-primary", "space-y-1", "pl-6");
    expect(ol?.querySelectorAll("li")).toHaveLength(2);
  });

  it("styles fenced code blocks with semantic code tokens and internal overflow", () => {
    const { container } = renderMarkdown();

    const codeBlock = container.querySelector('[class*="bg-code-background"]') as HTMLElement;
    expect(codeBlock).not.toBeNull();
    expect(codeBlock).toHaveClass("rounded-xl", "overflow-hidden", "bg-code-background");
    expect(codeBlock.className).not.toContain("border-white/10");
    expect(codeBlock.className).not.toContain("shadow-slate");
    expect(codeBlock.className).not.toMatch(/bg-\[#|text-\[#|dark:/);

    const languageHeader = codeBlock?.querySelector("div");
    expect(languageHeader).not.toBeNull();
    expect(languageHeader).toHaveClass("bg-code-surface", "text-code-muted");

    const pre = container.querySelector("pre");
    expect(pre).toHaveClass("overflow-x-auto", "font-mono", "text-code-text");
    expect(container.querySelector('[class*="text-code-text"]')).not.toBeNull();
  });

  it("styles inline code as a neutral instructional chip without CTA-like surface", () => {
    renderMarkdown();

    const inlineCode = screen.getByText("print()");

    expect(inlineCode.tagName).toBe("CODE");
    expect(inlineCode).toHaveClass("rounded", "bg-surface-subtle", "px-1.5", "py-0.5", "font-mono", "text-text-secondary");
    expect(inlineCode).not.toHaveClass("bg-primary-soft");
    expect(inlineCode.className).not.toMatch(/dark:|bg-\[#|text-\[#/);
  });

  it("styles blockquotes as non-italic informational callouts with the orange quote bar", () => {
    const { container } = renderMarkdown();

    const blockquote = container.querySelector("blockquote");
    expect(blockquote).toHaveClass("rounded-r-xl", "border-l-4", "border-primary", "bg-primary-soft", "text-text-primary");
    expect(blockquote).not.toHaveClass("italic");
    expect(blockquote?.textContent).toBe("Lưu ý: tên biến phân biệt hoa thường.");
  });

  it("keeps tight instructional list rhythm without altering list structure", () => {
    const { container } = renderMarkdown();

    const ul = container.querySelector("ul");
    expect(ul).toHaveClass("list-disc", "marker:text-primary", "space-y-1", "pl-6");
    expect(ul?.querySelectorAll("li")).toHaveLength(2);

    const ol = container.querySelector("ol");
    expect(ol).toHaveClass("list-decimal", "marker:text-primary", "space-y-1", "pl-6");
    expect(ol?.querySelectorAll("li")).toHaveLength(2);

    expect(container.querySelector("li")).toHaveClass("pl-1");
  });

  it("keeps sanitization behavior for unsafe link protocols", () => {
    renderMarkdown("[unsafe](javascript:alert(1))");

    expect(screen.queryByRole("link", { name: "unsafe" })).not.toBeInTheDocument();
    expect(screen.getByText(/unsafe/)).toBeInTheDocument();
  });

  it("keeps relative and hash links navigable without opener semantics", () => {
    renderMarkdown("Xem [hướng dẫn](/lessons/2) và [chương mục](#gioi-thieu).");

    const relative = screen.getByRole("link", { name: "hướng dẫn" });
    expect(relative).toHaveAttribute("href", "/lessons/2");
    expect(relative).not.toHaveAttribute("rel");
    expect(relative).not.toHaveAttribute("target");

    expect(screen.getByRole("link", { name: "chương mục" })).toHaveAttribute("href", "#gioi-thieu");
  });
});