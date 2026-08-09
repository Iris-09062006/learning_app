import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";
import { AiServiceError, getAiExplanationHistory } from "@/features/ai/services/ai-service";

vi.mock("@/features/ai/services/ai-service", () => ({
  AiServiceError: class AiServiceError extends Error {
    constructor(
      public readonly code: string,
      message: string
    ) {
      super(message);
    }
  },
  getAiExplanationHistory: vi.fn(),
}));

describe("GET /api/submissions/[submissionId]/explanations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when submissionId is invalid", async () => {
    const req = new Request("http://localhost/api/submissions/abc/explanations");
    const res = await GET(req, { params: Promise.resolve({ submissionId: "abc" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 and history data", async () => {
    const mockHistory = [
      {
        id: 1,
        submissionId: 10,
        userQuestion: null,
        response: "Explanation",
        provider: "mock",
        model: null,
        status: "success" as const,
        errorCode: null,
        createdAt: "2026-08-01T00:00:00Z",
      },
    ];

    vi.mocked(getAiExplanationHistory).mockResolvedValueOnce(mockHistory);

    const req = new Request("http://localhost/api/submissions/10/explanations");
    const res = await GET(req, { params: Promise.resolve({ submissionId: "10" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.explanations).toEqual(mockHistory);
  });

  it("returns 403 when FORBIDDEN error occurs", async () => {
    vi.mocked(getAiExplanationHistory).mockRejectedValueOnce(
      new AiServiceError("FORBIDDEN", "Forbidden access")
    );

    const req = new Request("http://localhost/api/submissions/10/explanations");
    const res = await GET(req, { params: Promise.resolve({ submissionId: "10" }) });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });
});