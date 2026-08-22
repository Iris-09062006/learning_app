import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/020_separate_content_target_flows.sql"),
  "utf8",
).replaceAll("\r\n", "\n").toLowerCase();

describe("content destination migration", () => {
  it("creates course/chapter/lesson atomically for new content", () => {
    expect(sql).toContain("create or replace function public.create_content_curriculum");
    expect(sql).toContain("insert into public.courses");
    expect(sql).toContain("insert into public.chapters");
    expect(sql).toContain("insert into public.lessons");
    expect(sql).toContain("'lessonid', v_lesson.id");
  });

  it("appends a chapter and lesson only after locking an existing course", () => {
    expect(sql).toContain("create or replace function public.create_content_target_in_course");
    expect(sql).toContain("where id = p_course_id\n  for update");
    expect(sql).toContain("raise exception 'course_not_found'");
    expect(sql).toContain("coalesce(max(ch.chapter_order), 0) + 1");
  });

  it("keeps both operations restricted to active admins", () => {
    expect(sql.match(/p\.is_active and p\.role = 'admin'/g)).toHaveLength(2);
    expect(sql.match(/security definer/g)).toHaveLength(2);
    expect(sql.match(/set search_path = ''/g)).toHaveLength(2);
    expect(sql).toContain("revoke all on function public.create_content_target_in_course(bigint, text) from public, anon");
    expect(sql).toContain("grant execute on function public.create_content_target_in_course(bigint, text) to authenticated");
  });
});
