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
  getCourseImportGenerationContext,
  getGenerationContext,
  initializeCourseImportFromSources,
  listContentChapters,
  listContentCourses,
  listContentTargets,
  listCourseDraftBatches,
  listCourseImportSources,
  materializeCourseImportSource,
  removeStagedCourseImportSource,
} from "./content-pipeline-repository";

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
});
