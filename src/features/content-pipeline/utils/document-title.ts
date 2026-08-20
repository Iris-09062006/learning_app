export function documentTitleFromFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop()?.trim() ?? "";
  const withoutExtension = basename.replace(/\.[^.]+$/, "").normalize("NFKC").trim();
  return (withoutExtension || "Tài liệu").slice(0, 150);
}

export function documentTitleFromWebSource(title: string | null | undefined, canonicalUrl: string): string {
  const normalizedTitle = title?.normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (normalizedTitle) return normalizedTitle.slice(0, 300);
  return new URL(canonicalUrl).hostname.toLowerCase().replace(/\.$/u, "").slice(0, 300);
}
