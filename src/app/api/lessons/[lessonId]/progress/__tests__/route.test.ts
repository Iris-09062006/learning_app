import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";
import {
  getLessonProgress,
  ProgressError,
} from "@/features/progress/services/progress-service";

vi.mock("@/features/progress/services/progress-service", () => ({
  getLessonProgress: vi.fn(),
  ProgressError: class extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = "ProgressError";
    }
  },
}));

describe("GET /api/lessons/[lessonId]/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when lessonId is invalid", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ lessonId: "invalid" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid lesson ID.",
      },
    });
    expect(getLessonProgress).not.toHaveBeenCalled();
  });

  it("returns 200 with lesson progress", async () => {
    const progress = {
      lessonId: 2,
      status: "completed" as const,
      startedAt: "2026-08-01T00:00:00.000Z",
      completedAt: "2026-08-02T00:00:00.000Z",
      lastAccessedAt: "2026-08-02T00:00:00.000Z",
    };
    vi.mocked(getLessonProgress).mockResolvedValueOnce(progress);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ lessonId: "2" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: progress,
    });
    expect(getLessonProgress).toHaveBeenCalledWith(2);
  });

  it.each([
    ["UNAUTHENTICATED", "Authentication required", 401],
    ["NOT_ENROLLED", "Not enrolled in this course", 403],
    ["NOT_PUBLISHED", "Lesson is not published", 403],
    ["NOT_FOUND", "Lesson not found", 404],
  ] as const)("maps %s errors to status %i", async (code, message, status) => {
    vi.mocked(getLessonProgress).mockRejectedValueOnce(
      new ProgressError(code, message),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ lessonId: "2" }),
    });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { code, message },
    });
  });

  it("returns 500 for an unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getLessonProgress).mockRejectedValueOnce(
      new Error("Database unavailable"),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ lessonId: "2" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch lesson progress.",
      },
    });
  });
});