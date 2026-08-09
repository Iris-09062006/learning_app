import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiServiceError,
  getCourseRecommendation,
} from "@/features/ai/services/ai-service";
import { GET } from "../route";

vi.mock("@/features/ai/services/ai-service", () => ({
  getCourseRecommendation: vi.fn(),
  AiServiceError: class extends Error {
    constructor(
      public readonly code: string,
      message: string
    ) {
      super(message);
      this.name = "AiServiceError";
    }
  },
}));

describe("GET /api/courses/[courseId]/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when courseId is invalid", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "invalid" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid course ID format",
    });
    expect(getCourseRecommendation).not.toHaveBeenCalled();
  });

  it("returns the recommendation result", async () => {
    const result = {
      courseId: 7,
      courseTitle: "TypeScript",
      recommendation: {
        type: "NEXT_LESSON" as const,
        title: "Tiếp tục học",
        description: "Bài học tiếp theo: Functions",
        targetUrl: "/lessons/20",
        lessonId: 20,
        exerciseId: null,
        reason: "Đây là bài học tiếp theo trong lộ trình của bạn.",
      },
    };
    vi.mocked(getCourseRecommendation).mockResolvedValueOnce(result);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "7" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(getCourseRecommendation).toHaveBeenCalledWith(7);
  });

  it.each([
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
  ] as const)("maps %s service errors to %i", async (code, status) => {
    vi.mocked(getCourseRecommendation).mockRejectedValueOnce(
      new AiServiceError(code, `${code} message`)
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "7" }),
    });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      error: `${code} message`,
    });
  });

  it("returns 500 for database and unexpected failures", async () => {
    vi.mocked(getCourseRecommendation).mockRejectedValueOnce(
      new AiServiceError("DATABASE_ERROR", "Database unavailable")
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "7" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to load course recommendation",
    });
  });
});