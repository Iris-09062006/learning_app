import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CourseProgressAccessResult,
  LessonProgressAccessResult,
} from "@/features/progress/types";
import type { ProgressStatus } from "@/features/courses/types";

function toProgressStatus(status: string | null | undefined): ProgressStatus {
  if (status === "unlocked") return "unlocked";
  if (status === "in_progress") return "inProgress";
  if (status === "completed") return "completed";
  return "locked";
}

export async function fetchUserCourseProgress(
  courseId: number
): Promise<CourseProgressAccessResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      courseExists: true,
      isPublished: true,
      isAuthenticated: false,
      isEnrolled: false,
      progress: null,
    };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, is_published")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    return {
      courseExists: false,
      isPublished: false,
      isAuthenticated: true,
      isEnrolled: false,
      progress: null,
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
      courseExists: true,
      isPublished: course.is_published,
      isAuthenticated: true,
      isEnrolled: false,
      progress: null,
    };
  }

  const { data: chaptersData, error: chaptersError } = await supabase
    .from("chapters")
    .select("id")
    .eq("course_id", courseId)
    .eq("is_published", true);

  if (chaptersError) {
    throw new Error(`Failed to fetch course chapters: ${chaptersError.message}`);
  }

  const chapterIds = (chaptersData || []).map((c) => c.id);

  let lessonsData: Array<{ id: number }> = [];

  if (chapterIds.length > 0) {
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id")
      .in("chapter_id", chapterIds)
      .eq("is_published", true);

    if (lessonsError) {
      throw new Error(`Failed to fetch course lessons: ${lessonsError.message}`);
    }
    lessonsData = lessons || [];
  }

  const lessonIds = lessonsData.map((l) => l.id);
  const progressMap = new Map<number, ProgressStatus>();

  if (lessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from("user_progress")
      .select("lesson_id, status")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds);

    (progressData || []).forEach((p) => {
      progressMap.set(p.lesson_id, toProgressStatus(p.status));
    });
  }

  const totalLessons = lessonIds.length;
  const completedLessons = lessonsData.filter(
    (l) => progressMap.get(l.id) === "completed"
  ).length;

  const completionPercentage =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

  let lastAccessedLessonId: number | null = null;

  if (lessonIds.length > 0) {
    const { data: lastAccessedData, error: lastAccessedError } = await supabase
      .from("user_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds)
      .not("last_accessed_at", "is", null)
      .order("last_accessed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAccessedError) {
      throw new Error(
        `Failed to fetch last accessed lesson: ${lastAccessedError.message}`
      );
    }

    lastAccessedLessonId = lastAccessedData?.lesson_id ?? null;
  }

  return {
    courseExists: true,
    isPublished: course.is_published,
    isAuthenticated: true,
    isEnrolled: true,
    progress: {
      courseId,
      completedLessons,
      totalLessons,
      completionPercentage,
      lastAccessedLessonId,
    },
  };
}

export async function fetchUserLessonProgress(
  lessonId: number
): Promise<LessonProgressAccessResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      lessonExists: true,
      isPublished: true,
      isAuthenticated: false,
      isEnrolled: false,
      progress: null,
    };
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, is_published, chapters(course_id)")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return {
      lessonExists: false,
      isPublished: false,
      isAuthenticated: true,
      isEnrolled: false,
      progress: null,
    };
  }

  const courseId = (
    lesson.chapters as unknown as { course_id: number }
  )?.course_id;

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
      progress: null,
    };
  }

  const { data: progress } = await supabase
    .from("user_progress")
    .select("status, started_at, completed_at, last_accessed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const status = toProgressStatus(progress?.status);

  return {
    lessonExists: true,
    isPublished: lesson.is_published,
    isAuthenticated: true,
    isEnrolled: true,
    progress: {
      lessonId,
      status,
      startedAt: progress?.started_at ?? null,
      completedAt: progress?.completed_at ?? null,
      lastAccessedAt: progress?.last_accessed_at ?? null,
    },
  };
}