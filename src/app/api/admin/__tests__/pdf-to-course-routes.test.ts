import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  generateCourseOutline: vi.fn(),
  generateCourseOutlineForJob: vi.fn(),
  updateCourseOutline: vi.fn(),
  regenerateCourseOutline: vi.fn(),
  generateCourseLessonContents: vi.fn(),
  regenerateCourseLessonContent: vi.fn(),
  ingestUrlSource: vi.fn(),
  initializeCourseImport: vi.fn(),
  getCourseImportSourceReview: vi.fn(),
  attachSourceToCourseImport: vi.fn(),
  detachSourceFromCourseImport: vi.fn(),
  removeStagedSource: vi.fn(),
  uploadContentSource: vi.fn(),
  uploadStagedContentSource: vi.fn(),
  researchCourseSources: vi.fn(),
}));

vi.mock("@/features/content-pipeline/services/content-pipeline-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/content-pipeline/services/content-pipeline-service")>();
  return { ...actual, ...serviceMocks };
});

import { POST as generateOutline } from "../content-sources/[id]/course-outline/route";
import { PATCH as editOutline, POST as generateJobOutline } from "../course-drafts/[id]/outline/route";
import { POST as regenerateOutline } from "../course-drafts/[id]/outline/regenerate/route";
import { POST as generateLessons } from "../course-drafts/[id]/lessons/generate/route";
import { POST as regenerateLesson } from "../course-drafts/[id]/lessons/[lessonId]/regenerate/route";
import { ContentPipelineError } from "@/features/content-pipeline/services/content-pipeline-service";
import { POST as ingestUrl } from "../content-sources/url/route";
import { POST as initializeImport } from "../course-imports/route";
import { GET as listSources, POST as attachSource } from "../course-drafts/[id]/sources/route";
import { DELETE as detachSource } from "../course-drafts/[id]/sources/[sourceDocumentId]/route";
import { DELETE as removeStaged } from "../content-sources/[id]/route";
import { POST as uploadSource } from "../content-sources/route";
import { POST as researchSources } from "../course-research/route";

describe("Phase 4 stateless research route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the approved no-store research envelope without persistence", async () => {
    serviceMocks.researchCourseSources.mockResolvedValue({
      topic: "Python async", queries: ["Python async"], results: [], cursor: null, hasMore: false,
    });
    const body = { topic: "Python async" };
    const response = await researchSources(new Request("http://localhost/api/admin/course-research", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { topic: "Python async", queries: ["Python async"], results: [], cursor: null, hasMore: false },
    });
    expect(serviceMocks.researchCourseSources).toHaveBeenCalledWith(body);
    expect(serviceMocks.ingestUrlSource).not.toHaveBeenCalled();
    expect(serviceMocks.initializeCourseImport).not.toHaveBeenCalled();
  });

  it.each([
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["VALIDATION_ERROR", 400],
    ["RATE_LIMITED", 429],
    ["SEARCH_PROVIDER_AUTH", 503],
    ["SEARCH_PROVIDER_QUOTA", 503],
    ["SEARCH_PROVIDER_TIMEOUT", 503],
    ["SEARCH_PROVIDER_UNAVAILABLE", 503],
  ] as const)("maps %s to HTTP %i with the stable error envelope", async (code, status) => {
    serviceMocks.researchCourseSources.mockRejectedValue(new ContentPipelineError(
      code,
      "recoverable",
      code === "RATE_LIMITED" ? { retryAfterSeconds: 42 } : undefined,
    ));
    const response = await researchSources(new Request("http://localhost/api/admin/course-research", {
      method: "POST", body: JSON.stringify({ topic: "Python async" }),
    }));
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { code, message: "recoverable", ...(code === "RATE_LIMITED" ? { retryAfterSeconds: 42 } : {}) },
    });
    expect(response.headers.get("Retry-After")).toBe(code === "RATE_LIMITED" ? "42" : null);
  });
});

