import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import {
  getCourseProgress,
  ProgressError,
} from "@/features/progress/services/progress-service";

vi.mock("@/features/progress/services/progress-service", () => ({
  getCourseProgress: vi.fn(),
  ProgressError: class extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
      this.name = "ProgressError";
    }
  },
}));

describe("GET /api/courses/[courseId]/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns 400 when courseId is invalid", async () => {
    const request = new Request("http://localhost");
    const response = await GET(request, {
      params: Promise.resolve({ courseId: "invalid" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid course ID.",
      },
    });
    expect(getCourseProgress).not.toHaveBeenCalled();
  });

  it("returns 200 with progress data on success", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    const mockProgress = {
      courseId: 1,
      completedLessons: 2,
      totalLessons: 4,
      completionPercentage: 50,
      lastAccessedLessonId: 3,
    };
    vi.mocked(getCourseProgress).mockResolvedValueOnce(mockProgress);

    const request = new Request("http://localhost");
    const response = await GET(request, {
      params: Promise.resolve({ courseId: "1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: mockProgress,
    });
    expect(JSON.stringify(body)).not.toMatch(/Tavily|raw_content|request_id/i);
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(getCourseProgress).mockRejectedValueOnce(
      new ProgressError("UNAUTHENTICATED", "Authentication required")
    );

    const request = new Request("http://localhost");
    const response = await GET(request, {
      params: Promise.resolve({ courseId: "1" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("returns 403 when not enrolled", async () => {
    vi.mocked(getCourseProgress).mockRejectedValueOnce(
      new ProgressError("NOT_ENROLLED", "Not enrolled in this course")
    );

    const request = new Request("http://localhost");
    const response = await GET(request, {
      params: Promise.resolve({ courseId: "1" }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "NOT_ENROLLED",
        message: "Not enrolled in this course",
      },
    });
  });

  it("returns 404 when course not found", async () => {
    vi.mocked(getCourseProgress).mockRejectedValueOnce(
      new ProgressError("NOT_FOUND", "Course not found")
    );

    const request = new Request("http://localhost");
    const response = await GET(request, {
      params: Promise.resolve({ courseId: "99" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 500 when unexpected error occurs", async () => {
    // Suppress console.error in test
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getCourseProgress).mockRejectedValueOnce(new Error("DB exploded"));

    const request = new Request("http://localhost");
    const response = await GET(request, {
      params: Promise.resolve({ courseId: "1" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch course progress.",
      },
    });
  });
});
