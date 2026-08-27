import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  AiExplanationRecord,
  SubmissionDetailsForAi,
  GeneratedExerciseRecord,
  GeneratedExerciseContent,
  DbExerciseType,
  DbDifficultyLevel,
  ExerciseGenerationContext,
  ExerciseLessonTarget,
} from "@/features/ai/types";
import type { Database } from "@/generated/database.types";

type AiExplanationInsert = Database["public"]["Tables"]["ai_explanations"]["Insert"];
type AiExplanationRow = Database["public"]["Tables"]["ai_explanations"]["Row"];

function mapAiExplanationRow(row: AiExplanationRow): AiExplanationRecord {
  return {
    id: row.id,
    submissionId: row.submission_id,
    userQuestion: row.user_question,
    response: row.response,
    provider: row.provider,
    model: row.model,
    status: row.status,
    errorCode: row.error_code,
    createdAt: row.created_at,
  };
}

export async function fetchSubmissionDetailsForAi(
  submissionId: number
): Promise<SubmissionDetailsForAi | null> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("UNAUTHENTICATED");
  }

  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .select("id, user_id, exercise_id, answer, is_correct")
    .eq("id", submissionId)
    .single();

  if (subError || !submission) {
    return null;
  }

  if (submission.user_id !== authData.user.id) {
    throw new Error("FORBIDDEN");
  }

  const { data: exercise } = await supabase
    .from("exercises")
    .select("title, description")
    .eq("id", submission.exercise_id)
    .single();

  const adminClient = createAdminSupabaseClient();
  const { data: solution } = await adminClient
    .from("exercise_solutions")
    .select("static_explanation")
    .eq("exercise_id", submission.exercise_id)
    .maybeSingle();

  return {
    id: submission.id,
    userId: submission.user_id,
    exerciseId: submission.exercise_id,
    answer: submission.answer,
    isCorrect: submission.is_correct,
    exerciseTitle: exercise?.title ?? "Bài tập",
    exercisePrompt: exercise?.description ?? "",
    staticExplanation: solution?.static_explanation ?? null,
  };
}

export async function fetchAiExplanationBySubmissionId(
  submissionId: number
): Promise<AiExplanationRecord | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ai_explanations")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapAiExplanationRow(data);
}

export interface RecommendationContextData {
  courseExists: boolean;
  isPublished: boolean;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  courseTitle?: string;
  orderedLessons?: Array<{
    id: number;
    title: string;
    orderIndex: number;
    isCompleted: boolean;
    exercises: Array<{
      id: number;
      title: string;
      orderIndex: number;
      latestSubmission?: {
        isCorrect: boolean;
        consecutiveIncorrect: number;
      };
    }>;
  }>;
}

export async function fetchCourseRecommendationData(
  courseId: number
): Promise<RecommendationContextData> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return {
      courseExists: false,
      isPublished: false,
      isAuthenticated: false,
      isEnrolled: false,
    };
  }

  const userId = authData.user.id;

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, is_published")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    return {
      courseExists: false,
      isPublished: false,
      isAuthenticated: true,
      isEnrolled: false,
    };
  }

  if (!course.is_published) {
    return {
      courseExists: true,
      isPublished: false,
      isAuthenticated: true,
      isEnrolled: false,
    };
  }

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!enrollment) {
    return {
      courseExists: true,
      isPublished: true,
      isAuthenticated: true,
      isEnrolled: false,
      courseTitle: course.title,
    };
  }

  // Fetch chapters and lessons in order
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, chapter_order")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("chapter_order", { ascending: true });

  const chapterIds = (chapters || []).map((c) => c.id);

  let lessons: Array<{ id: number; title: string; lesson_order: number; chapter_id: number }> = [];
  if (chapterIds.length > 0) {
    const { data: lessonRows } = await supabase
      .from("lessons")
      .select("id, title, lesson_order, chapter_id")
      .in("chapter_id", chapterIds)
      .eq("is_published", true)
      .order("lesson_order", { ascending: true });
    lessons = lessonRows || [];
  }

  // Sort lessons according to chapter order then lesson order
  const chapterOrderMap = new Map((chapters || []).map((c) => [c.id, c.chapter_order]));
  lessons.sort((a, b) => {
    const cA = chapterOrderMap.get(a.chapter_id) ?? 0;
    const cB = chapterOrderMap.get(b.chapter_id) ?? 0;
    if (cA !== cB) return cA - cB;
    return a.lesson_order - b.lesson_order;
  });

  const lessonIds = lessons.map((l) => l.id);

  // Fetch user lesson progress
  const completedLessonIds = new Set<number>();
  if (lessonIds.length > 0) {
    const { data: progressRows } = await supabase
      .from("user_progress")
      .select("lesson_id, status")
      .eq("user_id", userId)
      .in("lesson_id", lessonIds);

    (progressRows || []).forEach((p) => {
      if (p.status === "completed") {
        completedLessonIds.add(p.lesson_id);
      }
    });
  }

  // Fetch exercises for lessons
  let exercises: Array<{ id: number; title: string; exercise_order: number; lesson_id: number }> = [];
  if (lessonIds.length > 0) {
    const { data: exerciseRows } = await supabase
      .from("exercises")
      .select("id, title, exercise_order, lesson_id")
      .in("lesson_id", lessonIds)
      .eq("is_published", true)
      .order("exercise_order", { ascending: true });
    exercises = exerciseRows || [];
  }

  const exerciseIds = exercises.map((e) => e.id);

  // Fetch user latest submissions for these exercises
  const latestSubmissionsMap = new Map<
    number,
    { isCorrect: boolean; consecutiveIncorrect: number; stopCounting: boolean }
  >();
  if (exerciseIds.length > 0) {
    const { data: submissionRows } = await supabase
      .from("submissions")
      .select("exercise_id, is_correct, submitted_at")
      .eq("user_id", userId)
      .in("exercise_id", exerciseIds)
      .order("submitted_at", { ascending: false });

    (submissionRows || []).forEach((sub) => {
      let stats = latestSubmissionsMap.get(sub.exercise_id);
      if (!stats) {
        stats = {
          isCorrect: sub.is_correct,
          consecutiveIncorrect: sub.is_correct ? 0 : 1,
          stopCounting: sub.is_correct,
        };
        latestSubmissionsMap.set(sub.exercise_id, stats);
      } else if (!stats.stopCounting) {
        if (sub.is_correct) {
          stats.stopCounting = true;
        } else {
          stats.consecutiveIncorrect += 1;
        }
      }
    });
  }

  // Group exercises by lesson
  const exercisesByLesson = new Map<number, typeof exercises>();
  exercises.forEach((ex) => {
    const existing = exercisesByLesson.get(ex.lesson_id) || [];
    existing.push(ex);
    exercisesByLesson.set(ex.lesson_id, existing);
  });

  const orderedLessons = lessons.map((l) => {
    const lessonExercises = (exercisesByLesson.get(l.id) || []).map((ex) => {
      const stats = latestSubmissionsMap.get(ex.id);
      return {
        id: ex.id,
        title: ex.title,
        orderIndex: ex.exercise_order,
        latestSubmission: stats
          ? { isCorrect: stats.isCorrect, consecutiveIncorrect: stats.consecutiveIncorrect }
          : undefined,
      };
    });

    return {
      id: l.id,
      title: l.title,
      orderIndex: l.lesson_order,
      isCompleted: completedLessonIds.has(l.id),
      exercises: lessonExercises,
    };
  });

  return {
    courseExists: true,
    isPublished: true,
    isAuthenticated: true,
    isEnrolled: true,
    courseTitle: course.title,
    orderedLessons,
  };
}

