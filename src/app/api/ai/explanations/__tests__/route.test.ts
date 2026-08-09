import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";
import { AiServiceError, requestAiExplanation } from "@/features/ai/services/ai-service";

vi.mock("@/features/ai/services/ai-service", () => ({
  AiServiceError: class AiServiceError extends Error {
    constructor(
      public readonly code: string,
      message: string
    ) {
      super(message);
    }
  },
  requestAiExplanation: vi.fn(),
}));

describe("POST /api/ai/explanations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/ai/explanations", {
      method: "POST",
      body: "{invalid-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when submissionId is invalid", async () => {
    const req = new Request("http://localhost/api/ai/explanations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: "abc" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 and explanation data on success", async () => {
    const mockRecord = {
      id: 1,
      submissionId: 10,
      userQuestion: "Explain this",
      response: "Detailed explanation",
      provider: "mock",
      model: null,
      status: "success" as const,
      errorCode: null,
      createdAt: "2026-08-01T00:00:00Z",
    };

    vi.mocked(requestAiExplanation).mockResolvedValueOnce(mockRecord);

    const req = new Request("http://localhost/api/ai/explanations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: 10, question: "Explain this" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.explanation).toEqual(mockRecord);
  });

  it("maps AiServiceError code to appropriate status", async () => {
    vi.mocked(requestAiExplanation).mockRejectedValueOnce(
      new AiServiceError("AI_PROVIDER_ERROR", "Provider timeout")
    );

    const req = new Request("http://localhost/api/ai/explanations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: 10 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error.code).toBe("AI_PROVIDER_ERROR");
  });
});