import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import {
  attachCourseImportSource,
  detachCourseImportSource,
  getCourseImportCompatibilityDiagnostics,
  getCourseImportGenerationContext,
  getCourseImport,
  getCourseImportOutlineState,
  getGenerationContext,
  initializeCourseImportFromSources,
  listContentChapters,
  listContentCourses,
  listContentTargets,
  listCourseDraftBatches,
  listCourseImportSources,
  materializeCourseImportSource,
  prepareCourseLessonGeneration,
  reconcileCourseLessonGeneration,
  persistCourseOutlineForJob,
  persistCourseLessonContentForJob,
  removeStagedCourseImportSource,
  uploadSourceObject,
} from "./content-pipeline-repository";

describe("Course outline persistence diagnostics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("surfaces only safe PostgREST metadata while preserving DATABASE_ERROR behavior", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "P0004",
        message: "JOB_STATE_INVALID",
        details: null,
        hint: null,
      },
    });
    const warningMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });
    const outline = {
      title: "Private outline title",
      description: "Private outline description",
      learningObjectives: ["Private objective"],
      lessons: [
        {
          clientKey: "lesson-1",
          title: "Private lesson title",
          summary: "Private lesson summary",
          learningObjectives: ["Private lesson objective"],
          sourceRefs: [{ sourceDocumentId: 9, chunkIndex: 0 }],
          sourceChunkIds: [101],
        },
      ],
    };

    await expect(persistCourseOutlineForJob({
      jobId: 37,
      outline,
      provider: "9router",
      model: "gemini-3.7-flash-tiered",
    })).rejects.toThrow("DATABASE_ERROR");

    expect(warningMock).toHaveBeenCalledWith("[outline-persistence-diagnostic]", {
      stage: "outline_persistence",
      jobId: 37,
      rpcFunction: "create_course_outline_for_job",
      postgresCode: "P0004",
      message: "JOB_STATE_INVALID",
      details: null,
      hint: null,
    });
    const logged = JSON.stringify(warningMock.mock.calls);
    expect(logged).not.toContain("Private outline");
    expect(logged).not.toContain("Private lesson");
    expect(logged).not.toContain("9router");
    expect(logged).not.toContain("gemini-3.7-flash-tiered");
    warningMock.mockRestore();
  });
});

describe("pedagogical Lesson persistence compatibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the unchanged immutable RPC input without transient pipeline artifacts", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });
    await persistCourseLessonContentForJob({
      jobId: 61,
      outlineLessonId: 71,
      draft: {
        title: "Nhập môn Mạng máy tính",
        summary: "Tiến trình khái niệm có chủ đích.",
        estimatedMinutes: 15,
        sections: [{ heading: "Nền tảng kết nối", bodyMarkdown: "Thiết bị trao đổi dữ liệu.",
          citationChunkIndexes: [0], citationSourceRefs: [{ sourceDocumentId: 9, chunkIndex: 0 }] }],
      },
      citations: [{ sectionIndex: 0, documentChunkId: 101 }],
      provider: "9router",
      model: "gemini-3.7-flash",
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("persist_lesson_content_draft_for_job", {
      p_job_id: 61,
      p_outline_lesson_id: 71,
      p_title: "Nhập môn Mạng máy tính",
      p_summary: "Tiến trình khái niệm có chủ đích.",
      p_estimated_minutes: 15,
      p_sections: [{ heading: "Nền tảng kết nối", bodyMarkdown: "Thiết bị trao đổi dữ liệu.",
        citationChunkIndexes: [0], citationSourceRefs: [{ sourceDocumentId: 9, chunkIndex: 0 }] }],
      p_citations: [{ sectionIndex: 0, documentChunkId: 101 }],
      p_provider: "9router",
      p_model: "gemini-3.7-flash",
    });
    expect(JSON.stringify(rpc.mock.calls[0][1])).not.toMatch(/synthesis|blueprint|purpose|finding|correction/);
  });

  it("returns the approved generation state from retry preparation", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { jobId: 61, status: "generating_content", outlineRevision: 4 },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(prepareCourseLessonGeneration(61)).resolves.toEqual({
      jobId: 61,
      status: "generating_content",
      outlineRevision: 4,
    });
    expect(rpc).toHaveBeenCalledWith("prepare_course_lesson_generation", { p_job_id: 61 });
  });

  it("rejects a malformed retry-preparation result", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { jobId: 61, status: "generating_content", outlineRevision: 0 },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(prepareCourseLessonGeneration(61)).rejects.toThrow("DATABASE_ERROR");
  });

  it("reconciles an all-complete retry without writing another Lesson draft", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { jobId: 61, status: "content_review", outlineRevision: 4 },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(reconcileCourseLessonGeneration(61)).resolves.toEqual({
      jobId: 61,
      status: "content_review",
      outlineRevision: 4,
    });
    expect(rpc).toHaveBeenCalledWith("reconcile_course_lesson_generation", { p_job_id: 61 });
  });
});

