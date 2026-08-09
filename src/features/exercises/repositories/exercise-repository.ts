import type { Database, Json } from "@/generated/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type {
  GetExerciseResponse,
  SubmissionSummary,
} from "@/features/exercises/types";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

export interface ExerciseSolutionData {
  solution: Json;
  explanation: string | null;
}

export interface ExerciseForSubmission {
  id: number;
  lessonId: number;
  type: ExerciseRow["exercise_type"];
  isRequired: boolean;
  isPublished: boolean;
  courseId: number;
}

export async function fetchExerciseData(exerciseId: number): Promise<{
  exerciseExists: boolean;
  isPublished: boolean;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  exercise: GetExerciseResponse | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: exercise, error: exerciseError } = await supabase
    .from("exercises")
    .select(
      "id, lesson_id, title, description, exercise_type, difficulty, exercise_order, code_snippet, is_required, is_published, lessons(chapters(course_id))",
    )
    .eq("id", exerciseId)
    .maybeSingle();

  if (exerciseError || !exercise) {
    return {
      exerciseExists: false,
      isPublished: false,
      isAuthenticated: false,
      isEnrolled: false,
      exercise: null,
    };
  }

  const courseId = (
    exercise.lessons as unknown as { chapters: { course_id: number } | null } | null
  )?.chapters?.course_id;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      exerciseExists: true,
      isPublished: exercise.is_published,
      isAuthenticated: false,
      isEnrolled: false,
      exercise: null,
    };
  }

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId ?? -1)
    .maybeSingle();

  if (!enrollment) {
    return {
      exerciseExists: true,
      isPublished: exercise.is_published,
      isAuthenticated: true,
      isEnrolled: false,
      exercise: null,
    };
  }

  const { data: optionRows, error: optionsError } = await supabase
    .from("exercise_options")
    .select("id, content, option_order")
    .eq("exercise_id", exerciseId)
    .order("option_order", { ascending: true });

  if (optionsError) {
    throw new Error(`Failed to fetch exercise options: ${optionsError.message}`);
  }

  return {
    exerciseExists: true,
    isPublished: exercise.is_published,
    isAuthenticated: true,
    isEnrolled: true,
    exercise: {
      id: exercise.id,
      lessonId: exercise.lesson_id,
      title: exercise.title,
      description: exercise.description,
      type: exercise.exercise_type,
      difficulty: exercise.difficulty,
      order: exercise.exercise_order,
      codeSnippet: exercise.code_snippet,
      isRequired: exercise.is_required,
      options: optionRows.map((option) => ({
        id: option.id,
        content: option.content,
        order: option.option_order,
      })),
    },
  };
}

export async function fetchExerciseForSubmission(
  exerciseId: number,
): Promise<ExerciseForSubmission | null> {
  const supabase = await createServerSupabaseClient();

  const { data: exercise, error } = await supabase
    .from("exercises")
    .select("id, lesson_id, exercise_type, is_required, is_published, lessons(chapters(course_id))")
    .eq("id", exerciseId)
    .maybeSingle();

  if (error || !exercise) {
    return null;
  }

  const courseId = (
    exercise.lessons as unknown as { chapters: { course_id: number } | null } | null
  )?.chapters?.course_id;

  if (!courseId) {
    return null;
  }

  return {
    id: exercise.id,
    lessonId: exercise.lesson_id,
    type: exercise.exercise_type,
    isRequired: exercise.is_required,
    isPublished: exercise.is_published,
    courseId,
  };
}

export async function fetchExerciseSolutionAdmin(
  exerciseId: number,
): Promise<ExerciseSolutionData | null> {
  const adminSupabase = createAdminSupabaseClient();

  const { data: solution, error } = await adminSupabase
    .from("exercise_solutions")
    .select("solution, static_explanation")
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (error || !solution) {
    return null;
  }

  return {
    solution: solution.solution,
    explanation: solution.static_explanation,
  };
}

export async function submitExerciseRpc(
  exerciseId: number,
  answer: Json,
): Promise<{
  submissionId: number;
  isCorrect: boolean;
  score: number;
  lessonCompleted: boolean;
  nextLessonUnlockedId: number | null;
  attemptNumber: number;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const { data, error } = await supabase.rpc("submit_exercise", {
    p_exercise_id: exerciseId,
    p_answer: answer,
  });

  if (error) {
    throw new Error(`Failed to submit exercise: ${error.message}`);
  }

  // Parse RPC response
  const rpcResult = data as {
    submission_id: number;
    is_correct: boolean;
    score: number;
    lesson_completed: boolean;
    next_lesson_unlocked_id: number | null;
  };

  // We need attemptNumber which RPC doesn't currently return, but we can query it quickly
  const { data: submission } = await supabase
    .from("submissions")
    .select("attempt_number")
    .eq("id", rpcResult.submission_id)
    .single();

  return {
    submissionId: rpcResult.submission_id,
    isCorrect: rpcResult.is_correct,
    score: rpcResult.score,
    lessonCompleted: rpcResult.lesson_completed,
    nextLessonUnlockedId: rpcResult.next_lesson_unlocked_id,
    attemptNumber: submission?.attempt_number ?? 1,
  };
}

export async function fetchLearnerSubmissions(
  exerciseId: number,
): Promise<SubmissionSummary[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("id, is_correct, submitted_at")
    .eq("exercise_id", exerciseId)
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return submissions.map((submission) => ({
    id: submission.id,
    isCorrect: submission.is_correct,
    submittedAt: submission.submitted_at,
  }));
}

