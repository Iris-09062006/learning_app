import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import {
  getCourseRoadmap,
  ServiceError,
} from "@/features/courses/services/course-service";

vi.mock("@/features/courses/services/course-service", () => ({
  getCourseRoadmap: vi.fn(),
  ServiceError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode: number
    ) {
      super(message);
      this.name = "ServiceError";
    }
  },
}));

describe("GET /api/courses/[courseId]/roadmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    expect(getCourseRoadmap).not.toHaveBeenCalled();
  });

  it("returns 200 with roadmap data on success", async () => {
    const mockRoadmap = {
      course: { id: 1, title: "Mock Course" },
      completionPercentage: 20,
      chapters: [],
    };
    vi.mocked(getCourseRoadmap).mockResolvedValueOnce(mockRoadmap);

    const request = new Request("http://localhost");
    const response = await GET(request, {
      params: Promise.resolve({ courseId: "1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: mockRoadmap,
    });
  });

  it("returns 401 when unauthorized (ServiceError mapped)", async () => {
    vi.mocked(getCourseRoadmap).mockRejectedValueOnce(
      new ServiceError("UNAUTHENTICATED", "Authentication required.", 401)
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
        message: "Authentication required.",
      },
    });
  });

  it("returns 403 when not enrolled (ServiceError mapped)", async () => {
    vi.mocked(getCourseRoadmap).mockRejectedValueOnce(
      new ServiceError("COURSE_NOT_ENROLLED", "Not enrolled.", 403)
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
        code: "COURSE_NOT_ENROLLED",
        message: "Not enrolled.",
      },
    });
  });

  it("returns 404 when course not found (ServiceError mapped)", async () => {
    vi.mocked(getCourseRoadmap).mockRejectedValueOnce(
      new ServiceError("NOT_FOUND", "Course not found.", 404)
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
    vi.mocked(getCourseRoadmap).mockRejectedValueOnce(new Error("DB exploded"));

    const request = new Request("http://localhost");
    const response = await GET(request, {
      params: Promise.resolve({ courseId: "1" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to fetch course roadmap.",
      },
    });
  });
});