describe("source object upload", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("distinguishes a deterministic object conflict from an ambiguous storage error", async () => {
    const upload = vi.fn()
      .mockResolvedValueOnce({ error: { statusCode: 409, message: "The resource already exists" } })
      .mockResolvedValueOnce({ error: { statusCode: 503, message: "Unavailable" } });
    mocks.createServerSupabaseClient.mockResolvedValue({
      storage: { from: vi.fn().mockReturnValue({ upload }) },
    });
    const file = new File(["source"], "source.md", { type: "text/markdown" });
    await expect(uploadSourceObject("admin/key/source.md", file)).rejects.toThrow("STORAGE_OBJECT_EXISTS");
    await expect(uploadSourceObject("admin/key/source.md", file)).rejects.toThrow("STORAGE_ERROR");
  });
});

function maybeSingleQuery(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

function orderedQuery(data: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

function chainableQuery(data: unknown) {
  const result = { data, error: null };
  const query = {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), is: vi.fn(), order: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

describe("Course outline generation state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the approved revision directly without loading outline content", async () => {
    const query = maybeSingleQuery({
      status: "failed",
      error_code: "LESSON_GENERATION_FAILED",
      current_outline_revision: 2,
      approved_outline_revision: 2,
    });
    const from = vi.fn().mockReturnValue(query);
    mocks.createAdminSupabaseClient.mockReturnValue({ from });

    await expect(getCourseImportOutlineState(37)).resolves.toEqual({
      status: "failed",
      errorCode: "LESSON_GENERATION_FAILED",
      currentOutlineRevision: 2,
      approvedOutlineRevision: 2,
    });
    expect(from).toHaveBeenCalledWith("course_import_jobs");
    expect(query.eq).toHaveBeenCalledWith("id", 37);
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("loads the approved revision and latest ready Lesson checkpoint", async () => {
    const rows: Record<string, unknown[]> = {
      course_import_jobs: [{
        id: 37, source_document_id: 9, status: "failed", error_code: "LESSON_GENERATION_FAILED",
        current_outline_revision: 2, approved_outline_revision: 1, published_course_id: null,
        created_at: "2026-08-21T00:00:00Z", updated_at: "2026-08-21T00:00:01Z",
      }],
      course_drafts: [
        { id: 101, job_id: 37, revision: 1, title: "Approved outline", description: "Approved" },
        { id: 102, job_id: 37, revision: 2, title: "Unapproved current outline", description: "Current" },
      ],
      course_import_job_sources: [
        { job_id: 37, source_document_id: 9, source_order: 0, relevance_score: null },
      ],
      source_documents: [{ id: 9, original_filename: "source.md", status: "ready_for_review", error_code: null }],
      source_document_metadata: [{
        source_document_id: 9, source_type: "file", ingestion_method: "uploaded", title: "source.md",
        source_url: null, canonical_url: null, domain: null, authority_score: null,
      }],
      document_chunks: [{ id: 501, source_document_id: 9 }],
      course_draft_objectives: [
        { course_draft_id: 101, objective_order: 0, objective: "Approved objective" },
      ],
      course_outline_lessons: [
        { id: 201, course_draft_id: 101, client_key: "approved-1", lesson_order: 0,
          title: "Approved Lesson 1", summary: "Approved summary" },
        { id: 202, course_draft_id: 102, client_key: "current-1", lesson_order: 0,
          title: "Unapproved Lesson 1", summary: "Current summary" },
      ],
      course_outline_lesson_objectives: [
        { outline_lesson_id: 201, objective_order: 0, objective: "Approved Lesson objective" },
      ],
      course_outline_lesson_sources: [{
        outline_lesson_id: 201, source_order: 0, document_chunk_id: 501,
        document_chunks: { id: 501, source_document_id: 9, chunk_index: 0 },
      }],
      lesson_content_drafts: [
        { id: 302, outline_lesson_id: 201, revision: 2, title: "Failed revision", summary: "Failed",
          estimated_minutes: 10, sections: [], status: "failed", provider: "fake", model: "model" },
        { id: 301, outline_lesson_id: 201, revision: 1, title: "Ready checkpoint", summary: "Ready",
          estimated_minutes: 10, sections: [{ heading: "Ready", bodyMarkdown: "Ready",
            citationChunkIndexes: [0] }], status: "ready", provider: "fake", model: "model" },
      ],
      lesson_content_draft_citations: [{
        lesson_content_draft_id: 301, section_index: 0, document_chunk_id: 501, quote: "Evidence",
        document_chunks: { id: 501, source_document_id: 9, chunk_index: 0 },
      }],
    };
    const from = vi.fn((table: string) => chainableQuery(rows[table] ?? []));
    mocks.createAdminSupabaseClient.mockReturnValue({ from });

    await expect(getCourseImport(37)).resolves.toMatchObject({
      jobId: 37,
      status: "failed",
      outlineRevision: 1,
      approvedOutlineRevision: 1,
      title: "Approved outline",
      lessons: [{
        id: 201,
        title: "Approved Lesson 1",
        contentDraft: { id: 301, revision: 1, status: "ready", title: "Ready checkpoint" },
      }],
    });
  });
});

describe("getGenerationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads unpublished generation targets through the server-only Admin client", async () => {
    const document = { id: 5, status: "extracted" };
    const chunks = [{ id: 9, chunk_index: 0, content: "Nội dung" }];
    const lesson = {
      id: 1,
      title: "Nội suy Lagrange",
      chapter_id: 2,
      chapters: { id: 2, course_id: 2 },
    };
    const queries = new Map<string, ReturnType<typeof maybeSingleQuery> | ReturnType<typeof orderedQuery>>([
      ["source_documents", maybeSingleQuery(document)],
      ["document_chunks", orderedQuery(chunks)],
      ["lessons", maybeSingleQuery(lesson)],
    ]);
    mocks.createAdminSupabaseClient.mockReturnValue({
      from: vi.fn((table: string) => queries.get(table)),
    });

    await expect(getGenerationContext(5, 1)).resolves.toEqual({ document, chunks, lesson });
    expect(mocks.createAdminSupabaseClient).toHaveBeenCalledOnce();
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("lists unpublished curriculum through the server-only Admin client", async () => {
    const queries = new Map<string, ReturnType<typeof orderedQuery>>([
      [
        "lessons",
        orderedQuery([
          {
            id: 1,
            title: "Draft lesson",
            chapter_id: 2,
            chapters: {
              id: 2,
              title: "Draft chapter",
              course_id: 2,
              courses: { id: 2, title: "Draft course" },
            },
          },
        ]),
      ],
      [
        "chapters",
        orderedQuery([
          {
            id: 2,
            title: "Draft chapter",
            course_id: 2,
            courses: { id: 2, title: "Draft course" },
          },
        ]),
      ],
      ["courses", orderedQuery([{ id: 2, title: "Draft course" }])],
    ]);
    mocks.createAdminSupabaseClient.mockReturnValue({
      from: vi.fn((table: string) => queries.get(table)),
    });

    await expect(listContentTargets()).resolves.toEqual([
      {
        lessonId: 1,
        lessonTitle: "Draft lesson",
        chapterId: 2,
        chapterTitle: "Draft chapter",
        courseId: 2,
        courseTitle: "Draft course",
      },
    ]);
    await expect(listContentChapters()).resolves.toEqual([
      {
        chapterId: 2,
        chapterTitle: "Draft chapter",
        courseId: 2,
        courseTitle: "Draft course",
      },
    ]);
    await expect(listContentCourses()).resolves.toEqual([
      { courseId: 2, courseTitle: "Draft course" },
    ]);
    expect(queries.get("courses")?.is).toHaveBeenCalledWith("archived_at", null);
    expect(mocks.createAdminSupabaseClient).toHaveBeenCalledTimes(3);
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("groups unresolved Lesson drafts into one Course batch per source document", async () => {
    const rows = [1, 2].map((id) => ({
      id: 70 + id,
      source_document_id: 9,
      course_id: 31,
      chapter_id: 41,
      target_lesson_id: 50 + id,
      title: id === 1 ? "Biến" : "Hàm",
      summary: "Tóm tắt",
      estimated_minutes: 10,
      sections: [],
      status: "pending_review",
      revision: 1,
      approved_revision: null,
      provider: "9router",
      model: "model",
      published_at: null,
      created_at: "2026-08-10T00:00:00Z",
      updated_at: "2026-08-10T00:00:00Z",
      source_documents: { original_filename: "python.pdf", status: "ready_for_review" },
      courses: { title: "Python", description: "Khóa học" },
    }));
    const query = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    mocks.createAdminSupabaseClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) });

    await expect(listCourseDraftBatches()).resolves.toMatchObject([{
      sourceDocumentId: 9,
      courseId: 31,
      courseTitle: "Python",
      lessons: [{ id: 71 }, { id: 72 }],
    }]);
    expect(query.is).toHaveBeenCalledWith("courses.archived_at", null);
  });
});

describe("Phase 1 Course-import source ownership repository", () => {
  beforeEach(() => vi.clearAllMocks());

  function rpcClient(results: Record<string, unknown>) {
    return {
      rpc: vi.fn((name: string) => Promise.resolve({ data: results[name] ?? null, error: null })),
    };
  }

  it("materializes an unattached staged source through the hardened RPC", async () => {
    const supabase = rpcClient({
      materialize_course_import_source: { sourceDocumentId: 11, status: "uploaded", attached: false },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);
    await expect(materializeCourseImportSource({
      originalFilename: "snapshot.md",
      storagePath: "admin/key/snapshot.md",
      mimeType: "text/markdown",
      sizeBytes: 120,
      sourceType: "web_page",
      ingestionMethod: "manual_url",
      sourceUrl: "https://example.com/a",
      canonicalUrl: "https://example.com/a",
      title: "A",
      domain: "example.com",
      fetchedAt: "2026-08-13T00:00:00Z",
    })).resolves.toMatchObject({ sourceDocumentId: 11, attached: false });
    expect(supabase.rpc).toHaveBeenCalledWith("materialize_course_import_source", expect.objectContaining({
      p_storage_path: "admin/key/snapshot.md",
      p_source_type: "web_page",
      p_ingestion_method: "manual_url",
      p_source_url: "https://example.com/a",
      p_canonical_url: "https://example.com/a",
      p_title: "A",
      p_domain: "example.com",
      p_fetched_at: "2026-08-13T00:00:00Z",
    }));
  });

  it("accepts the explicit null job alias for an unattached materialization response", async () => {
    const supabase = rpcClient({
      materialize_course_import_source: {
        sourceDocumentId: 11, jobId: null, status: "uploaded", attached: false,
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);
    await expect(materializeCourseImportSource({
      originalFilename: "file.md",
      storagePath: "admin/key/file.md",
      mimeType: "text/markdown",
      sizeBytes: 120,
      sourceType: "file",
      ingestionMethod: "uploaded",
    })).resolves.toMatchObject({ sourceDocumentId: 11, jobId: null, attached: false });
  });

  it("validates atomic ordered-set initialization and its anchor alias", async () => {
    const supabase = rpcClient({
      initialize_course_import_from_sources: {
        jobId: 31, sourceDocumentId: 11, sourceDocumentIds: [11, 12], status: "uploaded",
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);
    await expect(initializeCourseImportFromSources({
      initializationKey: "11111111-1111-4111-8111-111111111111",
      sources: [{ sourceDocumentId: 11 }, { sourceDocumentId: 12, relevanceScore: 0.8 }],
    })).resolves.toMatchObject({ jobId: 31, sourceDocumentIds: [11, 12] });

    const invalid = rpcClient({
      initialize_course_import_from_sources: {
        jobId: 32, sourceDocumentId: 12, sourceDocumentIds: [11, 12], status: "uploaded",
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(invalid);
    await expect(initializeCourseImportFromSources({
      initializationKey: "22222222-2222-4222-8222-222222222222",
      sources: [{ sourceDocumentId: 11 }, { sourceDocumentId: 12 }],
    })).rejects.toThrow("DATABASE_ERROR");
  });

  it("requires coherent attach, detach, and staged-removal results", async () => {
    const supabase = rpcClient({
      attach_course_import_source: { jobId: 31, sourceDocumentId: 13, sourceOrder: 2, attached: true },
      detach_course_import_source: {
        jobId: 31, sourceDocumentId: 11, sourceDocumentIds: [12, 13], anchorSourceDocumentId: 12,
      },
      remove_staged_course_import_source: {
        sourceDocumentId: 14, storageBucket: "lesson-sources", storagePath: "admin/key/file.md", removed: true,
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);
    await expect(attachCourseImportSource({ jobId: 31, sourceDocumentId: 13 })).resolves.toMatchObject({ sourceOrder: 2 });
    await expect(detachCourseImportSource({ jobId: 31, sourceDocumentId: 11 })).resolves.toMatchObject({
      anchorSourceDocumentId: 12,
    });
    await expect(removeStagedCourseImportSource(14)).resolves.toMatchObject({ removed: true });
  });

  it("normalizes job sources in bridge order without exposing chunk content", async () => {
    const bridgeQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { job_id: 31, source_document_id: 12, source_order: 1, relevance_score: 0.7 },
          { job_id: 31, source_document_id: 11, source_order: 0, relevance_score: null },
        ], error: null,
      }),
    };
    const terminal = (data: unknown[]) => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data, error: null }),
    });
    const tables = new Map<string, unknown>([
      ["course_import_job_sources", bridgeQuery],
      ["source_documents", terminal([
        { id: 11, original_filename: "a.pdf", status: "extracted", error_code: null },
        { id: 12, original_filename: "b.md", status: "ready_for_review", error_code: null },
      ])],
      ["source_document_metadata", terminal([
        { source_document_id: 11, source_type: "file", ingestion_method: "uploaded", title: "A", source_url: null, canonical_url: null, domain: null, authority_score: null },
        { source_document_id: 12, source_type: "web_page", ingestion_method: "manual_url", title: "B", source_url: "https://b.test", canonical_url: "https://b.test", domain: "b.test", authority_score: 0.5 },
      ])],
      ["document_chunks", terminal([
        { id: 101, source_document_id: 11 },
        { id: 102, source_document_id: 12 },
        { id: 103, source_document_id: 12 },
      ])],
    ]);
    mocks.createAdminSupabaseClient.mockReturnValue({ from: vi.fn((table: string) => tables.get(table)) });
    await expect(listCourseImportSources(31)).resolves.toEqual([
      expect.objectContaining({ sourceDocumentId: 11, sourceOrder: 0, filename: "a.pdf", chunkCount: 1 }),
      expect.objectContaining({ sourceDocumentId: 12, sourceOrder: 1, domain: "b.test", chunkCount: 2 }),
    ]);
    const result = await listCourseImportSources(31);
    expect(result).not.toHaveProperty("content");
  });

  it("reads canonical chunks in source order while keeping colliding local indexes distinct", async () => {
    const bridgeQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { job_id: 31, source_document_id: 11, source_order: 0, relevance_score: null },
          { job_id: 31, source_document_id: 12, source_order: 1, relevance_score: null },
        ], error: null,
      }),
    };
    const terminal = (data: unknown[]) => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data, error: null }),
    });
    const sourceClient = {
      from: vi.fn((table: string) => ({
        course_import_job_sources: bridgeQuery,
        source_documents: terminal([
          { id: 11, original_filename: "a.md", status: "extracted", error_code: null },
          { id: 12, original_filename: "b.md", status: "extracted", error_code: null },
        ]),
        source_document_metadata: terminal([
          { source_document_id: 11, source_type: "file", ingestion_method: "uploaded", title: "A", source_url: null, canonical_url: null, domain: null, authority_score: null },
          { source_document_id: 12, source_type: "file", ingestion_method: "uploaded", title: "B", source_url: null, canonical_url: null, domain: null, authority_score: null },
        ]),
        document_chunks: terminal([
          { id: 101, source_document_id: 11 },
          { id: 202, source_document_id: 12 },
        ]),
      })[table]),
    };
    const chunkQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn(),
    };
    chunkQuery.order.mockReturnValueOnce(chunkQuery).mockResolvedValueOnce({
      data: [
        { id: 202, source_document_id: 12, chunk_index: 0, content: "B" },
        { id: 101, source_document_id: 11, chunk_index: 0, content: "A" },
      ], error: null,
    });
    mocks.createAdminSupabaseClient
      .mockReturnValueOnce(sourceClient)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue(chunkQuery) });

    await expect(getCourseImportGenerationContext(31)).resolves.toMatchObject({
      jobId: 31,
      chunks: [
        { documentChunkId: 101, sourceDocumentId: 11, sourceOrder: 0, sourceTitle: "A", chunkIndex: 0, content: "A" },
        { documentChunkId: 202, sourceDocumentId: 12, sourceOrder: 1, sourceTitle: "B", chunkIndex: 0, content: "B" },
      ],
    });
  });

  it("reports stable compatibility diagnostics without reading or mutating source content", async () => {
    const tableRows = new Map<string, unknown[]>([
      ["course_import_jobs", [
        { id: 31, source_document_id: 11 },
        { id: 32, source_document_id: 12 },
        { id: 33, source_document_id: 13 },
      ]],
      ["course_import_job_sources", [
        { job_id: 31, source_document_id: 12, source_order: 0 },
        { job_id: 32, source_document_id: 12, source_order: 0 },
        { job_id: 32, source_document_id: 99, source_order: 1 },
      ]],
      ["source_documents", [{ id: 11 }, { id: 12 }, { id: 13 }]],
      ["source_document_metadata", [{ source_document_id: 11 }, { source_document_id: 12 }]],
    ]);
    const queries = new Map<string, { select: ReturnType<typeof vi.fn> }>();
    for (const [table, data] of tableRows) {
      queries.set(table, { select: vi.fn().mockResolvedValue({ data, error: null }) });
    }
    const from = vi.fn((table: string) => queries.get(table));
    mocks.createAdminSupabaseClient.mockReturnValue({ from });

    const diagnostics = await getCourseImportCompatibilityDiagnostics();

    expect(diagnostics).toEqual([
      { code: "ANCHOR_DRIFT", jobId: 31, sourceDocumentId: 11 },
      { code: "DUPLICATE_SOURCE_MEMBERSHIP", sourceDocumentId: 12 },
      { code: "INVALID_PROVENANCE_JOIN", jobId: 32, sourceDocumentId: 99 },
      { code: "MISSING_BRIDGE", jobId: 33, sourceDocumentId: 13 },
    ]);
    expect(queries.get("source_documents")?.select).toHaveBeenCalledWith("id");
    expect(JSON.stringify(diagnostics)).not.toMatch(/content|storage|url|chunk|body/i);
    expect(from).toHaveBeenCalledTimes(4);
  });
});
