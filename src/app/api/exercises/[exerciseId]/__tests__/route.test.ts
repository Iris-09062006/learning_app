import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchExerciseData } from "@/features/exercises/repositories/exercise-repository";

import { GET } from "../route";

vi.mock("@/features/exercises/repositories/exercise-repository", () => ({
  fetchExerciseData: vi.fn(),
}));

const req = (id: string) =>
  new Request(`http://localhost/api/exercises/${id}`);
const paramsFor = (id: string) => Promise.resolve({ exerciseId: id });

describe("GET /api/exercises/:exerciseId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid id", async () => {
    const res = await GET(req("abc"), { params: paramsFor("abc") });
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(fetchExerciseData).mockResolvedValueOnce({
      isAuthenticated: false,
      exerciseExists: true,
      isPublished: true,
      isEnrolled: true,
      exercise: null,
    });
    const res = await GET(req("1"), { params: paramsFor("1") });
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found or unpublished", async () => {
    vi.mocked(fetchExerciseData).mockResolvedValueOnce({
      isAuthenticated: true,
      exerciseExists: false,
      isPublished: false,
      isEnrolled: false,
      exercise: null,
    });
    const res = await GET(req("1"), { params: paramsFor("1") });
    expect(res.status).toBe(404);
  });

  it("returns 403 when not enrolled", async () => {
    vi.mocked(fetchExerciseData).mockResolvedValueOnce({
      isAuthenticated: true,
      exerciseExists: true,
      isPublished: true,
      isEnrolled: false,
      exercise: null,
    });
    const res = await GET(req("1"), { params: paramsFor("1") });
    expect(res.status).toBe(403);
  });

  it("returns exercise payload on success", async () => {
    vi.mocked(fetchExerciseData).mockResolvedValueOnce({
      isAuthenticated: true,
      exerciseExists: true,
      isPublished: true,
      isEnrolled: true,
      exercise: {
        id: 1,
        lessonId: 10,
        title: "Predict",
        description: "What?",
        type: "predict_output",
        difficulty: "easy",
        order: 1,
        codeSnippet: null,
        isRequired: true,
        options: [],
      },
    });
    const res = await GET(req("1"), { params: paramsFor("1") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(1);
  });

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(fetchExerciseData).mockRejectedValueOnce(new Error("db down"));
    const res = await GET(req("1"), { params: paramsFor("1") });
    expect(res.status).toBe(500);
  });
});