describe("Phase 3 source routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["manual_url", "discovered"] as const)("returns a provider-neutral no-store %s URL envelope", async (discovery) => {
    serviceMocks.ingestUrlSource.mockResolvedValue({
      sourceDocumentId: 21, status: "extracted", chunkCount: 2, attached: false, jobId: null, reused: false,
    });
    const body = {
      url: "https://example.com", discovery,
      ...(discovery === "discovered" ? { title: "Example" } : {}),
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
    };
    const response = await ingestUrl(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    expect(response.status).toBe(201); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(serviceMocks.ingestUrlSource).toHaveBeenCalledWith(body);
    const payload = await response.json();
    expect(payload).toEqual({ success: true, data: {
      sourceDocumentId: 21, status: "extracted", chunkCount: 2, attached: false, jobId: null, reused: false,
    } });
    expect(JSON.stringify(payload)).not.toMatch(/Tavily|raw_content|extract_depth|request_id/i);
  });

  it("returns the same 201 contract for an idempotently reused URL attempt", async () => {
    serviceMocks.ingestUrlSource.mockResolvedValue({
      sourceDocumentId: 21,
      status: "ready_for_review",
      chunkCount: 2,
      attached: true,
      jobId: 31,
      reused: true,
    });
    const body = {
      url: "https://example.com",
      discovery: "manual_url",
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
    };

    const response = await ingestUrl(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        sourceDocumentId: 21,
        status: "ready_for_review",
        chunkCount: 2,
        attached: true,
        jobId: 31,
        reused: true,
      },
    });
  });

  it("keeps legacy file upload immediate while idempotencyKey selects staged upload", async () => {
    const file = new File(["content"], "guide.md", { type: "text/markdown" });
    serviceMocks.uploadContentSource.mockResolvedValue({ id: 9 });
    const legacyForm = new FormData(); legacyForm.set("file", file);
    await uploadSource({ formData: async () => legacyForm } as unknown as Request);
    expect(serviceMocks.uploadContentSource).toHaveBeenCalledWith(expect.any(File));
    expect(serviceMocks.uploadStagedContentSource).not.toHaveBeenCalled();

    const stagedForm = new FormData(); stagedForm.set("file", file); stagedForm.set("idempotencyKey", "22222222-2222-4222-8222-222222222222");
    await uploadSource({ formData: async () => stagedForm } as unknown as Request);
    expect(serviceMocks.uploadStagedContentSource).toHaveBeenCalledWith(expect.any(File), "22222222-2222-4222-8222-222222222222");
    expect(serviceMocks.researchCourseSources).not.toHaveBeenCalled();
    expect(serviceMocks.ingestUrlSource).not.toHaveBeenCalled();
  });

  it.each([
    ["PAYLOAD_TOO_LARGE", 413], ["UNSUPPORTED_MEDIA_TYPE", 415], ["EXTRACTION_ERROR", 422],
    ["FETCH_FAILED", 422], ["EXTRACTION_FAILED", 422], ["INVALID_SOURCE", 422],
    ["SOURCE_LIMIT_EXCEEDED", 409], ["SOURCE_CONFLICT", 409], ["SOURCE_MUTATION_LOCKED", 409],
    ["STALE_OUTLINE", 409], ["INVALID_SOURCE_REFERENCE", 400], ["RATE_LIMITED", 429],
    ["WEB_EXTRACTION_UNAVAILABLE", 503],
  ] as const)("maps %s to %i", async (code, status) => {
    serviceMocks.ingestUrlSource.mockRejectedValue(new ContentPipelineError(code, "source failed"));
    const response = await ingestUrl(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(response.status).toBe(status); expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns a provider-neutral, secret-safe extraction-unavailable envelope", async () => {
    serviceMocks.ingestUrlSource.mockRejectedValue(new ContentPipelineError(
      "WEB_EXTRACTION_UNAVAILABLE",
      "Web extraction is temporarily unavailable. Retry or use a file.",
      { extractionCategory: "AUTHENTICATION", apiKey: "secret", providerBody: "raw body", requestId: "vendor-id" },
    ));
    const response = await ingestUrl(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBeNull();
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "WEB_EXTRACTION_UNAVAILABLE",
        message: "Web extraction is temporarily unavailable. Retry or use a file.",
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/secret|raw body|vendor-id|Tavily/i);
  });

  it.each([
    ["CONFIGURATION", "WEB_EXTRACTION_UNAVAILABLE", 503],
    ["AUTHENTICATION", "WEB_EXTRACTION_UNAVAILABLE", 503],
    ["QUOTA", "WEB_EXTRACTION_UNAVAILABLE", 503],
    ["TIMEOUT", "WEB_EXTRACTION_UNAVAILABLE", 503],
    ["UPSTREAM", "WEB_EXTRACTION_UNAVAILABLE", 503],
    ["INVALID_RESPONSE", "EXTRACTION_ERROR", 422],
  ] as const)("keeps provider category %s internal for generic %s", async (category, code, status) => {
    serviceMocks.ingestUrlSource.mockRejectedValue(new ContentPipelineError(
      code, code === "WEB_EXTRACTION_UNAVAILABLE"
        ? "Web extraction is temporarily unavailable. Retry or use a file."
        : "The web source did not produce usable evidence.",
      { extractionCategory: category, providerBody: "private provider response", requestId: "private-id" },
    ));
    const response = await ingestUrl(new Request("http://localhost", {
      method: "POST", body: JSON.stringify({
        url: "https://example.com", discovery: "manual_url",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
      }),
    }));
    const payload = await response.json();
    expect(response.status).toBe(status);
    expect(payload.error.code).toBe(code);
    expect(JSON.stringify(payload)).not.toMatch(/CONFIGURATION|AUTHENTICATION|QUOTA|TIMEOUT|UPSTREAM|INVALID_RESPONSE|private provider|private-id|Tavily/);
  });

  it("does not echo arbitrary service details in an error envelope", async () => {
    serviceMocks.ingestUrlSource.mockRejectedValue(new ContentPipelineError("FETCH_FAILED", "source failed", {
      sourceDocumentId: 21,
      providerBody: "secret provider body",
      storagePath: "private/path",
    }));
    const response = await ingestUrl(new Request("http://localhost", { method: "POST", body: "{}" }));
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { code: "FETCH_FAILED", message: "source failed", sourceDocumentId: 21 },
    });
  });

  it("initializes one ordered set and exposes attach/detach/recovery operations", async () => {
    serviceMocks.initializeCourseImport.mockResolvedValue({ jobId: 31, sourceDocumentIds: [21, 22] });
    const initBody = { initializationKey: "33333333-3333-4333-8333-333333333333", sources: [{ sourceDocumentId: 21 }, { sourceDocumentId: 22 }] };
    const initialized = await initializeImport(new Request("http://localhost", { method: "POST", body: JSON.stringify(initBody) }));
    expect(initialized.status).toBe(201); expect(serviceMocks.initializeCourseImport).toHaveBeenCalledWith(initBody);

    serviceMocks.getCourseImportSourceReview.mockResolvedValue({ jobId: 31, status: "processing", outlineStale: true, sources: [] });
    expect((await listSources(new Request("http://localhost"), { params: Promise.resolve({ id: "31" }) })).status).toBe(200);
    await attachSource(new Request("http://localhost", { method: "POST", body: JSON.stringify({ sourceDocumentId: 23 }) }), { params: Promise.resolve({ id: "31" }) });
    expect(serviceMocks.attachSourceToCourseImport).toHaveBeenCalledWith("31", { sourceDocumentId: 23 });
    await detachSource(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "31", sourceDocumentId: "23" }) });
    expect(serviceMocks.detachSourceFromCourseImport).toHaveBeenCalledWith("31", "23");
    await removeStaged(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "24" }) });
    expect(serviceMocks.removeStagedSource).toHaveBeenCalledWith("24");
  });
});

