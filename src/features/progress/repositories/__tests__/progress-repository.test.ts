import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchUserCourseProgress,
  fetchUserLessonProgress,
} from "../progress-repository";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

function createBuilder(result: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => Promise.resolve(result).then(resolve);

  return builder;
}

describe("progress repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated course access without querying course data", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(fetchUserCourseProgress(1)).resolves.toEqual({
      courseExists: true,
      isPublished: true,
      isAuthenticated: false,
      isEnrolled: false,
      progress: null,
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("calculates enrolled course progress and finds the latest accessed lesson", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const course = createBuilder({ data: { id: 1, is_published: true }, error: null });
    const enrollment = createBuilder({ data: { id: 9 }, error: null });
    const chapters = createBuilder({ data: [{ id: 10 }], error: null });
    const lessons = createBuilder({ data: [{ id: 101 }, { id: 102 }], error: null });
    const statuses = createBuilder({
      data: [
        { lesson_id: 101, status: "completed" },
        { lesson_id: 102, status: "in_progress" },
      ],
      error: null,
    });
    const lastAccessed = createBuilder({ data: { lesson_id: 102 }, error: null });

    mockFrom
      .mockReturnValueOnce(course)
      .mockReturnValueOnce(enrollment)
      .mockReturnValueOnce(chapters)
      .mockReturnValueOnce(lessons)
      .mockReturnValueOnce(statuses)
      .mockReturnValueOnce(lastAccessed);

    await expect(fetchUserCourseProgress(1)).resolves.toEqual({
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: true,
      progress: {
        courseId: 1,
        completedLessons: 1,
        totalLessons: 2,
        completionPercentage: 50,
        lastAccessedLessonId: 102,
      },
    });
  });

  it("returns lesson progress with normalized status for an enrolled user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const lesson = createBuilder({
      data: { id: 2, is_published: true, chapters: { course_id: 1 } },
      error: null,
    });
    const enrollment = createBuilder({ data: { id: 7 }, error: null });
    const progress = createBuilder({
      data: {
        status: "in_progress",
        started_at: "2026-08-01T00:00:00.000Z",
        completed_at: null,
        last_accessed_at: "2026-08-02T00:00:00.000Z",
      },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(lesson)
      .mockReturnValueOnce(enrollment)
      .mockReturnValueOnce(progress);

    await expect(fetchUserLessonProgress(2)).resolves.toEqual({
      lessonExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: true,
      progress: {
        lessonId: 2,
        status: "inProgress",
        startedAt: "2026-08-01T00:00:00.000Z",
        completedAt: null,
        lastAccessedAt: "2026-08-02T00:00:00.000Z",
      },
    });
  });
});