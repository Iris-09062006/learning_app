import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DashboardCourse,
  ProfileRepositorySnapshot,
  UpdateProfileResponse,
} from "@/features/profile/types";

export class ProfileRepositoryError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "NOT_FOUND" | "DATABASE_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "ProfileRepositoryError";
  }
}

export async function fetchOwnProfileSnapshot(): Promise<ProfileRepositorySnapshot> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new ProfileRepositoryError("UNAUTHENTICATED", "Authentication required.");
  }

  const userId = authData.user.id;
  const [profileResult, enrollmentResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, role, is_active, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("course_enrollments")
      .select("course_id, status, enrolled_at")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false }),
  ]);
  const { data: profile, error: profileError } = profileResult;

  if (profileError) {
    throw new ProfileRepositoryError("DATABASE_ERROR", "Unable to load profile.");
  }
  if (!profile) {
    throw new ProfileRepositoryError("NOT_FOUND", "Profile not found.");
  }

  const { data: enrollments, error: enrollmentError } = enrollmentResult;

  if (enrollmentError) {
    throw new ProfileRepositoryError("DATABASE_ERROR", "Unable to load enrollments.");
  }

  const courseIds = (enrollments ?? []).map((enrollment) => enrollment.course_id);
  if (courseIds.length === 0) {
    return {
      id: profile.id,
      email: authData.user.email ?? "",
      username: profile.username,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      courses: [],
    };
  }

  const [coursesResult, chaptersResult] = await Promise.all([
    supabase.from("courses").select("id, title, description").in("id", courseIds),
    supabase
      .from("chapters")
      .select("id, course_id")
      .in("course_id", courseIds)
      .eq("is_published", true),
  ]);
  const { data: courses, error: coursesError } = coursesResult;
  const { data: chapters, error: chaptersError } = chaptersResult;

  if (coursesError || chaptersError) {
    throw new ProfileRepositoryError("DATABASE_ERROR", "Unable to load course data.");
  }

  const chapterIds = (chapters ?? []).map((chapter) => chapter.id);
  const lessonsResult = chapterIds.length
    ? await supabase
        .from("lessons")
        .select("id, chapter_id")
        .in("chapter_id", chapterIds)
        .eq("is_published", true)
    : { data: [], error: null };

  if (lessonsResult.error) {
    throw new ProfileRepositoryError("DATABASE_ERROR", "Unable to load lessons.");
  }

  const lessons = lessonsResult.data ?? [];
  const lessonIds = lessons.map((lesson) => lesson.id);
  const progressResult = lessonIds.length
    ? await supabase
        .from("user_progress")
        .select("lesson_id, status, last_accessed_at")
        .eq("user_id", userId)
        .in("lesson_id", lessonIds)
    : { data: [], error: null };

  if (progressResult.error) {
    throw new ProfileRepositoryError("DATABASE_ERROR", "Unable to load progress.");
  }

  const chapterCourse = new Map((chapters ?? []).map((chapter) => [chapter.id, chapter.course_id]));
  const lessonCourse = new Map(
    lessons.map((lesson) => [lesson.id, chapterCourse.get(lesson.chapter_id)]),
  );
  const progressByLesson = new Map(
    (progressResult.data ?? []).map((progress) => [progress.lesson_id, progress]),
  );
  const courseById = new Map((courses ?? []).map((course) => [course.id, course]));

  const dashboardCourses: DashboardCourse[] = (enrollments ?? []).flatMap((enrollment) => {
    const course = courseById.get(enrollment.course_id);
    if (!course) return [];

    const courseLessonIds = lessons
      .filter((lesson) => lessonCourse.get(lesson.id) === course.id)
      .map((lesson) => lesson.id);
    const completedLessons = courseLessonIds.filter(
      (lessonId) => progressByLesson.get(lessonId)?.status === "completed",
    ).length;
    const latestProgress = courseLessonIds
      .map((lessonId) => progressByLesson.get(lessonId))
      .filter((progress) => progress?.last_accessed_at)
      .sort((left, right) =>
        (right?.last_accessed_at ?? "").localeCompare(left?.last_accessed_at ?? ""),
      )[0];
    const nextAvailableLessonId = courseLessonIds.find((lessonId) => {
      const status = progressByLesson.get(lessonId)?.status;
      return status === "in_progress" || status === "unlocked";
    });
    const resumeLessonId = latestProgress?.lesson_id ?? nextAvailableLessonId ?? null;
    const totalLessons = courseLessonIds.length;

    return [{
      id: course.id,
      title: course.title,
      description: course.description,
      status: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
      completedLessons,
      totalLessons,
      completionPercentage:
        totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
      resumeLessonId,
      resumeUrl: resumeLessonId ? `/lessons/${resumeLessonId}` : `/courses/${course.id}/roadmap`,
    }];
  });

  return {
    id: profile.id,
    email: authData.user.email ?? "",
    username: profile.username,
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    courses: dashboardCourses,
  };
}

export async function updateOwnUsername(username: string): Promise<UpdateProfileResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new ProfileRepositoryError("UNAUTHENTICATED", "Authentication required.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", authData.user.id)
    .eq("is_active", true)
    .select("id, username, updated_at")
    .maybeSingle();

  if (error) {
    throw new ProfileRepositoryError("DATABASE_ERROR", "Unable to update profile.");
  }
  if (!data) {
    throw new ProfileRepositoryError("NOT_FOUND", "Profile not found.");
  }

  return { id: data.id, username: data.username, updatedAt: data.updated_at };
}
