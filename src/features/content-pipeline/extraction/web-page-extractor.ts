import "server-only";

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

import { normalizeDocumentText } from "./document-extractor";

const MAX_DOM_ELEMENTS = 20_000;
const MIN_READABLE_CHARACTERS = 80;

export interface ExtractedWebPage {
  title: string;
  text: string;
  language: string | null;
  excerpt: string | null;
  publishedTime: string | null;
}

export class WebPageExtractionError extends Error {
  constructor(public readonly code: "EMPTY_PAGE" | "PAGE_TOO_COMPLEX" | "UNREADABLE_PAGE") {
    super(code === "EMPTY_PAGE" ? "The page does not contain readable text."
      : code === "PAGE_TOO_COMPLEX" ? "The page is too complex to parse safely."
        : "The page main content could not be read safely.");
    this.name = "WebPageExtractionError";
  }
}

function fallbackTitle(document: Document, url: string) {
  const title = normalizeDocumentText(document.title ?? "");
  return title || new URL(url).hostname;
}

export function extractWebPage(input: {
  body: Buffer;
  contentType: "text/html" | "text/plain";
  charset?: string | null;
  url: string;
}): ExtractedWebPage {
  let decoded: string;
  try {
    decoded = new TextDecoder(input.charset || "utf-8", { fatal: true }).decode(input.body);
  } catch {
    throw new WebPageExtractionError("UNREADABLE_PAGE");
  }

  if (input.contentType === "text/plain") {
    const text = normalizeDocumentText(decoded);
    if (text.length < MIN_READABLE_CHARACTERS) throw new WebPageExtractionError("EMPTY_PAGE");
    return { title: new URL(input.url).hostname, text, language: null, excerpt: null, publishedTime: null };
  }

  // jsdom does not execute scripts or load subresources unless runScripts/resources are explicitly enabled.
  const dom = new JSDOM(decoded, { url: input.url, contentType: "text/html" });
  const document = dom.window.document;
  if (document.getElementsByTagName("*").length > MAX_DOM_ELEMENTS) {
    dom.window.close();
    throw new WebPageExtractionError("PAGE_TOO_COMPLEX");
  }
  document.querySelectorAll("script,style,noscript,template,iframe,object,embed").forEach((node) => node.remove());
  const article = new Readability(document, {
    maxElemsToParse: MAX_DOM_ELEMENTS,
    charThreshold: MIN_READABLE_CHARACTERS,
    disableJSONLD: true,
  }).parse();
  const title = normalizeDocumentText(article?.title ?? fallbackTitle(document, input.url));
  const text = normalizeDocumentText(article?.textContent ?? "");
  dom.window.close();
  if (!text || text.length < MIN_READABLE_CHARACTERS) throw new WebPageExtractionError("EMPTY_PAGE");
  return {
    title: title || new URL(input.url).hostname,
    text,
    language: article?.lang?.trim() || null,
    excerpt: article?.excerpt ? normalizeDocumentText(article.excerpt) : null,
    publishedTime: article?.publishedTime?.trim() || null,
  };
}
