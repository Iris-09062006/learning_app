import { getCourseRecommendation } from "@/features/ai/services/ai-service";
import {
  fetchOwnProfileSnapshot,
  ProfileRepositoryError,
  updateOwnUsername,
} from "@/features/profile/repositories/profile-repository";
import type {
  LearnerDashboardData,
  ProfileResponse,
  UpdateProfileInput,
  UpdateProfileResponse,
} from "@/features/profile/types";

export class ProfileServiceError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "DATABASE_ERROR",
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ProfileServiceError";
  }
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof ProfileRepositoryError) {
    throw new ProfileServiceError(error.code, error.message);
  }
  throw new ProfileServiceError("DATABASE_ERROR", "Unable to access profile data.");
}

function toProfile(snapshot: Awaited<ReturnType<typeof fetchOwnProfileSnapshot>>): ProfileResponse {
  return {
    id: snapshot.id,
    email: snapshot.email,
    username: snapshot.username,
    role: snapshot.role,
    createdAt: snapshot.createdAt,
    learningMetrics: {
      enrolledCourses: snapshot.courses.length,
      activeCourses: snapshot.courses.filter((course) => course.status === "active").length,
      completedCourses: snapshot.courses.filter((course) => course.status === "completed").length,
      completedLessons: snapshot.courses.reduce((total, course) => total + course.completedLessons, 0),
      totalLessons: snapshot.courses.reduce((total, course) => total + course.totalLessons, 0),
    },
  };
}

async function loadActiveSnapshot() {
  let snapshot;
  try {
    snapshot = await fetchOwnProfileSnapshot();
  } catch (error) {
    mapRepositoryError(error);
  }

  if (!snapshot.isActive) {
    throw new ProfileServiceError("FORBIDDEN", "This account is inactive.");
  }
  return snapshot;
}

export async function getOwnProfile(): Promise<ProfileResponse> {
  return toProfile(await loadActiveSnapshot());
}

export async function getLearnerDashboard(): Promise<LearnerDashboardData> {
  const snapshot = await loadActiveSnapshot();
  const activeCourse = snapshot.courses.find((course) => course.status === "active");
  let recommendation = null;

  if (activeCourse) {
    try {
      recommendation = (await getCourseRecommendation(activeCourse.id)).recommendation;
    } catch {
      recommendation = null;
    }
  }

  return { profile: toProfile(snapshot), courses: snapshot.courses, recommendation };
}

export function parseUpdateProfileInput(value: unknown): UpdateProfileInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProfileServiceError("VALIDATION_ERROR", "Invalid request body.", {
      body: "Request body must be an object.",
    });
  }

  const record = value as Record<string, unknown>;
  const unknownFields = Object.keys(record).filter((field) => field !== "username");
  if (unknownFields.length > 0) {
    throw new ProfileServiceError("VALIDATION_ERROR", "Restricted fields are not allowed.", {
      fields: `Unsupported fields: ${unknownFields.join(", ")}`,
    });
  }

  const username = typeof record.username === "string" ? record.username.trim() : "";
  if (username.length < 3 || username.length > 50) {
    throw new ProfileServiceError("VALIDATION_ERROR", "Invalid username.", {
      username: "Username must be between 3 and 50 characters.",
    });
  }

  return { username };
}

export async function updateOwnProfile(input: UpdateProfileInput): Promise<UpdateProfileResponse> {
  await loadActiveSnapshot();
  try {
    return await updateOwnUsername(input.username);
  } catch (error) {
    mapRepositoryError(error);
  }
}
