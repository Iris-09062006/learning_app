import type { ProgressStatus } from "@/features/courses/types";

export interface CourseProgressResponse {
  courseId: number;
  completedLessons: number;
  totalLessons: number;
  completionPercentage: number;
  lastAccessedLessonId: number | null;
}

export interface LessonProgressResponse {
  lessonId: number;
  status: ProgressStatus;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
}

export interface CourseProgressAccessResult {
  courseExists: boolean;
  isPublished: boolean;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  progress: CourseProgressResponse | null;
}

export interface LessonProgressAccessResult {
  lessonExists: boolean;
  isPublished: boolean;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  progress: LessonProgressResponse | null;
}