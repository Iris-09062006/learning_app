import type { UserRole } from "@/features/auth/auth.types";
import type { LearningRecommendation } from "@/features/ai/types";

export interface LearningMetrics {
  enrolledCourses: number;
  activeCourses: number;
  completedCourses: number;
  completedLessons: number;
  totalLessons: number;
}

export interface ProfileResponse {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
  learningMetrics: LearningMetrics;
}

export interface UpdateProfileInput {
  username: string;
}

export interface UpdateProfileResponse {
  id: string;
  username: string;
  updatedAt: string;
}

export interface DashboardCourse {
  id: number;
  title: string;
  description: string | null;
  status: "active" | "completed" | "cancelled";
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  completionPercentage: number;
  resumeLessonId: number | null;
  resumeUrl: string;
}

export interface LearnerDashboardData {
  profile: ProfileResponse;
  courses: DashboardCourse[];
  recommendation: LearningRecommendation | null;
}

export interface ProfileRepositorySnapshot {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  courses: DashboardCourse[];
}
