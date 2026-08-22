import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/015_document_to_lesson.sql"),
  "utf8"
).replaceAll("\r\n", "\n");

describe("document-to-lesson migration", () => {
  it("creates a private, bounded source bucket and protected pipeline tables", () => {
    expect(sql).toContain("'lesson-sources'");
    expect(sql).toContain("false,\n  10485760");
    for (const table of [
      "source_documents",
      "document_chunks",
      "lesson_drafts",
      "lesson_draft_citations",
      "lesson_draft_reviews",
      "lesson_draft_publications",
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("p.role = 'admin'");
    expect(sql).not.toContain("to anon\n  using");
  });

  it("keeps extraction, generation, review and publication atomic", () => {
    expect(sql).toContain("replace_document_chunks");
    expect(sql).toContain("create_lesson_draft");
    expect(sql).toContain("review_lesson_draft");
    expect(sql).toContain("revise_lesson_draft");
    expect(sql).toContain("publish_lesson_draft");
    expect(sql).toContain("for update");
    expect(sql).toContain("CITATIONS_INVALID");
    expect(sql).toContain("approved_revision <> v_draft.revision");
    expect(sql).toContain("'lesson_draft.published'");
  });

  it("narrows every security-definer function", () => {
    expect(sql.match(/security definer/g)).toHaveLength(5);
    expect(sql.match(/set search_path = ''/g)).toHaveLength(5);
    expect(sql.match(/revoke all on function/g)).toHaveLength(6);
    expect(sql.match(/grant execute on function/g)).toHaveLength(6);
    expect(sql).toContain("revoke all on table public.source_documents from anon, authenticated");
    expect(sql).toContain("grant select, insert, update on table public.source_documents to authenticated");
    expect(sql).toContain("revoke all on function public.publish_generated_exercise(bigint) from public, anon");
  });
});
