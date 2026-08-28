import { NextRequest, NextResponse } from "next/server";

import {
  AiServiceError,
  generateExercise,
} from "@/features/ai/services/ai-service";
import type {
  DbDifficultyLevel,
} from "@/features/ai/types";

const SUPPORTED_DIFFICULTIES: readonly DbDifficultyLevel[] = [
  "easy",
  "medium",
  "hard",
];

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
    case "RATE_LIMITED":
      return 429;
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

  const { lessonId, difficulty, learningObjective, topicHint } =
    body;

  if (
    typeof lessonId !== "number" ||
    !Number.isInteger(lessonId) ||
    lessonId <= 0 ||
    typeof difficulty !== "string" ||
    !DIFFICULTY_SET.has(difficulty) ||
    typeof learningObjective !== "string" ||
    !learningObjective.trim() ||
    learningObjective.trim().length > 500 ||
    (topicHint !== undefined &&
      (typeof topicHint !== "string" || !topicHint.trim() || topicHint.trim().length > 500))
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
      const status = mapAiServiceError(error);
      const retryAfter = status === 429 ? error.message.match(/(\d+) seconds/)?.[1] : undefined;
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status, headers: retryAfter ? { "Retry-After": retryAfter } : undefined }
      );
    }

    console.error("[AI exercise generation]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Unable to generate exercise." },
      { status: 500 }
    );
  }
}
