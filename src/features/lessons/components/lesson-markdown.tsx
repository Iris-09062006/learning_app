import type { ReactNode } from "react";

interface LessonMarkdownProps {
  content: string;
}

interface MarkdownBlock {
  content: string;
  language?: string;
  level?: number;
  type: "blockquote" | "code" | "heading" | "ordered-list" | "paragraph" | "rule" | "unordered-list";
}

function isBlockStart(line: string): boolean {
  return (
    /^```/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*+]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^\s*(---+|___+|\*\*\*+)\s*$/.test(line)
  );
}

function parseBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([\w+-]*)\s*$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", content: code.join("\n"), language: fence[1] || undefined });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", content: heading[2].trim(), level: heading[1].length });
      index += 1;
      continue;
    }

    if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
      blocks.push({ type: "rule", content: "" });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", content: quote.join("\n") });
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*+]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "unordered-list", content: items.join("\n") });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ordered-list", content: items.join("\n") });
      continue;
    }

    const paragraph: string[] = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", content: paragraph.join("\n") });
  }

  return blocks;
}

function safeHref(href: string): string | null {
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(href)) return href;
  return null;
}

function renderInline(content: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\)|\n)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = tokenPattern.exec(content)) !== null) {
    if (match.index > cursor) nodes.push(content.slice(cursor, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${tokenIndex}`;

    if (token === "\n") {
      nodes.push(<br key={key} />);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded-md bg-primary-soft px-1.5 py-0.5 font-mono text-[0.9em] text-primary-active dark:text-primary-hover">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key} className="font-semibold text-text-primary">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = link ? safeHref(link[2]) : null;
      nodes.push(
        href ? (
          <a key={key} href={href} className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" rel={href.startsWith("http") ? "noreferrer" : undefined} target={href.startsWith("http") ? "_blank" : undefined}>
            {link?.[1]}
          </a>
        ) : (
          link?.[1] ?? token
        ),
      );
    }

    cursor = match.index + token.length;
    tokenIndex += 1;
  }

  if (cursor < content.length) nodes.push(content.slice(cursor));
  return nodes;
}

export function LessonMarkdown({ content }: LessonMarkdownProps) {
  const blocks = parseBlocks(content);

  return (
    <div data-testid="lesson-markdown" className="space-y-4 text-base leading-6 text-text-secondary">
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.type === "heading") {
          const headingClass = "scroll-mt-24 pt-2 text-text-primary";
          if (block.level === 1) return <h2 key={key} className={`${headingClass} text-xl font-semibold leading-7`}>{renderInline(block.content, key)}</h2>;
          if (block.level === 2) return <h2 key={key} className={`${headingClass} text-xl font-semibold leading-7`}>{renderInline(block.content, key)}</h2>;
          return <h3 key={key} className={`${headingClass} text-base font-semibold leading-6`}>{renderInline(block.content, key)}</h3>;
        }
        if (block.type === "code") {
          return (
            <div key={key} className="overflow-hidden rounded-2xl border border-white/10 bg-code-background shadow-lg shadow-slate-950/10">
              {block.language && <div className="border-b border-white/10 bg-code-surface px-4 py-2 font-mono text-xs uppercase tracking-wider text-code-muted">{block.language}</div>}
              <pre className="overflow-x-auto p-5 text-sm leading-7 text-code-text"><code>{block.content}</code></pre>
            </div>
          );
        }
        if (block.type === "blockquote") {
          return <blockquote key={key} className="rounded-r-xl border-l-4 border-primary bg-primary-soft/70 px-5 py-4 italic text-text-primary">{renderInline(block.content, key)}</blockquote>;
        }
        if (block.type === "unordered-list" || block.type === "ordered-list") {
          const ListTag = block.type === "ordered-list" ? "ol" : "ul";
          return (
            <ListTag key={key} className={`space-y-2 pl-6 marker:text-primary ${block.type === "ordered-list" ? "list-decimal" : "list-disc"}`}>
              {block.content.split("\n").map((item, itemIndex) => <li key={`${key}-${itemIndex}`} className="pl-1">{renderInline(item, `${key}-${itemIndex}`)}</li>)}
            </ListTag>
          );
        }
        if (block.type === "rule") return <hr key={key} className="border-border" />;
        return <p key={key}>{renderInline(block.content, key)}</p>;
      })}
    </div>
  );
}
