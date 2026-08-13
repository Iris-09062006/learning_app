import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContentTarget: vi.fn(),
  createContentCurriculum: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  getGenerationContext: vi.fn(),
  getCourseGenerationContext: vi.fn(),
  getCourseImportGenerationContext: vi.fn(),
  getSourceDocument: vi.fn(),
  listContentChapters: vi.fn(),
  listContentCourses: vi.fn(),
  listContentTargets: vi.fn(),
  persistGeneratedDraft: vi.fn(),
  persistGeneratedCourseDraft: vi.fn(),
  listCourseDraftBatches: vi.fn(),
  listCourseImports: vi.fn(),
  getCourseImport: vi.fn(),
  getCourseImportChunks: vi.fn(),
  persistCourseOutline: vi.fn(),
  persistCourseOutlineForJob: vi.fn(),
  prepareCourseLessonGeneration: vi.fn(),
  persistCourseLessonContent: vi.fn(),
  persistCourseLessonContentForJob: vi.fn(),
  failCourseImport: vi.fn(),
  reviewCourseImport: vi.fn(),
  publishCourseImport: vi.fn(),
  reviseCourseLessonContent: vi.fn(),
  reviewCourseDraftBatch: vi.fn(),
  updateSourceStatus: vi.fn(),
  createSourceDocument: vi.fn(),
  materializeCourseImportSource: vi.fn(),
  initializeCourseImportFromSources: vi.fn(),
  attachCourseImportSource: vi.fn(),
  detachCourseImportSource: vi.fn(),
  removeStagedCourseImportSource: vi.fn(),
  getSourceDocumentByStoragePath: vi.fn(),
  getSourceDocumentChunkCount: vi.fn(),
  getCourseImportJobIdForSource: vi.fn(),
  uploadSourceObject: vi.fn(),
  removeSourceObject: vi.fn(),
  downloadSourceObject: vi.fn(),
  replaceDocumentChunks: vi.fn(),
}));

vi.mock("@/features/content-pipeline/repositories/content-pipeline-repository", () => ({
  createContentTarget: mocks.createContentTarget,
  createContentCurriculum: mocks.createContentCurriculum,
  getGenerationContext: mocks.getGenerationContext,
  getCourseGenerationContext: mocks.getCourseGenerationContext,
  getCourseImportGenerationContext: mocks.getCourseImportGenerationContext,
  getSourceDocument: mocks.getSourceDocument,
  listContentChapters: mocks.listContentChapters,
  listContentCourses: mocks.listContentCourses,
  listContentTargets: mocks.listContentTargets,
  persistGeneratedDraft: mocks.persistGeneratedDraft,
  persistGeneratedCourseDraft: mocks.persistGeneratedCourseDraft,
  listCourseDraftBatches: mocks.listCourseDraftBatches,
  listCourseImports: mocks.listCourseImports,
  getCourseImport: mocks.getCourseImport,
  getCourseImportChunks: mocks.getCourseImportChunks,
  persistCourseOutline: mocks.persistCourseOutline,
  persistCourseOutlineForJob: mocks.persistCourseOutlineForJob,
  prepareCourseLessonGeneration: mocks.prepareCourseLessonGeneration,
  persistCourseLessonContent: mocks.persistCourseLessonContent,
  persistCourseLessonContentForJob: mocks.persistCourseLessonContentForJob,
  failCourseImport: mocks.failCourseImport,
  reviewCourseImport: mocks.reviewCourseImport,
  publishCourseImport: mocks.publishCourseImport,
  reviseCourseLessonContent: mocks.reviseCourseLessonContent,
  reviewCourseDraftBatch: mocks.reviewCourseDraftBatch,
  updateSourceStatus: mocks.updateSourceStatus,
  createSourceDocument: mocks.createSourceDocument,
  materializeCourseImportSource: mocks.materializeCourseImportSource,
  initializeCourseImportFromSources: mocks.initializeCourseImportFromSources,
  attachCourseImportSource: mocks.attachCourseImportSource,
  detachCourseImportSource: mocks.detachCourseImportSource,
  removeStagedCourseImportSource: mocks.removeStagedCourseImportSource,
  getSourceDocumentByStoragePath: mocks.getSourceDocumentByStoragePath,
  getSourceDocumentChunkCount: mocks.getSourceDocumentChunkCount,
  getCourseImportJobIdForSource: mocks.getCourseImportJobIdForSource,
  uploadSourceObject: mocks.uploadSourceObject,
  removeSourceObject: mocks.removeSourceObject,
  downloadSourceObject: mocks.downloadSourceObject,
  replaceDocumentChunks: mocks.replaceDocumentChunks,
}));

