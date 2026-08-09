import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProgressStatus } from "@/features/courses/types";
import type { LessonDetail, StartLessonResponse } from "@/features/lessons/types";

function toProgressStatus(status: string | null | undefined): ProgressStatus {
  if (status === "unlocked") return "unlocked";
  if (status === "in_progress") return "inProgress";
  if (status === "completed") return "completed";
  return "locked";
}

export async function fetchLessonDetail(lessonId: number): Promise<{
  lessonExists: boolean;
  isPublished: boolean;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  lesson: LessonDetail | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, chapter_id, title, content, lesson_order, estimated_minutes, is_published, chapters(course_id)")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return {
      lessonExists: false,
      isPublished: false,
      isAuthenticated: false,
      isEnrolled: false,
      lesson: null,
    };
  }

  const courseId = (lesson.chapters as unknown as { course_id: number })?.course_id;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      lessonExists: true,
      isPublished: lesson.is_published,
      isAuthenticated: false,
      isEnrolled: false,
      lesson: null,
    };
  }

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!enrollment) {
    return {
      lessonExists: true,
      isPublished: lesson.is_published,
      isAuthenticated: true,
      isEnrolled: false,
      lesson: null,
    };
  }

  const { data: progress } = await supabase
    .from("user_progress")
    .select("status")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const status = toProgressStatus(progress?.status);

  const { data: exercisesData, error: exercisesError } = await supabase
    .from("exercises")
    .select("id, title, exercise_type, difficulty, exercise_order, is_published")
    .eq("lesson_id", lessonId)
    .eq("is_published", true)
    .order("exercise_order", { ascending: true });

  if (exercisesError) {
    throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
  }

  const exercises = (exercisesData || []).map((e) => ({
    id: e.id,
    title: e.title,
    type: e.exercise_type,
    difficulty: e.difficulty,
    order: e.exercise_order,
    isPublished: e.is_published,
  }));

  return {
    lessonExists: true,
    isPublished: lesson.is_published,
    isAuthenticated: true,
    isEnrolled: true,
    lesson: {
      id: lesson.id,
      chapterId: lesson.chapter_id,
      courseId,
      title: lesson.title,
      content: lesson.content,
      order: lesson.lesson_order,
      estimatedMinutes: lesson.estimated_minutes,
      status,
      isPublished: lesson.is_published,
      exercises,
    },
  };
}

export async function startLessonProgress(lessonId: number): Promise<StartLessonResponse> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const { data: currentProgress } = await supabase
    .from("user_progress")
    .select("status, started_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const currentStatus = toProgressStatus(currentProgress?.status);

  if (currentStatus === "locked") {
    throw new Error("LESSON_LOCKED");
  }

  if (currentStatus === "inProgress" || currentStatus === "completed") {
    return {
      lessonId,
      status: currentStatus,
      startedAt: currentProgress?.started_at ?? null,
    };
  }

  const now = new Date().toISOString();

  const { data: updatedProgress, error } = await supabase
    .from("user_progress")
    .upsert({
      user_id: user.id,
      lesson_id: lessonId,
      status: "in_progress",
      started_at: now,
      updated_at: now,
    }, { onConflict: "user_id,lesson_id" })
    .select("status, started_at")
    .single();

  if (error) {
    throw new Error(`Failed to update lesson progress: ${error.message}`);
  }

  return {
    lessonId,
    status: toProgressStatus(updatedProgress.status),
    startedAt: updatedProgress.started_at,
  };
}