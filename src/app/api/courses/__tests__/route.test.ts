import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as listCourses } from "../route";
import { GET as getCourseDetail } from "../[courseId]/route";
import {
  getPublishedCourses,
  getCourseById,
  ServiceError,
} from "@/features/courses/services/course-service";

vi.mock("@/features/courses/services/course-service", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/courses/services/course-service")
    >();
  return {
    ...actual,
    getPublishedCourses: vi.fn(),
    getCourseById: vi.fn(),
  };
});

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/courses", () => {
  it("returns published courses with pagination meta", async () => {
    const items = [
      {
        id: 1,
        slug: "python-basic",
        title: "Python Basic",
        description: "Desc",
        level: "beginner",
        language: "python",
        isPublished: true,
        isEnrolled: false,
        completionPercentage: 0,
      },
    ];
    vi.mocked(getPublishedCourses).mockResolvedValueOnce({
      items,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    const res = await listCourses(
      makeRequest(
        "http://localhost/api/courses?search=%20Python%20&page=1&pageSize=20"
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: items,
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    expect(getPublishedCourses).toHaveBeenCalledWith({
      page: "1",
      pageSize: "20",
      search: " Python ",
    });
  });

  it("returns 400 for an invalid search query", async () => {
    vi.mocked(getPublishedCourses).mockRejectedValueOnce(
      new ServiceError(
        "VALIDATION_ERROR",
        "Search must not contain control characters."
      )
    );

    const res = await listCourses(
      makeRequest("http://localhost/api/courses?search=python%0Acourse")
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Search must not contain control characters.",
      },
    });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(getPublishedCourses).mockRejectedValueOnce(new Error("db down"));

    const res = await listCourses(makeRequest("http://localhost/api/courses"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: { code: "DATABASE_ERROR", message: "Failed to fetch courses." },
    });
  });
});

describe("GET /api/courses/:courseId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("returns course detail for a valid id", async () => {
    const course = {
      id: 1,
      slug: "python-basic",
      title: "Python Basic",
      description: "Desc",
      level: "beginner",
      language: "python",
      isPublished: true,
      chapterCount: 2,
      lessonCount: 5,
      isEnrolled: false,
      chapters: [],
    };
    vi.mocked(getCourseById).mockResolvedValueOnce(course);

    const res = await getCourseDetail(makeRequest("http://localhost/api/courses/1"), {
      params: Promise.resolve({ courseId: "1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: course });
    expect(getCourseById).toHaveBeenCalledWith(1);
  });

  it("returns 400 for invalid course id", async () => {
    const res = await getCourseDetail(makeRequest("http://localhost/api/courses/abc"), {
      params: Promise.resolve({ courseId: "abc" }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid course ID." },
    });
    expect(getCourseById).not.toHaveBeenCalled();
  });

  it("returns 404 when course not found or unpublished", async () => {
    vi.mocked(getCourseById).mockResolvedValueOnce(null);

    const res = await getCourseDetail(makeRequest("http://localhost/api/courses/99"), {
      params: Promise.resolve({ courseId: "99" }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Course not found or not published." },
    });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(getCourseById).mockRejectedValueOnce(new Error("db down"));

    const res = await getCourseDetail(makeRequest("http://localhost/api/courses/1"), {
      params: Promise.resolve({ courseId: "1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: { code: "DATABASE_ERROR", message: "Failed to fetch course details." },
    });
  });
});