vi.mock("@/features/content-pipeline/extraction/document-extractor", () => {
  throw new Error("Document extractor must be loaded lazily.");
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import {
  ContentPipelineError,
  createNewContentCurriculum,
  createNewContentTarget,
  generateLessonDraft,
  generateCourseDraft,
  generateCourseOutline,
  generateCourseOutlineForJob,
  generateCourseLessonContents,
  regenerateCourseLessonContent,
  regenerateCourseOutline,
  updateCourseOutline,
  selectCourseImportProviderChunks,
  getCourseDraftQueue,
  submitCourseDraftReview,
  getContentTargets,
  uploadStagedContentSource,
  initializeCourseImport,
  attachSourceToCourseImport,
} from "./content-pipeline-service";

function mockActiveAdmin() {
  mocks.createServerSupabaseClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin", is_active: true }, error: null }) }) }),
    }),
  });
}

describe("Phase 3 source staging and initialization", () => {
  beforeEach(() => { vi.clearAllMocks(); mockActiveAdmin(); });

  it("materializes an idempotent new-flow file without creating a job or bridge", async () => {
    mocks.getSourceDocumentByStoragePath.mockResolvedValue(null);
    mocks.uploadSourceObject.mockResolvedValue(undefined);
    mocks.materializeCourseImportSource.mockResolvedValue({ sourceDocumentId: 21, status: "uploaded", jobId: null, attached: false });
    const file = new File(["usable source"], "guide.md", { type: "text/markdown" });

    await expect(uploadStagedContentSource(file, "22222222-2222-4222-8222-222222222222"))
      .resolves.toMatchObject({ sourceDocumentId: 21, jobId: null, attached: false });
    expect(mocks.uploadSourceObject).toHaveBeenCalledBefore(mocks.materializeCourseImportSource);
    expect(mocks.materializeCourseImportSource).toHaveBeenCalledWith(expect.objectContaining({
      storagePath: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/guide.md",
      sourceType: "file", ingestionMethod: "uploaded",
    }));
    expect(mocks.initializeCourseImportFromSources).not.toHaveBeenCalled();
    expect(mocks.attachCourseImportSource).not.toHaveBeenCalled();
  });

  it("reuses a deterministic staged-file identity without another storage write", async () => {
    mocks.getSourceDocumentByStoragePath.mockResolvedValue({ id: 21, status: "uploaded" });
    mocks.getCourseImportJobIdForSource.mockResolvedValue(null);
    const file = new File(["usable source"], "guide.md", { type: "text/markdown" });
    await expect(uploadStagedContentSource(file, "22222222-2222-4222-8222-222222222222"))
      .resolves.toMatchObject({ sourceDocumentId: 21, attached: false });
    expect(mocks.uploadSourceObject).not.toHaveBeenCalled();
  });

  it("does not delete a deterministic object after an ambiguous storage failure", async () => {
    mocks.getSourceDocumentByStoragePath.mockResolvedValue(null);
    mocks.uploadSourceObject.mockRejectedValue(new Error("STORAGE_ERROR"));
    const file = new File(["usable source"], "guide.md", { type: "text/markdown" });
    await expect(uploadStagedContentSource(file, "22222222-2222-4222-8222-222222222222"))
      .rejects.toMatchObject({ code: "STORAGE_ERROR" });
    expect(mocks.removeSourceObject).not.toHaveBeenCalled();
    expect(mocks.materializeCourseImportSource).not.toHaveBeenCalled();
  });

  it("adopts a concurrent deterministic upload once its database row is visible", async () => {
    mocks.getSourceDocumentByStoragePath
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 21, status: "uploaded" });
    mocks.uploadSourceObject.mockRejectedValue(new Error("STORAGE_OBJECT_EXISTS"));
    mocks.getCourseImportJobIdForSource.mockResolvedValue(null);
    const file = new File(["usable source"], "guide.md", { type: "text/markdown" });
    await expect(uploadStagedContentSource(file, "22222222-2222-4222-8222-222222222222"))
      .resolves.toMatchObject({ sourceDocumentId: 21, attached: false });
    expect(mocks.removeSourceObject).not.toHaveBeenCalled();
    expect(mocks.materializeCourseImportSource).not.toHaveBeenCalled();
  });

  it("submits one ordered unique 1..8 source set to atomic initialization", async () => {
    mocks.initializeCourseImportFromSources.mockResolvedValue({ jobId: 31, sourceDocumentId: 21, sourceDocumentIds: [21, 22] });
    await expect(initializeCourseImport({
      initializationKey: "33333333-3333-4333-8333-333333333333",
      sources: [{ sourceDocumentId: 21 }, { sourceDocumentId: 22, relevanceScore: 0.8 }],
    })).resolves.toMatchObject({ jobId: 31 });
    expect(mocks.initializeCourseImportFromSources).toHaveBeenCalledWith({
      initializationKey: "33333333-3333-4333-8333-333333333333",
      sources: [{ sourceDocumentId: 21, relevanceScore: null }, { sourceDocumentId: 22, relevanceScore: 0.8 }],
    });
    await expect(initializeCourseImport({ initializationKey: "33333333-3333-4333-8333-333333333333", sources: [] }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(initializeCourseImport({ initializationKey: "33333333-3333-4333-8333-333333333333", sources: [{ sourceDocumentId: 21 }, { sourceDocumentId: 21 }] }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("keeps concurrent retries on one initialization identity", async () => {
    mocks.initializeCourseImportFromSources.mockResolvedValue({ jobId: 31, sourceDocumentId: 21, sourceDocumentIds: [21] });
    const request = {
      initializationKey: "33333333-3333-4333-8333-333333333333",
      sources: [{ sourceDocumentId: 21 }],
    };
    const [first, second] = await Promise.all([initializeCourseImport(request), initializeCourseImport(request)]);
    expect(first.jobId).toBe(31);
    expect(second.jobId).toBe(31);
    expect(mocks.initializeCourseImportFromSources).toHaveBeenCalledTimes(2);
    expect(mocks.initializeCourseImportFromSources).toHaveBeenNthCalledWith(1, {
      initializationKey: request.initializationKey,
      sources: [{ sourceDocumentId: 21, relevanceScore: null }],
    });
    expect(mocks.initializeCourseImportFromSources).toHaveBeenNthCalledWith(2, {
      initializationKey: request.initializationKey,
      sources: [{ sourceDocumentId: 21, relevanceScore: null }],
    });
  });

  it("requires an existing job ID for later attachment", async () => {
    mocks.attachCourseImportSource.mockResolvedValue({ jobId: 31, sourceDocumentId: 23, attached: true });
    await attachSourceToCourseImport(31, { sourceDocumentId: 23 });
    expect(mocks.attachCourseImportSource).toHaveBeenCalledWith({ jobId: 31, sourceDocumentId: 23, relevanceScore: null });
    await expect(attachSourceToCourseImport(0, { sourceDocumentId: 23 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("createNewContentTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin", is_active: true } }),
          }),
        }),
      }),
    });
  });

  it("validates and trims the new lesson target", async () => {
    mocks.createContentTarget.mockResolvedValue({ lessonId: 9 });

    await createNewContentTarget({ chapterId: 2, title: "  Bài mới  " });

    expect(mocks.createContentTarget).toHaveBeenCalledWith({ chapterId: 2, title: "Bài mới" });
  });

  it("maps a missing chapter to the public not-found contract", async () => {
    mocks.createContentTarget.mockRejectedValue(new Error("CHAPTER_NOT_FOUND"));

    await expect(createNewContentTarget({ chapterId: 999, title: "Bài mới" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" } satisfies Partial<ContentPipelineError>);
  });

  it("rejects blank lesson titles before repository access", async () => {
    await expect(createNewContentTarget({ chapterId: 2, title: "   " }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<ContentPipelineError>);
    expect(mocks.createContentTarget).not.toHaveBeenCalled();
  });

  it("lists content targets without loading the document parser", async () => {
    mocks.listContentTargets.mockResolvedValue([]);
    mocks.listContentChapters.mockResolvedValue([]);
    mocks.listContentCourses.mockResolvedValue([]);

    await expect(getContentTargets()).resolves.toEqual({ items: [], chapters: [], courses: [] });
  });

  it("creates a new course target using the source filename as chapter title", async () => {
    mocks.getSourceDocument.mockResolvedValue({ originalFilename: "Nội suy Spline.pdf" });
    mocks.createContentCurriculum.mockResolvedValue({ courseId: 3, chapterId: 4, lessonId: 5 });

    await createNewContentCurriculum({ mode: "new", courseTitle: "  Đại số tuyến tính  ", sourceDocumentId: 8 });

    expect(mocks.createContentCurriculum).toHaveBeenCalledWith({
      courseTitle: "Đại số tuyến tính",
      courseSlug: expect.stringMatching(/^ai-so-tuyen-tinh-[a-f0-9]{8}$/),
      chapterTitle: "Nội suy Spline",
    });
  });

  it("rejects existing mode because it must target an existing lesson without curriculum writes", async () => {
    await expect(createNewContentCurriculum({ mode: "existing", courseId: 3, sourceDocumentId: 8 }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<ContentPipelineError>);

    expect(mocks.getSourceDocument).not.toHaveBeenCalled();
    expect(mocks.createContentCurriculum).not.toHaveBeenCalled();
  });

  it("rejects an incomplete destination before repository access", async () => {
    mocks.getSourceDocument.mockResolvedValue({ originalFilename: "Nội suy.pdf" });
    await expect(createNewContentCurriculum({ mode: "new", courseTitle: "", sourceDocumentId: 8 }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<ContentPipelineError>);
    expect(mocks.createContentCurriculum).not.toHaveBeenCalled();
  });
});

describe("generateLessonDraft retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin", is_active: true }, error: null }) }) }),
      }),
    });
    mocks.getGenerationContext.mockResolvedValue({
      document: { status: "failed", error_code: "GENERATION_FAILED", original_filename: "Lagrange.txt" },
      chunks: [{ id: 1, chunk_index: 0, content: "Nguồn" }],
      lesson: { id: 51, title: "Lagrange", chapter_id: 41, chapters: { course_id: 31 } },
    });
    mocks.persistGeneratedDraft.mockResolvedValue(71);
    mocks.updateSourceStatus.mockResolvedValue(undefined);
  });

  it("retries a source whose previous AI generation failed", async () => {
    const provider = {
      generateLessonDraft: vi.fn().mockResolvedValue({
        draft: {
          title: "Lagrange",
          summary: "Tóm tắt",
          estimatedMinutes: 12,
          sections: [{ heading: "Mở đầu", bodyMarkdown: "Nội dung", citationChunkIndexes: [0] }],
        },
        provider: "9router",
        model: "model",
      }),
    };

    await expect(generateLessonDraft(9, 51, provider)).resolves.toEqual({
      lessonDraftId: 71,
      status: "pending_review",
    });
    expect(mocks.updateSourceStatus).toHaveBeenCalledWith(9, "generating");
  });

  it("does not retry an extraction failure as generation", async () => {
    mocks.getGenerationContext.mockResolvedValueOnce({
      document: { status: "failed", error_code: "EXTRACTION_FAILED", original_filename: "Lagrange.txt" },
      chunks: [],
      lesson: { id: 51, title: "Lagrange", chapter_id: 41, chapters: { course_id: 31 } },
    });

    await expect(generateLessonDraft(9, 51, { generateLessonDraft: vi.fn() }))
      .rejects.toMatchObject({ code: "INVALID_STATE" } satisfies Partial<ContentPipelineError>);
  });
});

