import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/025_pdf_to_course_pipeline.sql"), "utf8");
const publishHotfixSql = readFileSync(join(process.cwd(), "supabase/migrations/027_fix_course_publish_markdown_json_precedence.sql"), "utf8");
const multiSourceSql = readFileSync(join(process.cwd(), "supabase/migrations/030_topic_course_multi_source.sql"), "utf8");
const checkpointSql = readFileSync(join(
  process.cwd(),
  "supabase/migrations/031_lesson_generation_retry_checkpointing.sql"
), "utf8");

describe("PDF-to-Course migration", () => {
  it("creates normalized import, outline, Lesson content, review, and publication records", () => {
    for (const table of [
      "course_import_jobs", "course_drafts", "course_draft_objectives",
      "course_outline_lessons", "course_outline_lesson_objectives",
      "course_outline_lesson_sources", "lesson_content_drafts",
      "lesson_content_draft_citations", "course_import_reviews",
      "course_import_publications", "course_import_lesson_publications",
    ]) expect(sql).toContain(`create table public.${table}`);
  });

  it("separates outline, content generation, review, and atomic publish RPCs", () => {
    expect(sql).toContain("create or replace function public.create_course_outline");
    expect(sql).toContain("create or replace function public.prepare_course_lesson_generation");
    expect(sql).toContain("create or replace function public.persist_lesson_content_draft");
    expect(sql).toContain("create or replace function public.publish_course_import_job");
    expect(sql).toContain("where id = p_job_id for update");
    expect(sql).toContain("v_job.status <> 'ready_to_publish'");
    expect(sql).toContain("v_job.status not in ('content_review', 'ready_to_publish')");
    expect(sql).toContain("revised_item.section->'citationChunkIndexes' is distinct from current_item.section->'citationChunkIndexes'");
  });

  it("never creates Exercises during Course import", () => {
    expect(sql).not.toMatch(/insert\s+into\s+public\.(generated_exercises|exercises|exercise_options|exercise_solutions)/i);
    expect(sql).not.toMatch(/update\s+public\.(generated_exercises|exercises)/i);
  });

  it("extracts JSON section fields before concatenating Markdown", () => {
    const safeMarkdownExpression = "'## ' || (section->>'heading') || E'\\n\\n' || (section->>'bodyMarkdown')";

    expect(sql).toContain(safeMarkdownExpression);
    expect(publishHotfixSql).toContain(safeMarkdownExpression);
    expect(publishHotfixSql).not.toContain("'## ' || section->>'heading'");
  });

  it("authorizes active Admins and hardens every state-changing function", () => {
    expect(sql).toContain("p.is_active and p.role = 'admin'");
    expect(sql.match(/security definer/g)?.length).toBeGreaterThanOrEqual(8);
    expect(sql.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(8);
    expect(sql).toContain("revoke all on function public.publish_course_import_job");
    expect(sql).toContain("from public, anon");
  });

  it("initializes a job on upload and persists resolved states", () => {
    expect(sql).toContain("create trigger initialize_course_import_job_after_source");
    expect(sql).toContain("after insert on public.source_documents");
    expect(sql).toContain("status = 'published', published_course_id = v_course.id");
    expect(sql).toContain("v_next := 'rejected'");
  });
});

describe("topic Course multi-source compatibility migration", () => {
  it("adds nullable workflow idempotency fields without changing legacy defaults", () => {
    expect(multiSourceSql).toContain("add column initialize_import_job boolean not null default true");
    expect(multiSourceSql).toContain("add column initialization_key uuid");
    expect(multiSourceSql).toContain("add column initialization_fingerprint text");
    expect(multiSourceSql).toContain("course_import_jobs_initialization_key_unique");
    expect(multiSourceSql).toContain("where initialization_key is not null");
    expect(multiSourceSql).toContain("prevent_course_import_initialization_change");
  });

  it("creates validated Admin-only provenance metadata", () => {
    expect(multiSourceSql).toContain("create table public.source_document_metadata");
    expect(multiSourceSql).toContain("source_type in ('file', 'web_page')");
    expect(multiSourceSql).toContain("ingestion_method in ('uploaded', 'manual_url', 'discovered')");
    expect(multiSourceSql).toContain("authority_score is null or authority_score between 0 and 1");
    expect(multiSourceSql).toContain("source_document_metadata_canonical_url_idx");
    expect(multiSourceSql).toContain("alter table public.source_document_metadata enable row level security");
    expect(multiSourceSql).toContain('create policy "Active admins view source document metadata"');
    expect(multiSourceSql).toContain("grant select on table public.source_document_metadata, public.course_import_job_sources");
  });

  it("creates an exclusive, ordered, bounded ownership bridge", () => {
    expect(multiSourceSql).toContain("create table public.course_import_job_sources");
    expect(multiSourceSql).toContain("primary key (job_id, source_document_id)");
    expect(multiSourceSql).toContain("unique (source_document_id)");
    expect(multiSourceSql).toContain("unique (job_id, source_order)");
    expect(multiSourceSql).toContain("source_order between 0 and 7");
    expect(multiSourceSql).toContain("relevance_score is null or relevance_score between 0 and 1");
    expect(multiSourceSql).toContain("COURSE_IMPORT_ANCHOR_DRIFT");
  });

  it("backfills one file metadata row and one order-zero anchor bridge idempotently", () => {
    expect(multiSourceSql).toMatch(/insert into public\.source_document_metadata[\s\S]*select source\.id, 'file', 'uploaded'/);
    expect(multiSourceSql).toMatch(/insert into public\.course_import_job_sources[\s\S]*select job\.id, job\.source_document_id, 0/);
    expect(multiSourceSql.match(/on conflict \(source_document_id\) do nothing/g)?.length).toBeGreaterThanOrEqual(2);
    expect(multiSourceSql).toContain("SOURCE_METADATA_BACKFILL_INCOMPLETE");
    expect(multiSourceSql).toContain("COURSE_IMPORT_ANCHOR_BACKFILL_INVALID");
  });

  it("preserves production-like historical records while backfilling exactly one legacy bridge", () => {
    const legacyJobs = [
      { id: 41, sourceDocumentId: 101, status: "outline_review" },
      { id: 42, sourceDocumentId: 102, status: "published" },
      { id: 43, sourceDocumentId: 103, status: "content_review" },
    ];
    const protectedHistory = {
      courseDrafts: [{ id: 501, jobId: 41, revision: 1, title: "Historical outline" }],
      lessonContentDrafts: [{ id: 601, outlineLessonId: 701, revision: 2, sections: [{ bodyMarkdown: "Keep verbatim" }] }],
      publications: [{ id: 801, jobId: 42, courseId: 901 }],
      curriculum: [{ courseId: 901, chapterId: 902, lessonId: 903, content: "Published content" }],
    };
    const before = JSON.stringify(protectedHistory);
    const bridgeRows = legacyJobs.map((job) => ({
      jobId: job.id, sourceDocumentId: job.sourceDocumentId, sourceOrder: 0,
    }));
    const metadataRows = legacyJobs.map((job) => ({
      sourceDocumentId: job.sourceDocumentId, sourceType: "file", ingestionMethod: "uploaded",
    }));

    expect(bridgeRows).toHaveLength(legacyJobs.length);
    expect(new Set(bridgeRows.map((row) => row.sourceDocumentId)).size).toBe(legacyJobs.length);
    expect(legacyJobs.every((job) => bridgeRows.filter((row) => row.jobId === job.id).length === 1)).toBe(true);
    expect(legacyJobs.every((job) => bridgeRows.some((row) => row.jobId === job.id
      && row.sourceOrder === 0 && row.sourceDocumentId === job.sourceDocumentId))).toBe(true);
    expect(metadataRows).toHaveLength(legacyJobs.length);
    expect(JSON.stringify(protectedHistory)).toBe(before);
  });

  it("locks every Phase 5 privileged mutation to authenticated active Admin execution", () => {
    const signatures = [
      "materialize_course_import_source(text, text, text, bigint, text, text, text, text, text, text, numeric, bigint, timestamptz)",
      "initialize_course_import_from_sources(uuid, jsonb)",
      "attach_course_import_source(bigint, bigint, numeric)",
      "detach_course_import_source(bigint, bigint)",
      "remove_staged_course_import_source(bigint)",
      "create_course_outline_for_job(bigint, jsonb, text, text)",
      "persist_lesson_content_draft_for_job(bigint, bigint, text, text, integer, jsonb, jsonb, text, text)",
      "publish_course_import_job(bigint, text)",
    ];
    for (const signature of signatures) {
      expect(multiSourceSql).toContain(`revoke all on function public.${signature} from public, anon`);
      expect(multiSourceSql).toContain(`grant execute on function public.${signature} to authenticated`);
    }
    expect(multiSourceSql.match(/security definer set search_path = ''/g)?.length).toBeGreaterThanOrEqual(signatures.length);
    expect(multiSourceSql.match(/p\.is_active and p\.role = 'admin'/g)?.length).toBeGreaterThanOrEqual(signatures.length);
    expect(multiSourceSql).not.toMatch(/grant execute on function public\.(?:materialize|initialize_course_import_from_sources|attach|detach|remove_staged|create_course_outline_for_job|persist_lesson_content_draft_for_job|publish_course_import_job)[^;]+ to (?:public|anon)/i);
  });

  it("dual-writes legacy inserts but leaves explicitly staged inserts unattached", () => {
    const triggerBody = multiSourceSql.slice(
      multiSourceSql.indexOf("create or replace function public.initialize_course_import_job()"),
      multiSourceSql.indexOf("create or replace function public.materialize_course_import_source")
    );
    expect(triggerBody).toContain("if not new.initialize_import_job then");
    expect(triggerBody).toContain("return new");
    expect(triggerBody).toContain("insert into public.course_import_jobs");
    expect(triggerBody).toContain("insert into public.course_import_job_sources");
    expect(triggerBody).toContain("values (v_job_id, new.id, 0)");
  });

  it("materializes one retryable source without creating a job or bridge", () => {
    const body = multiSourceSql.slice(
      multiSourceSql.indexOf("create or replace function public.materialize_course_import_source"),
      multiSourceSql.indexOf("create or replace function public.initialize_course_import_from_sources")
    );
    expect(body).toContain("p.is_active and p.role = 'admin'");
    expect(body).toContain("initialize_import_job");
    expect(body).toContain("p_size_bytes not between 1 and 10485760");
    expect(body).toContain("IDEMPOTENCY_CONFLICT");
    expect(body).not.toContain("insert into public.course_import_jobs");
    expect(body).not.toContain("insert into public.course_import_job_sources");
    expect(multiSourceSql).toContain("revoke all on function public.materialize_course_import_source");
  });

  it("serializes duplicate and overlapping ordered-set initialization to at most one job", () => {
    const body = multiSourceSql.slice(
      multiSourceSql.indexOf("create or replace function public.initialize_course_import_from_sources"),
      multiSourceSql.indexOf("create or replace function public.attach_course_import_source")
    );
    expect(body).toContain("v_source_count not between 1 and 8");
    expect(body).toContain("order by source.id");
    expect(body).toContain("for update of source");
    expect(body.match(/where initialization_key = p_initialization_key/g)?.length).toBeGreaterThanOrEqual(2);
    expect(body).toContain("initialization_fingerprint <> v_fingerprint");
    expect(body).toContain("source.status <> 'extracted'");
    expect(body).toContain("not exists (select 1 from public.document_chunks");
    expect(body).toContain("exists (select 1 from public.course_import_job_sources");
    expect(body).toContain("values (v_anchor_id, v_actor_id, 'uploaded', p_initialization_key, v_fingerprint)");
    expect(body).toContain("item.ordinality::integer - 1");
    expect(body.match(/insert into public\.course_import_jobs/g)).toHaveLength(1);
    expect(multiSourceSql).not.toContain("promoteUsableCourseImportSource");
  });

  it("supports guarded attach, detach, anchor reassignment, and staged removal", () => {
    expect(multiSourceSql).toContain("create or replace function public.attach_course_import_source");
    expect(multiSourceSql).toContain("SOURCE_ALREADY_OWNED");
    expect(multiSourceSql).toContain("SOURCE_LIMIT_EXCEEDED");
    expect(multiSourceSql).toContain("create or replace function public.detach_course_import_source");
    expect(multiSourceSql).toContain("LAST_SOURCE_REQUIRED");
    expect(multiSourceSql).toContain("source_document_id = v_anchor_id");
    expect(multiSourceSql).toContain("status = case when current_outline_revision > 0 then 'processing'");
    expect(multiSourceSql).toContain("EVIDENCE_LOCKED");
    expect(multiSourceSql).toContain("create or replace function public.remove_staged_course_import_source");
    expect(multiSourceSql).toContain("SOURCE_REMOVAL_FORBIDDEN");
  });

  it("persists canonical job-owned outline and Lesson citations while retaining legacy wrappers", () => {
    expect(multiSourceSql).toContain("create or replace function public.create_course_outline_for_job");
    expect(multiSourceSql).toContain("v_lesson->'sourceChunkIds'");
    expect(multiSourceSql).toMatch(/bridge\.job_id = p_job_id and bridge\.source_document_id = chunk\.source_document_id/);
    expect(multiSourceSql).toContain("create or replace function public.create_course_outline(");
    expect(multiSourceSql).toContain("chunk.source_document_id = p_source_document_id");
    expect(multiSourceSql).toContain("create or replace function public.persist_lesson_content_draft_for_job");
    expect(multiSourceSql).toContain("allowed.outline_lesson_id = p_outline_lesson_id");
    expect(multiSourceSql).toContain("chunk.id = (v_citation->>'documentChunkId')::bigint");
    expect(multiSourceSql).toContain("create or replace function public.persist_lesson_content_draft(");
    expect(multiSourceSql).not.toMatch(/update\s+public\.(course_drafts|course_outline_lessons|lesson_content_drafts|lesson_content_draft_citations)/i);
  });

  it("archives every attached source inside the existing idempotent publication transaction", () => {
    const body = multiSourceSql.slice(multiSourceSql.indexOf("create or replace function public.publish_course_import_job"));
    expect(body).toContain("if v_job.status = 'published' then");
    expect(body).toContain("'sourceDocumentIds', v_source_ids");
    expect(body).toContain("from public.course_import_job_sources bridge");
    expect(body).toContain("bridge.job_id = v_job.id and bridge.source_document_id = source.id");
    expect(body).toContain("insert into public.course_import_publications");
    expect(body).toContain("status = 'published', published_course_id = v_course.id");
    expect(body).not.toMatch(/insert\s+into\s+public\.(generated_exercises|exercises|exercise_options|exercise_solutions)/i);
  });

  it("does not replace protected schema or Continue semantics", () => {
    expect(multiSourceSql).not.toMatch(/alter\s+table\s+public\.(course_drafts|course_outline_lessons|lesson_content_drafts|lesson_content_draft_citations|courses|chapters|lessons)/i);
    expect(multiSourceSql).not.toContain("create or replace function public.prepare_course_lesson_generation");
    expect(multiSourceSql).not.toMatch(/\b(embeddings?|pgvector|research_sessions)\b/i);
  });
});

describe("Lesson generation retry checkpoint migration", () => {
  it("reuses the approved outline and derives completion from ready per-Lesson drafts", () => {
    expect(checkpointSql).toContain(
      "coalesce(v_job.approved_outline_revision, v_job.current_outline_revision)"
    );
    expect(checkpointSql).toContain("d.revision = v_outline_revision");
    expect(checkpointSql).toContain("draft.revision = v_job.approved_outline_revision");
    expect(checkpointSql).toContain("content.status = 'ready'");
    expect(checkpointSql).toContain("set status = 'generating_content'");
    expect(checkpointSql).toContain("create or replace function public.reconcile_course_lesson_generation");
    expect(checkpointSql).toContain("set status = 'content_review', error_code = null");
    expect(checkpointSql).toContain("approved_outline_revision = v_outline_revision");
  });

  it("preserves completed Lesson checkpoints when preparing or failing a retry", () => {
    expect(checkpointSql).not.toMatch(/(?:delete\s+from|truncate)\s+public\.lesson_content_drafts/i);
    expect(checkpointSql).not.toMatch(/update\s+public\.lesson_content_drafts/i);
    const failBody = sql.slice(
      sql.indexOf("create or replace function public.fail_course_import_job"),
      sql.indexOf("create or replace function public.revise_lesson_content_draft")
    );
    expect(failBody).toContain("update public.course_import_jobs set status = 'failed'");
    expect(failBody).not.toContain("lesson_content_drafts");
  });

  it("keeps retry preparation restricted to authenticated active Admins", () => {
    expect(checkpointSql).toContain("p.is_active and p.role = 'admin'");
    expect(checkpointSql).toContain("security definer set search_path = ''");
    expect(checkpointSql).toContain(
      "revoke all on function public.prepare_course_lesson_generation(bigint) from public, anon"
    );
    expect(checkpointSql).toContain(
      "grant execute on function public.prepare_course_lesson_generation(bigint) to authenticated"
    );
    expect(checkpointSql).toContain(
      "revoke all on function public.reconcile_course_lesson_generation(bigint) from public, anon"
    );
    expect(checkpointSql).toContain(
      "grant execute on function public.reconcile_course_lesson_generation(bigint) to authenticated"
    );
  });
});
