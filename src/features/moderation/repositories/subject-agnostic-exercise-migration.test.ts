import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/032_subject_agnostic_exercises.sql"),
  "utf8"
);

describe("TASK-097 subject-agnostic Exercise migration", () => {
  it.each([
    "multiple_choice", "true_false", "short_answer", "ordering", "matching", "scenario",
  ])("adds the %s enum value without removing coding values", (type) => {
    expect(migration).toContain(`alter type public.exercise_type add value if not exists '${type}'`);
  });

  it("keeps coding compatibility and replaces every authoritative RPC boundary", () => {
    expect(migration).toContain("'predict_output', 'fix_the_bug'");
    for (const name of [
      "private.generated_exercise_content_is_valid",
      "public.get_lesson_exercise_generation_context",
      "public.create_generated_exercise_draft",
      "public.review_generated_exercise_draft",
      "public.publish_generated_exercise",
      "public.submit_exercise",
    ]) {
      expect(migration).toContain(`create or replace function ${name}`);
    }
    expect(migration).toContain("'lessonSummary', coalesce(outline.summary, '')");
    expect(migration).toContain("if not (p_content ? 'type') then");
  });

  it("stores only type-appropriate public data and keeps solutions server-side", () => {
    expect(migration).toContain("case when v_draft.exercise_type in ('predict_output', 'fix_the_bug')");
    expect(migration).toContain("jsonb_build_object('expectedAnswer'");
    expect(migration).toContain("jsonb_build_object('correctOrderOptionIds'");
    expect(migration).toContain("jsonb_build_object('matches'");
    expect(migration).not.toMatch(/drop\s+(table|type|column)/i);
    expect(migration).not.toMatch(/update\s+public\.generated_exercises\s+set\s+content/i);
  });
});