describe("Course draft batches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin", is_active: true } }),
          }),
        }),
      }),
    });
    mocks.getCourseGenerationContext.mockResolvedValue({
      document: { status: "extracted", error_code: null, original_filename: "python.pdf" },
      chunks: [{ id: 1, chunk_index: 0, content: "Biến và kiểu dữ liệu" }],
    });
    mocks.updateSourceStatus.mockResolvedValue(undefined);
    mocks.persistGeneratedCourseDraft.mockResolvedValue({
      sourceDocumentId: 9,
      courseId: 31,
      chapterId: 41,
      lessonDraftIds: [71, 72],
      status: "pending_review",
    });
  });

  it("generates multiple Lesson drafts without an exercise generation contract", async () => {
    const provider = {
      generateLessonDraft: vi.fn(),
      generateCourseDraft: vi.fn().mockResolvedValue({
        draft: {
          title: "Python nền tảng",
          description: "Khóa nhập môn",
          lessons: [
            { title: "Biến", summary: "Tóm tắt", estimatedMinutes: 10, sections: [{ heading: "Khái niệm", bodyMarkdown: "Nội dung", citationChunkIndexes: [0] }] },
            { title: "Kiểu dữ liệu", summary: "Tóm tắt", estimatedMinutes: 12, sections: [{ heading: "Khái niệm", bodyMarkdown: "Nội dung", citationChunkIndexes: [0] }] },
          ],
        },
        provider: "9router",
        model: "model",
      }),
    };

    await expect(generateCourseDraft(9, provider)).resolves.toMatchObject({
      courseId: 31,
      lessonDraftIds: [71, 72],
    });
    expect(mocks.persistGeneratedCourseDraft).toHaveBeenCalledWith(expect.objectContaining({
      sourceDocumentId: 9,
      draft: expect.objectContaining({ lessons: expect.arrayContaining([expect.objectContaining({ title: "Biến" })]) }),
    }));
    expect(provider.generateLessonDraft).not.toHaveBeenCalled();
  });

  it("lists only unresolved Course batches through the repository", async () => {
    mocks.listCourseImports.mockResolvedValue([{ sourceDocumentId: 9 }]);
    await expect(getCourseDraftQueue()).resolves.toEqual([{ sourceDocumentId: 9 }]);
  });

  it("submits the batch decision with a bounded comment", async () => {
    mocks.reviewCourseDraftBatch.mockResolvedValue({ status: "rejected" });
    await submitCourseDraftReview(9, { decision: "rejected", comment: "Không phù hợp" });
    expect(mocks.reviewCourseDraftBatch).toHaveBeenCalledWith(9, "rejected", "Không phù hợp");
  });
});

