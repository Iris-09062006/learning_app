import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchCourseDetail,
  fetchCourseSummaries,
  enrollUserInCourse,
  fetchCourseRoadmap,
} from "@/features/courses/repositories/course-repository";
import {
  enrollInCourse,
  getCourseById,
  getPublishedCourses,
  normalizeCourseSearch,
  normalizePagination,
  getCourseRoadmap,
} from "@/features/courses/services/course-service";

vi.mock("@/features/courses/repositories/course-repository", () => ({
  fetchCourseSummaries: vi.fn(),
  fetchCourseDetail: vi.fn(),
  enrollUserInCourse: vi.fn(),
  fetchCourseRoadmap: vi.fn(),
}));

describe("course service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes invalid and oversized pagination values", () => {
    expect(
      normalizePagination({ page: "abc", pageSize: "-5" }),
    ).toEqual({ page: 1, pageSize: 20 });

    expect(normalizePagination({ page: "2.8", pageSize: "200" })).toEqual({
      page: 2,
      pageSize: 100,
    });
  });

  it("delegates published course listing with normalized pagination", async () => {
    const result = {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    };
    vi.mocked(fetchCourseSummaries).mockResolvedValueOnce(result);

    await expect(
      getPublishedCourses({
        page: "abc",
        pageSize: "-5",
        search: "  Python basics  ",
      }),
    ).resolves.toEqual(result);
    expect(fetchCourseSummaries).toHaveBeenCalledWith(
      1,
      20,
      "Python basics"
    );
  });

  it("treats an empty search query as absent", async () => {
    vi.mocked(fetchCourseSummaries).mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });

    await getPublishedCourses({ search: "   " });

    expect(fetchCourseSummaries).toHaveBeenCalledWith(1, 20, undefined);
  });

  it("rejects control characters without querying the repository", async () => {
    expect(() => normalizeCourseSearch("python\u0000course")).toThrowError(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        statusCode: 400,
      })
    );

    await expect(
      getPublishedCourses({ search: "python\ncourse" })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
    expect(fetchCourseSummaries).not.toHaveBeenCalled();
  });

  it("returns published course details", async () => {
    const detail = {
      id: 1,
      slug: "python-basic",
      title: "Python Basic",
      description: "Learn Python.",
      level: "beginner",
      language: "python",
      isPublished: true,
      chapterCount: 0,
      lessonCount: 0,
      isEnrolled: false,
      chapters: [],
    };
    vi.mocked(fetchCourseDetail).mockResolvedValueOnce(detail);

    await expect(getCourseById(1)).resolves.toEqual(detail);
    expect(fetchCourseDetail).toHaveBeenCalledWith(1);
  });

  it("returns null for invalid, missing, or unpublished courses", async () => {
    await expect(getCourseById(0)).resolves.toBeNull();
    expect(fetchCourseDetail).not.toHaveBeenCalled();

    vi.mocked(fetchCourseDetail).mockResolvedValueOnce(null);
    await expect(getCourseById(2)).resolves.toBeNull();

    vi.mocked(fetchCourseDetail).mockResolvedValueOnce({
      id: 3,
      slug: "draft",
      title: "Draft",
      description: null,
      level: "beginner",
      language: "python",
      isPublished: false,
      chapterCount: 0,
      lessonCount: 0,
      isEnrolled: false,
      chapters: [],
    });
    await expect(getCourseById(3)).resolves.toBeNull();
  });

  it("rejects invalid course IDs for enrollment", async () => {
    await expect(enrollInCourse(0)).rejects.toMatchObject({
      code: "INVALID_ID",
      statusCode: 400,
    });
    expect(enrollUserInCourse).not.toHaveBeenCalled();
  });

  it("delegates enrollment to the repository", async () => {
    const result = {
      enrollmentId: 11,
      courseId: 7,
      enrolledAt: "2026-03-08T10:00:00.000Z",
      firstLessonId: 42,
    };
    vi.mocked(enrollUserInCourse).mockResolvedValueOnce(result);

    await expect(enrollInCourse(7)).resolves.toEqual(result);
    expect(enrollUserInCourse).toHaveBeenCalledWith(7);
  });

  it("maps PostgreSQL error 23505 to ALREADY_ENROLLED (409)", async () => {
    vi.mocked(enrollUserInCourse).mockRejectedValueOnce({
      code: "23505",
      message: "Course enrollment already exists",
    });

    await expect(enrollInCourse(7)).rejects.toMatchObject({
      code: "ALREADY_ENROLLED",
      statusCode: 409,
    });
  });

  it("maps PostgreSQL error 28000 to UNAUTHORIZED (401)", async () => {
    vi.mocked(enrollUserInCourse).mockRejectedValueOnce({
      code: "28000",
      message: "Authentication required",
    });

    await expect(enrollInCourse(7)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  });

  it("maps PostgreSQL error 42501 to FORBIDDEN (403)", async () => {
    vi.mocked(enrollUserInCourse).mockRejectedValueOnce({
      code: "42501",
      message: "Active learner profile required",
    });

    await expect(enrollInCourse(7)).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });
  });

  it("maps PostgreSQL error P0002 to NOT_FOUND (404)", async () => {
    vi.mocked(enrollUserInCourse).mockRejectedValueOnce({
      code: "P0002",
      message: "Published course not found",
    });

    await expect(enrollInCourse(7)).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });
  });

  it("re-throws unexpected repository errors", async () => {
    const unexpected = new Error("boom");
    vi.mocked(enrollUserInCourse).mockRejectedValueOnce(unexpected);

    await expect(enrollInCourse(7)).rejects.toBe(unexpected);
  });

  it("rejects invalid course IDs before fetching a roadmap", async () => {
    await expect(getCourseRoadmap(0)).rejects.toMatchObject({
      code: "INVALID_ID",
      statusCode: 400,
    });
    expect(fetchCourseRoadmap).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for missing or unpublished roadmap courses", async () => {
    vi.mocked(fetchCourseRoadmap).mockResolvedValueOnce({
      courseExists: false,
      isPublished: false,
      isAuthenticated: false,
      isEnrolled: false,
      roadmap: null,
    });

    await expect(getCourseRoadmap(7)).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });
  });

  it("returns UNAUTHENTICATED when a roadmap learner is not signed in", async () => {
    vi.mocked(fetchCourseRoadmap).mockResolvedValueOnce({
      courseExists: true,
      isPublished: true,
      isAuthenticated: false,
      isEnrolled: false,
      roadmap: null,
    });

    await expect(getCourseRoadmap(7)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      statusCode: 401,
    });
  });

  it("returns COURSE_NOT_ENROLLED for an unenrolled learner", async () => {
    vi.mocked(fetchCourseRoadmap).mockResolvedValueOnce({
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: false,
      roadmap: null,
    });

    await expect(getCourseRoadmap(7)).rejects.toMatchObject({
      code: "COURSE_NOT_ENROLLED",
      statusCode: 403,
    });
  });

  it("returns an enrolled learner's formatted roadmap", async () => {
    const roadmap = {
      course: { id: 7, title: "Python Foundations" },
      completionPercentage: 50,
      chapters: [
        {
          id: 11,
          title: "Basics",
          order: 1,
          lessons: [
            {
              id: 21,
              title: "Variables",
              order: 1,
              estimatedMinutes: 15,
              status: "completed" as const,
            },
            {
              id: 22,
              title: "Conditions",
              order: 2,
              estimatedMinutes: 20,
              status: "inProgress" as const,
            },
          ],
        },
      ],
    };
    vi.mocked(fetchCourseRoadmap).mockResolvedValueOnce({
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: true,
      roadmap,
    });

    await expect(getCourseRoadmap(7)).resolves.toEqual(roadmap);
    expect(fetchCourseRoadmap).toHaveBeenCalledWith(7);
  });
});
