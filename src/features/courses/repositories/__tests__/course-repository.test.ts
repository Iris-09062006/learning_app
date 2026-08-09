import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  enrollUserInCourse,
  escapePostgrestIlikePattern,
  fetchCourseSummaries,
} from "../course-repository";
import type { EnrollCourseRpcRaw } from "@/features/courses/types";

const mockRpc = vi.fn();
const mockOrder = vi.fn();
const mockCourseQuery = {
  select: vi.fn(),
  eq: vi.fn(),
  or: vi.fn(),
  range: vi.fn(),
  order: mockOrder,
};
const mockFrom = vi.fn(() => mockCourseQuery);

mockCourseQuery.select.mockReturnValue(mockCourseQuery);
mockCourseQuery.eq.mockReturnValue(mockCourseQuery);
mockCourseQuery.or.mockReturnValue(mockCourseQuery);
mockCourseQuery.range.mockReturnValue(mockCourseQuery);

vi.mock("@/lib/supabase/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/server")>();
  return {
    ...actual,
    createServerSupabaseClient: vi.fn(() =>
      Promise.resolve({
        rpc: mockRpc,
        auth: { getUser: vi.fn() },
        from: mockFrom,
      })
    ),
  };
});

describe("fetchCourseSummaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], count: 0, error: null });
  });

  it("always filters published courses and applies pagination", async () => {
    await fetchCourseSummaries(2, 10);

    expect(mockFrom).toHaveBeenCalledWith("courses");
    expect(mockCourseQuery.eq).toHaveBeenCalledWith("is_published", true);
    expect(mockCourseQuery.or).not.toHaveBeenCalled();
    expect(mockCourseQuery.range).toHaveBeenCalledWith(10, 19);
    expect(mockOrder).toHaveBeenCalledWith("id", { ascending: true });
  });

  it("searches title or description with an escaped case-insensitive pattern", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 7,
          slug: "python-100",
          title: "Python 100%",
          description: "Special_course",
          level: "beginner",
          language: "python",
          is_published: true,
        },
      ],
      count: 1,
      error: null,
    });

    const result = await fetchCourseSummaries(1, 20, '100%_course,(intro)"');

    expect(mockCourseQuery.eq).toHaveBeenCalledWith("is_published", true);
    expect(mockCourseQuery.or).toHaveBeenCalledWith(
      'title.ilike."%100\\%\\_course,(intro)\\"%",description.ilike."%100\\%\\_course,(intro)\\"%"'
    );
    expect(result.items[0]).toMatchObject({
      id: 7,
      isPublished: true,
      isEnrolled: false,
      completionPercentage: 0,
    });
  });

  it("escapes backslashes and LIKE wildcards", () => {
    expect(escapePostgrestIlikePattern("a\\b%c_d")).toBe(
      '"%a\\\\b\\%c\\_d%"'
    );
  });
});

describe("enrollUserInCourse", () => {
  it("calls rpc enroll_course with courseId and maps raw result", async () => {
    const raw: EnrollCourseRpcRaw = {
      enrollment_id: 5,
      course_id: 1,
      enrolled_at: "2026-08-03T10:00:00Z",
      first_lesson_id: 7,
    };
    mockRpc.mockResolvedValueOnce({ data: raw, error: null });

    const result = await enrollUserInCourse(1);

    expect(mockRpc).toHaveBeenCalledWith("enroll_course", {
      p_course_id: 1,
    });
    expect(result).toEqual({
      enrollmentId: 5,
      courseId: 1,
      enrolledAt: raw.enrolled_at,
      firstLessonId: 7,
    });
  });

  it("returns null firstLessonId when absent", async () => {
    const raw: EnrollCourseRpcRaw = {
      enrollment_id: 6,
      course_id: 2,
      enrolled_at: "2026-08-03T10:00:00Z",
      first_lesson_id: null,
    };
    mockRpc.mockResolvedValueOnce({ data: raw, error: null });

    const result = await enrollUserInCourse(2);

    expect(result.firstLessonId).toBeNull();
  });

  it("throws when supabase rpc returns an error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: new Error("permission denied"),
    });

    await expect(enrollUserInCourse(9)).rejects.toThrow("permission denied");
    expect(mockRpc).toHaveBeenCalledWith("enroll_course", {
      p_course_id: 9,
    });
  });
});
