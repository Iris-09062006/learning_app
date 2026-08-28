import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "../route";
import * as aiService from "@/features/ai/services/ai-service";
import { AiServiceError } from "@/features/ai/services/ai-service";
import type { GeneratedExerciseRecord } from "@/features/ai/types";

vi.mock("@/features/ai/services/ai-service", () => ({
  generateExercise: vi.fn(),
  AiServiceError: class AiServiceError extends Error {
    constructor(
      public readonly code: string,
      message: string
    ) {
      super(message);
      this.name = "AiServiceError";
    }
  },
}));

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/ai/exercises/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const MOCK_GENERATED_EXERCISE: GeneratedExerciseRecord = {
  id: 1,
  lessonId: 10,
  exerciseType: "predict_output",
  difficulty: "medium",
  title: "Luyện tập: Biến số",
  description: "Bài tập medium về Biến số.",
  content: {
    type: "predict_output",
    title: "Luyện tập: Biến số",
    description: "Bài tập medium về Biến số.",
    codeSnippet: 'console.log("Hello");',
    options: ["Hello", "Error", "undefined"],
    correctAnswer: "Hello",
    explanation: "Đây là giải thích mẫu.",
  },
  status: "pending",
  provider: "mock",
  model: null,
  requestedBy: "user-123",
  publishedExerciseId: null,
  publishedAt: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("POST /api/ai/exercises/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  describe("Validation", () => {
    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest("http://localhost/api/ai/exercises/generate", {
        method: "POST",
        body: "invalid-json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("INVALID_BODY");
    });

    it("should return 400 if required fields are missing", async () => {
      const request = createJsonRequest({ lessonId: 1 });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("ignores a legacy exerciseType and lets the provider select the modality", async () => {
      vi.mocked(aiService.generateExercise).mockResolvedValue({ generatedExercise: MOCK_GENERATED_EXERCISE });
      const request = createJsonRequest({
        lessonId: 1,
        exerciseType: "invalid_type",
        difficulty: "easy",
        learningObjective: "Test",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.generatedExercise.exerciseType).toBe("predict_output");
    });

    it("should return 400 for invalid difficulty", async () => {
      const request = createJsonRequest({
        lessonId: 1,
        difficulty: "impossible",
        learningObjective: "Test",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("Service Interaction", () => {
    it("should return 201 and generatedExercise on success", async () => {
      vi.stubEnv("TAVILY_API_KEY", "");
      vi.mocked(aiService.generateExercise).mockResolvedValue({
        generatedExercise: MOCK_GENERATED_EXERCISE,
      });

      const request = createJsonRequest({
        lessonId: 10,
        difficulty: "medium",
        learningObjective: "Biến số trong JS",
        topicHint: "Từ khóa let",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.generatedExercise).toEqual(MOCK_GENERATED_EXERCISE);
      expect(aiService.generateExercise).toHaveBeenCalledWith({
        lessonId: 10,
        difficulty: "medium",
        learningObjective: "Biến số trong JS",
        topicHint: "Từ khóa let",
      });
      expect(JSON.stringify(data)).not.toMatch(/Tavily|raw_content|request_id/i);
    });

    it("should map UNAUTHENTICATED to 401", async () => {
      vi.mocked(aiService.generateExercise).mockRejectedValue(
        new AiServiceError("UNAUTHENTICATED", "Auth required")
      );

      const request = createJsonRequest({
        lessonId: 10,
        difficulty: "medium",
        learningObjective: "Biến số",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("UNAUTHENTICATED");
    });

    it("should map FORBIDDEN to 403", async () => {
      vi.mocked(aiService.generateExercise).mockRejectedValue(
        new AiServiceError("FORBIDDEN", "Moderator only")
      );

      const request = createJsonRequest({
        lessonId: 10,
        difficulty: "medium",
        learningObjective: "Biến số",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("FORBIDDEN");
    });

    it("should map AI_PROVIDER_ERROR to 502", async () => {
      vi.mocked(aiService.generateExercise).mockRejectedValue(
        new AiServiceError("AI_PROVIDER_ERROR", "Provider failed")
      );

      const request = createJsonRequest({
        lessonId: 10,
        difficulty: "medium",
        learningObjective: "Biến số",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toBe("AI_PROVIDER_ERROR");
    });

    it("should map RATE_LIMITED to 429", async () => {
      vi.mocked(aiService.generateExercise).mockRejectedValue(
        new AiServiceError("RATE_LIMITED", "Retry later")
      );

      const response = await POST(createJsonRequest({
        lessonId: 10,
        difficulty: "medium",
        learningObjective: "Biến số",
      }));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("RATE_LIMITED");
    });

    it("should map generic errors to 500 INTERNAL_ERROR", async () => {
      vi.mocked(aiService.generateExercise).mockRejectedValue(
        new Error("Random crash")
      );

      const request = createJsonRequest({
        lessonId: 10,
        difficulty: "medium",
        learningObjective: "Biến số",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("INTERNAL_ERROR");
    });
  });
});
