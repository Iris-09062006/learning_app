import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/018_create_lesson_content_target.sql"),
  "utf8",
).replaceAll("\r\n", "\n");

describe("lesson content target migration", () => {
  it("creates a concurrency-safe unpublished lesson for an active admin", () => {
    expect(sql).toContain("create_lesson_content_target");
    expect(sql).toContain("p.is_active and p.role = 'admin'");
    expect(sql).toContain("where id = p_chapter_id\n  for update");
    expect(sql).toContain("coalesce(max(l.lesson_order), 0) + 1");
    expect(sql).toContain("values (v_chapter.id, v_title, v_next_order, false)");
    expect(sql).toContain("'lesson_content_target.created'");
  });

  it("hardens the security-definer function ACL", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain(
      "revoke all on function public.create_lesson_content_target(bigint, text) from public, anon",
    );
    expect(sql).toContain(
      "grant execute on function public.create_lesson_content_target(bigint, text) to authenticated",
    );
  });
});
