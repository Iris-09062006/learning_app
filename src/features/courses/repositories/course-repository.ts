import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CourseSummary,
  CourseDetail,
  CourseChapterSummary,
  EnrollCourseResult,
  EnrollCourseRpcRaw,
  RoadmapResponse,
  ProgressStatus,
} from "@/features/courses/types";

export async function fetchCourseSummaries(
  page: number,
  pageSize: number,
  search?: string
): Promise<{
  items: CourseSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("courses")
    .select(
      "id,slug,title,description,level,language,is_published",
      { count: "exact" }
    )
    .eq("is_published", true);

  if (search) {
    const pattern = escapePostgrestIlikePattern(search);
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data, count, error } = await query
    .range(from, from + pageSize - 1)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  const items: CourseSummary[] = (data || []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description ?? null,
    level: c.level,
    language: c.language,
    isPublished: c.is_published,
    isEnrolled: false, // Will be computed in real implementation
    completionPercentage: 0, // Will be computed in real implementation
  }));

  const total = count ?? 0;
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function escapePostgrestIlikePattern(search: string): string {
  const escaped = search
    .replace(/\\/gu, "\\\\")
    .replace(/%/gu, "\\%")
    .replace(/_/gu, "\\_")
    .replace(/"/gu, '\\"');

  return `"%${escaped}%"`;
}

export async function fetchCourseDetail(
  courseId: number
): Promise<CourseDetail | null> {
  const supabase = await createServerSupabaseClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select("id,slug,title,description,level,language,is_published")
    .eq("id", courseId)
    .single();

  if (error || !course) {
    if (error?.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch course: ${error?.message || "Not found"}`);
  }

  // Fetch chapters separately due to schema limitations
  const { data: chaptersData, error: chaptersError } = await supabase
    .from("chapters")
    .select("id,title,description,chapter_order,is_published, lessons(count)")
    .eq("course_id", courseId)
    .order("chapter_order", { ascending: true });

  if (chaptersError) {
    throw new Error(`Failed to fetch chapters: ${chaptersError.message}`);
  }

  let isEnrolled = false;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: enrollment } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (enrollment) {
      isEnrolled = true;
    }
  }

  const chapters: CourseChapterSummary[] = (chaptersData || []).map((ch) => ({
    id: ch.id,
    title: ch.title,
    description: ch.description ?? null,
    chapterOrder: ch.chapter_order,
    isPublished: ch.is_published,
    lessonCount: ch.lessons?.[0]?.count ?? 0,
  }));

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description ?? null,
    level: course.level,
    language: course.language,
    isPublished: course.is_published,
    chapterCount: chapters.length,
    lessonCount: chapters.reduce((sum, ch) => sum + ch.lessonCount, 0),
    isEnrolled,
    chapters,
  };
}

export async function enrollUserInCourse(
  courseId: number
): Promise<EnrollCourseResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("enroll_course", {
    p_course_id: courseId,
  });

  if (error) {
    throw error;
  }

  const raw = data as unknown as EnrollCourseRpcRaw;
  return {
    enrollmentId: raw.enrollment_id,
    courseId: raw.course_id,
    enrolledAt: raw.enrolled_at,
    firstLessonId: raw.first_lesson_id ?? null,
  };
}

function toProgressStatus(status: string): ProgressStatus {
  if (status === "unlocked") return "unlocked";
  if (status === "in_progress") return "inProgress";
  if (status === "completed") return "completed";
  return "locked";
}

export async function fetchCourseRoadmap(courseId: number): Promise<{
  courseExists: boolean;
  isPublished: boolean;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  roadmap: RoadmapResponse | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, is_published")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    return {
      courseExists: false,
      isPublished: false,
      isAuthenticated: false,
      isEnrolled: false,
      roadmap: null,
    };
  }

  if (!course.is_published) {
    return {
      courseExists: true,
      isPublished: false,
      isAuthenticated: false,
      isEnrolled: false,
      roadmap: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      courseExists: true,
      isPublished: true,
      isAuthenticated: false,
      isEnrolled: false,
      roadmap: null,
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
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: false,
      roadmap: null,
    };
  }

  const { data: chaptersData, error: chaptersError } = await supabase
    .from("chapters")
    .select("id, title, chapter_order, is_published")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("chapter_order", { ascending: true });

  if (chaptersError) {
    throw new Error(`Failed to fetch roadmap chapters: ${chaptersError.message}`);
  }

  const chapterIds = (chaptersData || []).map((c) => c.id);

  let lessonsData: Array<{
    id: number;
    chapter_id: number;
    title: string;
    lesson_order: number;
    estimated_minutes: number | null;
  }> = [];

  if (chapterIds.length > 0) {
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, chapter_id, title, lesson_order, estimated_minutes, is_published")
      .in("chapter_id", chapterIds)
      .eq("is_published", true)
      .order("lesson_order", { ascending: true });

    if (lessonsError) {
      throw new Error(`Failed to fetch roadmap lessons: ${lessonsError.message}`);
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

  let totalLessons = 0;
  let completedLessons = 0;

  const chapters = (chaptersData || []).map((ch) => {
    const chapterLessons = lessonsData
      .filter((l) => l.chapter_id === ch.id)
      .map((l) => {
        totalLessons += 1;
        const status = progressMap.get(l.id) || "locked";
        if (status === "completed") {
          completedLessons += 1;
        }
        return {
          id: l.id,
          title: l.title,
          order: l.lesson_order,
          status,
          estimatedMinutes: l.estimated_minutes ?? null,
        };
      });

    return {
      id: ch.id,
      title: ch.title,
      order: ch.chapter_order,
      lessons: chapterLessons,
    };
  });

  const completionPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    courseExists: true,
    isPublished: true,
    isAuthenticated: true,
    isEnrolled: true,
    roadmap: {
      course: {
        id: course.id,
        title: course.title,
      },
      completionPercentage,
      chapters,
    },
  };
}
