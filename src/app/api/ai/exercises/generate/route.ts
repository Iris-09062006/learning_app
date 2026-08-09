import { NextRequest, NextResponse } from "next/server";

import {
  AiServiceError,
  generateExercise,
} from "@/features/ai/services/ai-service";
import type {
  DbDifficultyLevel,
  DbExerciseType,
} from "@/features/ai/types";

const SUPPORTED_EXERCISE_TYPES: readonly DbExerciseType[] = [
  "fix_the_bug",
  "predict_output",
];

const SUPPORTED_DIFFICULTIES: readonly DbDifficultyLevel[] = [
  "easy",
  "medium",
  "hard",
];

const EXERCISE_TYPE_SET = new Set<string>(SUPPORTED_EXERCISE_TYPES);
const DIFFICULTY_SET = new Set<string>(SUPPORTED_DIFFICULTIES);

function mapAiServiceError(error: AiServiceError): number {
  switch (error.code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "AI_PROVIDER_ERROR":
      return 502;
    default:
      return 500;
  }
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { lessonId, exerciseType, difficulty, learningObjective, topicHint } =
    body;

  if (
    typeof lessonId !== "number" ||
    !Number.isInteger(lessonId) ||
    lessonId <= 0 ||
    typeof exerciseType !== "string" ||
    !EXERCISE_TYPE_SET.has(exerciseType) ||
    typeof difficulty !== "string" ||
    !DIFFICULTY_SET.has(difficulty) ||
    typeof learningObjective !== "string" ||
    !learningObjective.trim() ||
    (topicHint !== undefined &&
      (typeof topicHint !== "string" || !topicHint.trim()))
  ) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid generation input.",
      },
      { status: 400 }
    );
  }

  try {
    const { generatedExercise } = await generateExercise({
      lessonId,
      exerciseType: exerciseType as DbExerciseType,
      difficulty: difficulty as DbDifficultyLevel,
      learningObjective: learningObjective.trim(),
      topicHint:
        typeof topicHint === "string" ? topicHint.trim() : undefined,
    });

    return NextResponse.json(
      { generatedExercise },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AiServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: mapAiServiceError(error) }
      );
    }

    console.error("[AI exercise generation]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Unable to generate exercise." },
      { status: 500 }
    );
  }
}