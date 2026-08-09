import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOwnProfile,
  ProfileServiceError,
  updateOwnProfile,
} from "@/features/profile/services/profile-service";

vi.mock("@/features/profile/services/profile-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/profile/services/profile-service")>();
  return { ...actual, getOwnProfile: vi.fn(), updateOwnProfile: vi.fn() };
});

describe("/api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns the authenticated owner's profile envelope", async () => {
    vi.mocked(getOwnProfile).mockResolvedValueOnce({
      id: "user-1",
      email: "learner@example.com",
      username: "Learner",
      role: "learner",
      createdAt: "2026-01-01T00:00:00Z",
      learningMetrics: { enrolledCourses: 0, activeCourses: 0, completedCourses: 0, completedLessons: 0, totalLessons: 0 },
    });
    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: { id: "user-1" } });
  });

  it("PATCH validates and updates username", async () => {
    vi.mocked(updateOwnProfile).mockResolvedValueOnce({
      id: "user-1", username: "New learner", updatedAt: "2026-02-01T00:00:00Z",
    });
    const { PATCH } = await import("../route");
    const response = await PATCH(new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: " New learner " }),
    }));
    expect(response.status).toBe(200);
    expect(updateOwnProfile).toHaveBeenCalledWith({ username: "New learner" });
  });

  it.each(["role", "isActive", "id", "email"])("PATCH rejects restricted field %s", async (field) => {
    const { PATCH } = await import("../route");
    const response = await PATCH(new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "Learner", [field]: "forged" }),
    }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(updateOwnProfile).not.toHaveBeenCalled();
  });

  it("PATCH rejects malformed JSON", async () => {
    const { PATCH } = await import("../route");
    const response = await PATCH(new Request("http://localhost/api/profile", { method: "PATCH", body: "{" }));
    expect(response.status).toBe(400);
  });

  it("GET maps an unauthenticated owner lookup to 401", async () => {
    vi.mocked(getOwnProfile).mockRejectedValueOnce(
      new ProfileServiceError("UNAUTHENTICATED", "Authentication required."),
    );
    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });
});