describe("two-stage Course imports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin", is_active: true }, error: null }),
        }) }),
      }),
    });
    mocks.getCourseGenerationContext.mockResolvedValue({
      document: { status: "extracted", error_code: null, original_filename: "python.pdf" },
      chunks: [{ id: 1, chunk_index: 0, content: "Biến" }, { id: 2, chunk_index: 1, content: "Hàm" }],
    });
    mocks.persistCourseOutline.mockResolvedValue({ jobId: 61, sourceDocumentId: 9, outlineRevision: 1, status: "outline_review" });
    mocks.updateSourceStatus.mockResolvedValue(undefined);
    mocks.failCourseImport.mockResolvedValue(undefined);
  });

  it("persists an outline without generating Lesson bodies", async () => {
    const provider = {
      generateLessonDraft: vi.fn(),
      generateCourseOutline: vi.fn().mockResolvedValue({
        outline: {
          title: "Python", description: "Nhập môn", learningObjectives: ["Hiểu Python"],
          lessons: [
            { clientKey: "variables", title: "Biến", summary: "Biến", learningObjectives: ["Khai báo biến"], sourceChunkIndexes: [0] },
            { clientKey: "functions", title: "Hàm", summary: "Hàm", learningObjectives: ["Định nghĩa hàm"], sourceChunkIndexes: [1] },
          ],
        }, provider: "9router", model: "model",
      }),
    };
    await expect(generateCourseOutline(9, provider)).resolves.toMatchObject({ status: "outline_review" });
    expect(provider.generateCourseOutline).toHaveBeenCalledWith(
      expect.objectContaining({ documentTitle: "python.pdf" }),
      expect.any(Function)
    );
    expect(mocks.persistCourseOutline).toHaveBeenCalledWith(expect.objectContaining({
      sourceDocumentId: 9,
      outline: expect.objectContaining({ lessons: expect.arrayContaining([expect.objectContaining({ clientKey: "variables" })]) }),
    }));
    expect(provider.generateLessonDraft).not.toHaveBeenCalled();
    expect(mocks.persistCourseLessonContent).not.toHaveBeenCalled();
  });

  it("generates each Lesson only after preparing the approved outline", async () => {
    const job = {
      jobId: 61, sourceDocumentId: 9, sourceFilename: "python.pdf", status: "outline_review",
      outlineRevision: 1, approvedOutlineRevision: null,
      sources: [{ sourceDocumentId: 9, sourceOrder: 0, title: "python.pdf" }],
      lessons: [
        { id: 71, title: "Biến", learningObjectives: ["Khai báo biến"], sourceChunkIndexes: [0], sourceChunks: [{ documentChunkId: 1 }], contentDraft: null },
        { id: 72, title: "Hàm", learningObjectives: ["Định nghĩa hàm"], sourceChunkIndexes: [1], sourceChunks: [{ documentChunkId: 2 }], contentDraft: null },
      ],
    };
    mocks.getCourseImport.mockResolvedValueOnce(job).mockResolvedValueOnce({
      ...job, status: "generating_content", approvedOutlineRevision: 1,
    });
    mocks.getCourseImportChunks.mockResolvedValue([
      { documentChunkId: 1, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "python.pdf", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "Biến" },
      { documentChunkId: 2, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "python.pdf", sourceUrl: null, sourceDomain: null, chunkIndex: 1, content: "Hàm" },
    ]);
    const provider = { generateLessonDraft: vi.fn().mockImplementation(async (request) => ({
      draft: { title: "Lesson", summary: "Tóm tắt", estimatedMinutes: 10,
        sections: [{ heading: "Nội dung", bodyMarkdown: "Bài học", citationChunkIndexes: [request.chunks[0].chunkIndex] }] },
      provider: "9router", model: "model",
    })) };
    await generateCourseLessonContents(61, provider);
    expect(mocks.prepareCourseLessonGeneration).toHaveBeenCalledWith(61);
    expect(provider.generateLessonDraft).toHaveBeenCalledTimes(2);
    expect(mocks.persistCourseLessonContentForJob).toHaveBeenCalledTimes(2);
  });

  it("keeps an already complete content review out of the generating state", async () => {
    mocks.getCourseImport.mockResolvedValue({
      jobId: 61, sourceDocumentId: 9, sourceFilename: "python.pdf", status: "content_review",
      sources: [{ sourceDocumentId: 9, sourceOrder: 0, title: "python.pdf" }],
      lessons: [{ id: 71, title: "Biến", learningObjectives: ["Khai báo biến"], sourceChunkIndexes: [0], contentDraft: { id: 81 } }],
    });

    await expect(generateCourseLessonContents(61, { generateLessonDraft: vi.fn() })).resolves.toEqual({
      jobId: 61,
      status: "content_review",
    });
    expect(mocks.prepareCourseLessonGeneration).not.toHaveBeenCalled();
  });

  it("persists a retryable failed state when one Lesson provider call fails", async () => {
    const job = {
      jobId: 61, sourceDocumentId: 9, sourceFilename: "python.pdf", status: "outline_review",
      outlineRevision: 1, approvedOutlineRevision: null,
      sources: [{ sourceDocumentId: 9, sourceOrder: 0, title: "python.pdf" }],
      lessons: [{ id: 71, title: "Biến", learningObjectives: ["Khai báo biến"], sourceChunkIndexes: [0], sourceChunks: [{ documentChunkId: 1 }], contentDraft: null }],
    };
    mocks.getCourseImport.mockResolvedValueOnce(job).mockResolvedValueOnce({ ...job, approvedOutlineRevision: 1 });
    mocks.getCourseImportChunks.mockResolvedValue([{ documentChunkId: 1, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "python.pdf", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "Biến" }]);
    const provider = { generateLessonDraft: vi.fn().mockRejectedValue(new Error("AI_PROVIDER_TIMEOUT")) };

    await expect(generateCourseLessonContents(61, provider)).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
    expect(mocks.failCourseImport).toHaveBeenCalledWith(61, "LESSON_GENERATION_FAILED");
    expect(mocks.persistCourseLessonContent).not.toHaveBeenCalled();
  });

  it("rejects outline output with an Exercise field", async () => {
    const provider = { generateLessonDraft: vi.fn(), generateCourseOutline: vi.fn().mockResolvedValue({
      outline: {
        title: "Python", description: "Nhập môn", learningObjectives: ["Hiểu Python"], exercises: [],
        lessons: [
          { clientKey: "a", title: "A", summary: "A", learningObjectives: ["A"], sourceChunkIndexes: [0] },
          { clientKey: "b", title: "B", summary: "B", learningObjectives: ["B"], sourceChunkIndexes: [1] },
        ],
      }, provider: "9router", model: "model",
    }) };
    await expect(generateCourseOutline(9, provider)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.persistCourseOutline).not.toHaveBeenCalled();
  });

  it("selects job-wide chunks round-robin, deterministically, and within 80,000 characters", () => {
    const chunk = (documentChunkId: number, sourceDocumentId: number, sourceOrder: number,
      chunkIndex: number, length: number) => ({
      documentChunkId, sourceDocumentId, sourceOrder, sourceTitle: `Nguồn ${sourceOrder}`,
      sourceUrl: null, sourceDomain: null, chunkIndex, content: "x".repeat(length),
    });
    const chunks = [
      chunk(1, 9, 0, 0, 30_000), chunk(2, 9, 0, 1, 30_000),
      chunk(3, 10, 1, 0, 30_000), chunk(4, 10, 1, 1, 30_000),
    ];
    const selected = selectCourseImportProviderChunks(chunks);
    expect(selected.map((item) => item.documentChunkId)).toEqual([1, 3]);
    expect(selected.reduce((total, item) => total + item.content.length, 0)).toBeLessThanOrEqual(80_000);
    expect(selectCourseImportProviderChunks([...chunks].reverse())).toEqual(selected);
  });

  it("represents each non-empty source before refilling from earlier sources", () => {
    const chunks = [
      { documentChunkId: 1, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "A", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "A0" },
      { documentChunkId: 2, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "A", sourceUrl: null, sourceDomain: null, chunkIndex: 1, content: "A1" },
      { documentChunkId: 3, sourceDocumentId: 10, sourceOrder: 1, sourceTitle: "B", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "B0" },
    ];
    expect(selectCourseImportProviderChunks(chunks).map((chunk) => chunk.documentChunkId)).toEqual([1, 3, 2]);
  });

  it("maps colliding local indexes to canonical IDs during job-wide outline generation", async () => {
    mocks.getCourseImportGenerationContext.mockResolvedValue({
      jobId: 61,
      sources: [
        { sourceDocumentId: 9, sourceOrder: 0, title: "Nguồn A", status: "extracted" },
        { sourceDocumentId: 10, sourceOrder: 1, title: "Nguồn B", status: "extracted" },
      ],
      chunks: [
        { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "Nguồn A", sourceUrl: null, sourceDomain: "a.test", chunkIndex: 0, content: "A0" },
        { documentChunkId: 202, sourceDocumentId: 10, sourceOrder: 1, sourceTitle: "Nguồn B", sourceUrl: null, sourceDomain: "b.test", chunkIndex: 0, content: "B0" },
      ],
    });
    mocks.persistCourseOutlineForJob.mockResolvedValue({
      jobId: 61, sourceDocumentId: 9, sourceDocumentIds: [9, 10], outlineRevision: 1, status: "outline_review",
    });
    const provider = { generateLessonDraft: vi.fn(), generateCourseOutline: vi.fn().mockImplementation(async (request) => {
      expect(request.chunks).toEqual([
        expect.objectContaining({ sourceRef: 0, content: "A0" }),
        expect.objectContaining({ sourceRef: 1, content: "B0" }),
      ]);
      return { outline: {
        title: "Đa nguồn", description: "Khóa học", learningObjectives: ["Đối chiếu"],
        lessons: [
          { clientKey: "a", title: "A", summary: "A", learningObjectives: ["A"], sourceRefs: [0] },
          { clientKey: "b", title: "B", summary: "B", learningObjectives: ["B"], sourceRefs: [1] },
        ],
      }, provider: "9router", model: "model" };
    }) };

    await expect(generateCourseOutlineForJob(61, provider)).resolves.toMatchObject({ outlineRevision: 1 });
    expect(mocks.persistCourseOutlineForJob).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 61,
      outline: expect.objectContaining({ lessons: [
        expect.objectContaining({ sourceChunkIds: [101] }),
        expect.objectContaining({ sourceChunkIds: [202] }),
      ] }),
    }));
    expect(mocks.updateSourceStatus).not.toHaveBeenCalled();
  });

  it("leaves source and revision state unchanged when job-wide provider generation fails", async () => {
    mocks.getCourseImportGenerationContext.mockResolvedValue({
      jobId: 61,
      sources: [{ sourceDocumentId: 9, sourceOrder: 0, title: "Nguồn", status: "extracted" }],
      chunks: [{ documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "Nguồn", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "A" }],
    });
    const provider = { generateLessonDraft: vi.fn(), generateCourseOutline: vi.fn().mockRejectedValue(new Error("timeout")) };
    await expect(generateCourseOutlineForJob(61, provider)).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
    expect(mocks.persistCourseOutlineForJob).not.toHaveBeenCalled();
    expect(mocks.updateSourceStatus).not.toHaveBeenCalled();
    expect(mocks.failCourseImport).toHaveBeenCalledWith(61, "OUTLINE_GENERATION_FAILED");
  });

  it("rejects an attached source with no usable selected context before provider access", async () => {
    mocks.getCourseImportGenerationContext.mockResolvedValue({
      jobId: 61,
      sources: [
        { sourceDocumentId: 9, sourceOrder: 0, title: "A", status: "extracted" },
        { sourceDocumentId: 10, sourceOrder: 1, title: "B", status: "extracted" },
      ],
      chunks: [{ documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0,
        sourceTitle: "A", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "A" }],
    });
    const provider = { generateLessonDraft: vi.fn(), generateCourseOutline: vi.fn() };
    await expect(generateCourseOutlineForJob(61, provider)).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(provider.generateCourseOutline).not.toHaveBeenCalled();
    expect(mocks.persistCourseOutlineForJob).not.toHaveBeenCalled();
  });

  it("regenerates an outline from stored job evidence without using the legacy source reader", async () => {
    mocks.getCourseImport.mockResolvedValue({ jobId: 61, status: "outline_review" });
    mocks.getCourseImportGenerationContext.mockResolvedValue({
      jobId: 61,
      sources: [{ sourceDocumentId: 9, sourceOrder: 0, title: "Stored snapshot", status: "ready_for_review" }],
      chunks: [{ documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0,
        sourceTitle: "Stored snapshot", sourceUrl: null, sourceDomain: null, chunkIndex: 0,
        content: "Immutable stored content" }],
    });
    mocks.persistCourseOutlineForJob.mockResolvedValue({
      jobId: 61, sourceDocumentId: 9, sourceDocumentIds: [9], outlineRevision: 3, status: "outline_review",
    });
    const provider = { generateLessonDraft: vi.fn(), generateCourseOutline: vi.fn().mockResolvedValue({
      outline: { title: "Stored", description: "Stored", learningObjectives: ["Stored"], lessons: [
        { clientKey: "a", title: "A", summary: "A", learningObjectives: ["A"], sourceRefs: [0] },
        { clientKey: "b", title: "B", summary: "B", learningObjectives: ["B"], sourceRefs: [0] },
      ] }, provider: "9router", model: "model",
    }) };
    await expect(regenerateCourseOutline(61, provider)).resolves.toMatchObject({ outlineRevision: 3 });
    expect(mocks.getCourseImportGenerationContext).toHaveBeenCalledWith(61);
    expect(mocks.getCourseGenerationContext).not.toHaveBeenCalled();
  });

  it("saves source-qualified edits and rejects bare refs for a multi-source job", async () => {
    mocks.getCourseImport.mockResolvedValue({ jobId: 61, status: "outline_review" });
    mocks.getCourseImportGenerationContext.mockResolvedValue({
      jobId: 61,
      sources: [
        { sourceDocumentId: 9, sourceOrder: 0 },
        { sourceDocumentId: 10, sourceOrder: 1 },
      ],
      chunks: [
        { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "A", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "A" },
        { documentChunkId: 202, sourceDocumentId: 10, sourceOrder: 1, sourceTitle: "B", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "B" },
      ],
    });
    mocks.persistCourseOutlineForJob.mockResolvedValue({ jobId: 61, sourceDocumentId: 9, sourceDocumentIds: [9, 10], outlineRevision: 2, status: "outline_review" });
    const base = { title: "Đa nguồn", description: "Khóa", learningObjectives: ["Học"], lessons: [
      { clientKey: "a", title: "A", summary: "A", learningObjectives: ["A"], sourceRefs: [{ sourceDocumentId: 9, chunkIndex: 0 }] },
      { clientKey: "b", title: "B", summary: "B", learningObjectives: ["B"], sourceRefs: [{ sourceDocumentId: 10, chunkIndex: 0 }] },
    ] };
    await expect(updateCourseOutline(61, base)).resolves.toMatchObject({ outlineRevision: 2 });
    expect(mocks.persistCourseOutlineForJob).toHaveBeenCalledWith(expect.objectContaining({
      outline: expect.objectContaining({ lessons: expect.arrayContaining([
        expect.objectContaining({ sourceChunkIds: [101] }),
        expect.objectContaining({ sourceChunkIds: [202] }),
      ]) }),
    }));
    await expect(updateCourseOutline(61, {
      ...base,
      lessons: base.lessons.map((lesson) => ({
        clientKey: lesson.clientKey,
        title: lesson.title,
        summary: lesson.summary,
        learningObjectives: lesson.learningObjectives,
        sourceChunkIndexes: [0],
      })),
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("generates multi-source Lesson citations only from approved canonical outline chunks", async () => {
    const job = {
      jobId: 61, sourceDocumentId: 9, sourceFilename: "Nguồn A", status: "outline_review",
      outlineRevision: 2, approvedOutlineRevision: null,
      sources: [{ sourceDocumentId: 9 }, { sourceDocumentId: 10 }],
      lessons: [{ id: 71, title: "Đối chiếu", learningObjectives: ["So sánh"],
        sourceChunkIndexes: [0, 0], sourceChunks: [
          { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, chunkIndex: 0 },
          { documentChunkId: 202, sourceDocumentId: 10, sourceOrder: 1, chunkIndex: 0 },
        ], contentDraft: null }],
    };
    mocks.getCourseImport.mockResolvedValueOnce(job).mockResolvedValueOnce({
      ...job, status: "generating_content", approvedOutlineRevision: 2,
    });
    mocks.getCourseImportChunks.mockResolvedValue([
      { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "A", sourceUrl: null, sourceDomain: "a.test", chunkIndex: 0, content: "A" },
      { documentChunkId: 202, sourceDocumentId: 10, sourceOrder: 1, sourceTitle: "B", sourceUrl: null, sourceDomain: "b.test", chunkIndex: 0, content: "B" },
    ]);
    const provider = { generateLessonDraft: vi.fn().mockResolvedValue({
      draft: { title: "Đối chiếu", summary: "Tóm tắt", estimatedMinutes: 10, sections: [
        { heading: "A", bodyMarkdown: "A", citationSourceRefs: [0] },
        { heading: "B", bodyMarkdown: "B", citationSourceRefs: [1] },
      ] }, provider: "9router", model: "model",
    }) };
    await generateCourseLessonContents(61, provider);
    expect(mocks.persistCourseLessonContentForJob).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 61,
      citations: [{ sectionIndex: 0, documentChunkId: 101 }, { sectionIndex: 1, documentChunkId: 202 }],
    }));
  });

  it("rejects a foreign approved-outline chunk before calling the Lesson provider", async () => {
    const job = {
      jobId: 61, sourceDocumentId: 9, sourceFilename: "Nguồn", status: "outline_review",
      outlineRevision: 1, approvedOutlineRevision: null, sources: [{ sourceDocumentId: 9 }],
      lessons: [{ id: 71, title: "A", learningObjectives: ["A"], sourceChunkIndexes: [0],
        sourceChunks: [{ documentChunkId: 999 }], contentDraft: null }],
    };
    mocks.getCourseImport.mockResolvedValueOnce(job).mockResolvedValueOnce({ ...job, approvedOutlineRevision: 1 });
    mocks.getCourseImportChunks.mockResolvedValue([
      { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "A", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "A" },
    ]);
    const provider = { generateLessonDraft: vi.fn() };
    await expect(generateCourseLessonContents(61, provider)).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(provider.generateLessonDraft).not.toHaveBeenCalled();
    expect(mocks.persistCourseLessonContentForJob).not.toHaveBeenCalled();
  });

  it("regenerates only the targeted Lesson without expanding approved evidence", async () => {
    const job = {
      jobId: 61, sourceDocumentId: 9, sourceFilename: "Nguồn", status: "content_review",
      outlineRevision: 2, approvedOutlineRevision: 2,
      sources: [{ sourceDocumentId: 9 }, { sourceDocumentId: 10 }],
      lessons: [
        { id: 71, title: "A", learningObjectives: ["A"], sourceChunkIndexes: [0],
          sourceChunks: [{ documentChunkId: 101 }], contentDraft: { id: 81 } },
        { id: 72, title: "B", learningObjectives: ["B"], sourceChunkIndexes: [0],
          sourceChunks: [{ documentChunkId: 202 }], contentDraft: { id: 82 } },
      ],
    };
    mocks.getCourseImport.mockResolvedValue(job);
    mocks.getCourseImportChunks.mockResolvedValue([
      { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, sourceTitle: "A", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "A" },
      { documentChunkId: 202, sourceDocumentId: 10, sourceOrder: 1, sourceTitle: "B", sourceUrl: null, sourceDomain: null, chunkIndex: 0, content: "B" },
    ]);
    const provider = { generateLessonDraft: vi.fn().mockResolvedValue({
      draft: { title: "B mới", summary: "B", estimatedMinutes: 10,
        sections: [{ heading: "B", bodyMarkdown: "B", citationSourceRefs: [0] }] },
      provider: "9router", model: "model",
    }) };
    await expect(regenerateCourseLessonContent(61, 72, provider)).resolves.toMatchObject({
      outlineLessonId: 72,
    });
    expect(provider.generateLessonDraft).toHaveBeenCalledOnce();
    expect(provider.generateLessonDraft).toHaveBeenCalledWith(expect.objectContaining({
      chunks: [expect.objectContaining({ content: "B" })],
    }));
    expect(mocks.persistCourseLessonContentForJob).toHaveBeenCalledWith(expect.objectContaining({
      outlineLessonId: 72,
      citations: [{ sectionIndex: 0, documentChunkId: 202 }],
    }));
  });
});
