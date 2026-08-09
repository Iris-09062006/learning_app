import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";
import {
  enrollInCourse,
  ServiceError,
} from "@/features/courses/services/course-service";

vi.mock("@/features/courses/services/course-service", () => ({
  enrollInCourse: vi.fn(),
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

describe("POST /api/courses/[courseId]/enroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when courseId is not a positive integer", async () => {
    const request = new Request("http://localhost");
    const response = await POST(request, {
      params: Promise.resolve({ courseId: "abc" }),
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
    expect(enrollInCourse).not.toHaveBeenCalled();
  });

  it("returns 201 with enrollment data on success", async () => {
    const enrollment = {
      enrollmentId: 1,
      courseId: 5,
      enrolledAt: "2026-03-08T10:00:00.000Z",
      firstLessonId: 10,
    };
    vi.mocked(enrollInCourse).mockResolvedValueOnce(enrollment);

    const request = new Request("http://localhost");
    const response = await POST(request, {
      params: Promise.resolve({ courseId: "5" }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: enrollment,
    });
  });

  it("returns 409 when already enrolled (ServiceError mapped)", async () => {
    vi.mocked(enrollInCourse).mockRejectedValueOnce(
      new ServiceError("ALREADY_ENROLLED", "Already enrolled", 409)
    );

    const request = new Request("http://localhost");
    const response = await POST(request, {
      params: Promise.resolve({ courseId: "5" }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "ALREADY_ENROLLED",
        message: "Already enrolled",
      },
    });
  });

  it("returns 401 when unauthorized (ServiceError mapped)", async () => {
    vi.mocked(enrollInCourse).mockRejectedValueOnce(
      new ServiceError("UNAUTHORIZED", "Need login", 401)
    );

    const request = new Request("http://localhost");
    const response = await POST(request, {
      params: Promise.resolve({ courseId: "5" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 500 when unexpected error occurs", async () => {
    // Suppress console.error in test
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(enrollInCourse).mockRejectedValueOnce(new Error("DB exploded"));

    const request = new Request("http://localhost");
    const response = await POST(request, {
      params: Promise.resolve({ courseId: "5" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to enroll in course.",
      },
    });
  });
});