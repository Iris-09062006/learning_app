import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchCourseRecommendationData } from "../../repositories/ai-repository";
import {
  AiServiceError,
  getCourseRecommendation,
} from "../ai-service";

vi.mock("../../repositories/ai-repository", () => ({
  createAiExplanationRecord: vi.fn(),
  fetchAiExplanationHistory: vi.fn(),
  fetchSubmissionDetailsForAi: vi.fn(),
  fetchCourseRecommendationData: vi.fn(),
}));

describe("getCourseRecommendation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated learners", async () => {
    vi.mocked(fetchCourseRecommendationData).mockResolvedValueOnce({
      courseExists: false,
      isPublished: false,
      isAuthenticated: false,
      isEnrolled: false,
    });

    await expect(getCourseRecommendation(1)).rejects.toThrowError(
      new AiServiceError("UNAUTHENTICATED", "Authentication is required.")
    );
  });

  it("rejects learners who are not enrolled", async () => {
    vi.mocked(fetchCourseRecommendationData).mockResolvedValueOnce({
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: false,
      courseTitle: "TypeScript",
    });

    await expect(getCourseRecommendation(1)).rejects.toThrowError(
      new AiServiceError("FORBIDDEN", "You are not enrolled in this course.")
    );
  });

  it("recommends the first unfinished lesson in curriculum order", async () => {
    vi.mocked(fetchCourseRecommendationData).mockResolvedValueOnce({
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: true,
      courseTitle: "TypeScript",
      orderedLessons: [
        {
          id: 10,
          title: "Types",
          orderIndex: 1,
          isCompleted: true,
          exercises: [],
        },
        {
          id: 20,
          title: "Functions",
          orderIndex: 2,
          isCompleted: false,
          exercises: [],
        },
        {
          id: 30,
          title: "Generics",
          orderIndex: 3,
          isCompleted: false,
          exercises: [],
        },
      ],
    });

    const result = await getCourseRecommendation(1);

    expect(result.recommendation).toMatchObject({
      type: "NEXT_LESSON",
      lessonId: 20,
      targetUrl: "/lessons/20",
    });
  });

  it("prioritizes review after three consecutive incorrect attempts", async () => {
    vi.mocked(fetchCourseRecommendationData).mockResolvedValueOnce({
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: true,
      courseTitle: "TypeScript",
      orderedLessons: [
        {
          id: 20,
          title: "Functions",
          orderIndex: 2,
          isCompleted: false,
          exercises: [
            {
              id: 200,
              title: "Function syntax",
              orderIndex: 1,
              latestSubmission: {
                isCorrect: false,
                consecutiveIncorrect: 3,
              },
            },
          ],
        },
        {
          id: 30,
          title: "Generics",
          orderIndex: 3,
          isCompleted: false,
          exercises: [],
        },
      ],
    });

    const result = await getCourseRecommendation(1);

    expect(result.recommendation).toMatchObject({
      type: "REVIEW_LESSON",
      lessonId: 20,
      exerciseId: 200,
      targetUrl: "/lessons/20",
    });
  });

  it("returns a completed-course recommendation when every lesson is complete", async () => {
    vi.mocked(fetchCourseRecommendationData).mockResolvedValueOnce({
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: true,
      courseTitle: "TypeScript",
      orderedLessons: [
        {
          id: 10,
          title: "Types",
          orderIndex: 1,
          isCompleted: true,
          exercises: [],
        },
      ],
    });

    const result = await getCourseRecommendation(1);

    expect(result.recommendation).toMatchObject({
      type: "COURSE_COMPLETED",
      lessonId: null,
      targetUrl: "/courses/1",
    });
  });

  it("returns a clear empty result when the course has no published lessons", async () => {
    vi.mocked(fetchCourseRecommendationData).mockResolvedValueOnce({
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: true,
      courseTitle: "TypeScript",
      orderedLessons: [],
    });

    await expect(getCourseRecommendation(1)).resolves.toEqual({
      courseId: 1,
      courseTitle: "TypeScript",
      recommendation: null,
    });
  });
});