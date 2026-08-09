import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCourseRecommendation } from "@/features/ai/services/ai-service";
import { fetchOwnProfileSnapshot, updateOwnUsername } from "@/features/profile/repositories/profile-repository";
import {
  getLearnerDashboard,
  getOwnProfile,
  parseUpdateProfileInput,
  updateOwnProfile,
} from "../profile-service";

vi.mock("@/features/profile/repositories/profile-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/profile/repositories/profile-repository")>();
  return { ...actual, fetchOwnProfileSnapshot: vi.fn(), updateOwnUsername: vi.fn() };
});
vi.mock("@/features/ai/services/ai-service", () => ({ getCourseRecommendation: vi.fn() }));

const snapshot = {
  id: "user-1",
  email: "learner@example.com",
  username: "Learner",
  role: "learner" as const,
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  courses: [{
    id: 2,
    title: "Python",
    description: null,
    status: "active" as const,
    enrolledAt: "2026-01-02T00:00:00Z",
    completedLessons: 2,
    totalLessons: 4,
    completionPercentage: 50,
    resumeLessonId: 9,
    resumeUrl: "/lessons/9",
  }],
};

describe("profile service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns contract profile fields with summarized learning metrics", async () => {
    vi.mocked(fetchOwnProfileSnapshot).mockResolvedValueOnce(snapshot);
    await expect(getOwnProfile()).resolves.toMatchObject({
      id: "user-1",
      learningMetrics: {
        enrolledCourses: 1,
        activeCourses: 1,
        completedCourses: 0,
        completedLessons: 2,
        totalLessons: 4,
      },
    });
  });

  it("loads the recommendation only for the active enrolled course", async () => {
    vi.mocked(fetchOwnProfileSnapshot).mockResolvedValueOnce(snapshot);
    vi.mocked(getCourseRecommendation).mockResolvedValueOnce({
      courseId: 2,
      courseTitle: "Python",
      recommendation: {
        type: "NEXT_LESSON",
        title: "Tiếp tục học",
        description: "Bài tiếp theo",
        targetUrl: "/lessons/9",
        lessonId: 9,
        exerciseId: null,
        reason: "Theo tiến độ",
      },
    });
    await expect(getLearnerDashboard()).resolves.toMatchObject({
      recommendation: { targetUrl: "/lessons/9" },
    });
    expect(getCourseRecommendation).toHaveBeenCalledWith(2);
  });

  it("rejects inactive profiles", async () => {
    vi.mocked(fetchOwnProfileSnapshot).mockResolvedValueOnce({ ...snapshot, isActive: false });
    await expect(getOwnProfile()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("trims a valid username and rejects restricted fields", () => {
    expect(parseUpdateProfileInput({ username: "  New learner  " })).toEqual({ username: "New learner" });
    expect(() => parseUpdateProfileInput({ username: "Learner", role: "admin" })).toThrowError(/Restricted/);
    expect(() => parseUpdateProfileInput({ username: "x" })).toThrowError(/Invalid username/);
  });

  it("checks account state before updating the username", async () => {
    vi.mocked(fetchOwnProfileSnapshot).mockResolvedValueOnce(snapshot);
    vi.mocked(updateOwnUsername).mockResolvedValueOnce({
      id: "user-1",
      username: "Updated",
      updatedAt: "2026-02-01T00:00:00Z",
    });
    await expect(updateOwnProfile({ username: "Updated" })).resolves.toMatchObject({ username: "Updated" });
  });
});
