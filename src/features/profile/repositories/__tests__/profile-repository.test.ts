import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOwnProfileSnapshot, updateOwnUsername } from "../profile-repository";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

function createBuilder(result: unknown) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn(),
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(result).then(resolve);
    },
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);
  return builder;
}

describe("profile repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes profile, enrollment, and progress reads to the authenticated owner", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "owner-1", email: "owner@example.com" } },
      error: null,
    });
    const profile = createBuilder({
      data: { id: "owner-1", username: "Owner", role: "learner", is_active: true, created_at: "2026-01-01T00:00:00Z" },
      error: null,
    });
    const enrollments = createBuilder({
      data: [{ course_id: 1, status: "active", enrolled_at: "2026-01-02T00:00:00Z" }],
      error: null,
    });
    const courses = createBuilder({ data: [{ id: 1, title: "Python", description: "Basics" }], error: null });
    const chapters = createBuilder({ data: [{ id: 10, course_id: 1 }], error: null });
    const lessons = createBuilder({ data: [{ id: 100, chapter_id: 10 }, { id: 101, chapter_id: 10 }], error: null });
    const progress = createBuilder({
      data: [
        { lesson_id: 100, status: "completed", last_accessed_at: "2026-01-03T00:00:00Z" },
        { lesson_id: 101, status: "unlocked", last_accessed_at: null },
      ],
      error: null,
    });
    mockFrom
      .mockReturnValueOnce(profile)
      .mockReturnValueOnce(enrollments)
      .mockReturnValueOnce(courses)
      .mockReturnValueOnce(chapters)
      .mockReturnValueOnce(lessons)
      .mockReturnValueOnce(progress);

    await expect(fetchOwnProfileSnapshot()).resolves.toMatchObject({
      id: "owner-1",
      email: "owner@example.com",
      courses: [{ id: 1, completedLessons: 1, totalLessons: 2, completionPercentage: 50, resumeLessonId: 100 }],
    });
    expect(profile.eq).toHaveBeenCalledWith("id", "owner-1");
    expect(enrollments.eq).toHaveBeenCalledWith("user_id", "owner-1");
    expect(progress.eq).toHaveBeenCalledWith("user_id", "owner-1");
  });

  it("updates only username on the authenticated owner's row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    const update = createBuilder({
      data: { id: "owner-1", username: "New name", updated_at: "2026-02-01T00:00:00Z" },
      error: null,
    });
    mockFrom.mockReturnValueOnce(update);

    await expect(updateOwnUsername("New name")).resolves.toEqual({
      id: "owner-1",
      username: "New name",
      updatedAt: "2026-02-01T00:00:00Z",
    });
    expect(update.update).toHaveBeenCalledWith({ username: "New name" });
    expect(update.eq).toHaveBeenCalledWith("id", "owner-1");
    expect(update.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("rejects unauthenticated access before querying tables", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(fetchOwnProfileSnapshot()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
