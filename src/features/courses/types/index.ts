import type { Database } from "@/generated/database.types";

export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
export type CourseChapterRow = Database["public"]["Tables"]["chapters"]["Row"];
export type CourseEnrollmentRow =
  Database["public"]["Tables"]["course_enrollments"]["Row"];

export interface CourseSummary {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  isPublished: boolean;
  isEnrolled: boolean;
  completionPercentage: number;
}

export interface CourseChapterSummary {
  id: number;
  title: string;
  description: string | null;
  chapterOrder: number;
  isPublished: boolean;
  lessonCount: number;
}

export interface CourseDetail {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  isPublished: boolean;
  chapterCount: number;
  lessonCount: number;
  isEnrolled: boolean;
  chapters: CourseChapterSummary[];
}

export interface CourseListResult {
  items: CourseSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface EnrollCourseResult {
  enrollmentId: number;
  courseId: number;
  enrolledAt: string;
  firstLessonId: number | null;
}

export interface EnrollCourseRpcRaw {
  enrollment_id: number;
  course_id: number;
  enrolled_at: string;
  first_lesson_id: number | null;
}

export type ProgressStatus =
  | "locked"
  | "unlocked"
  | "inProgress"
  | "completed";

export interface RoadmapLesson {
  id: number;
  title: string;
  order: number;
  status: ProgressStatus;
  estimatedMinutes: number | null;
}

export interface RoadmapChapter {
  id: number;
  title: string;
  order: number;
  lessons: RoadmapLesson[];
}

export interface RoadmapResponse {
  course: {
    id: number;
    title: string;
  };
  completionPercentage: number;
  chapters: RoadmapChapter[];
}