export async function fetchAiExplanationHistory(
  submissionId: number
): Promise<AiExplanationRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("UNAUTHENTICATED");
  }

  // Check submission ownership first
  const { data: submission } = await supabase
    .from("submissions")
    .select("user_id")
    .eq("id", submissionId)
    .single();

  if (!submission || submission.user_id !== authData.user.id) {
    throw new Error("FORBIDDEN");
  }

  const { data, error } = await supabase
    .from("ai_explanations")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("DATABASE_ERROR");
  }

  return (data || []).map(mapAiExplanationRow);
}

export async function createAiExplanationRecord(
  payload: AiExplanationInsert
): Promise<AiExplanationRecord> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ai_explanations")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create AI explanation record: ${error?.message || "Unknown error"}`);
  }

  return mapAiExplanationRow(data);
}

export interface CreateGeneratedExercisePayload {
  lesson_id: number;
  exercise_type: DbExerciseType;
  difficulty: DbDifficultyLevel;
  content: GeneratedExerciseContent;
  provider: string;
  model: string | null;
}

export async function createGeneratedExerciseRecord(
  payload: CreateGeneratedExercisePayload
): Promise<GeneratedExerciseRecord> {
  const supabase = await createServerSupabaseClient();
  const rpcFunction = "create_generated_exercise_draft";
  console.info("[exercise-generation-diagnostic]", {
    stage: "exercise_generation",
    event: "exercise_persistence_started",
    rpcFunction,
  });
  const { data, error } = await supabase
    .rpc(rpcFunction, {
      p_lesson_id: payload.lesson_id,
      p_exercise_type: payload.exercise_type,
      p_difficulty: payload.difficulty,
      p_content: payload.content as unknown as Database["public"]["Functions"]["create_generated_exercise_draft"]["Args"]["p_content"],
      p_provider: payload.provider,
      p_model: payload.model,
    });

  if (error || !data) {
    console.error("[exercise-generation-diagnostic]", {
      stage: "exercise_generation",
      event: "exercise_persistence_failure",
      rpcFunction,
      code: error?.code ?? null,
      message: error?.message ?? null,
      details: error?.details ?? null,
      hint: error?.hint ?? null,
    });
    throw new Error("DATABASE_ERROR");
  }

  console.info("[exercise-generation-diagnostic]", {
    stage: "exercise_generation",
    event: "exercise_persistence_success",
    rpcFunction,
  });

  return data as unknown as GeneratedExerciseRecord;
}

export async function fetchLessonContextForGeneration(lessonId: number): Promise<ExerciseGenerationContext> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("get_lesson_exercise_generation_context", { p_lesson_id: lessonId });

  if (error || !data) {
    throw new Error("NOT_FOUND");
  }
  return data as unknown as ExerciseGenerationContext;
}

export async function listPublishedExerciseLessonTargets(): Promise<ExerciseLessonTarget[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, chapters!inner(course_id, is_published, courses!inner(id, title, is_published, archived_at))")
    .eq("is_published", true)
    .eq("chapters.is_published", true)
    .eq("chapters.courses.is_published", true)
    .is("chapters.courses.archived_at", null)
    .order("id");
  if (error) throw new Error("DATABASE_ERROR");
  return ((data ?? []) as unknown as Array<{
    id: number; title: string; chapters: { courses: { id: number; title: string } };
  }>).map((lesson) => ({
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseId: lesson.chapters.courses.id,
    courseTitle: lesson.chapters.courses.title,
  }));
}