describe("two-stage PDF-to-Course routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates outline without accepting a combined Course body", async () => {
    serviceMocks.generateCourseOutline.mockResolvedValue({ jobId: 61, status: "outline_review" });
    const response = await generateOutline(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "9" }) });
    expect(response.status).toBe(201);
    expect(serviceMocks.generateCourseOutline).toHaveBeenCalledWith("9");
  });

  it("persists an Admin-edited outline revision", async () => {
    const outline = { title: "Python", description: "Nhập môn", learningObjectives: ["Hiểu Python"], lessons: [] };
    await editOutline(new Request("http://localhost", { method: "PATCH", body: JSON.stringify(outline) }), { params: Promise.resolve({ id: "61" }) });
    expect(serviceMocks.updateCourseOutline).toHaveBeenCalledWith("61", outline);
  });

  it("generates a job-wide outline with the immutable revision envelope and no-store", async () => {
    serviceMocks.generateCourseOutlineForJob.mockResolvedValue({
      jobId: 61,
      sourceDocumentId: 9,
      sourceDocumentIds: [9, 10],
      outlineRevision: 2,
      status: "outline_review",
    });
    const response = await generateJobOutline(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "61" }),
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(serviceMocks.generateCourseOutlineForJob).toHaveBeenCalledWith("61");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { jobId: 61, sourceDocumentIds: [9, 10], outlineRevision: 2 },
    });
  });

  it("maps job-wide outline validation and authorization failures through the shared envelope", async () => {
    serviceMocks.generateCourseOutlineForJob.mockRejectedValueOnce(
      new ContentPipelineError("FORBIDDEN", "Active Admin role required.")
    );
    const forbidden = await generateJobOutline(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "61" }),
    });
    expect(forbidden.status).toBe(403);
    serviceMocks.generateCourseOutlineForJob.mockRejectedValueOnce(
      new ContentPipelineError("VALIDATION_ERROR", "jobId must be a positive integer.")
    );
    const invalid = await generateJobOutline(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "bad" }),
    });
    expect(invalid.status).toBe(400);
  });

  it("keeps outline and Lesson regeneration as distinct actions", async () => {
    await regenerateOutline(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "61" }) });
    await generateLessons(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "61" }) });
    await regenerateLesson(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "61", lessonId: "71" }) });
    expect(serviceMocks.regenerateCourseOutline).toHaveBeenCalledWith("61");
    expect(serviceMocks.generateCourseLessonContents).toHaveBeenCalledWith("61");
    expect(serviceMocks.regenerateCourseLessonContent).toHaveBeenCalledWith("61", "71");
  });

  it("maps AI capacity exhaustion to HTTP 429", async () => {
    serviceMocks.generateCourseOutline.mockRejectedValue(
      new ContentPipelineError("RATE_LIMITED", "Retry later")
    );
    const response = await generateOutline(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "9" }),
    });
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "RATE_LIMITED" } });
  });
});
