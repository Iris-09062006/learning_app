import { NextResponse } from "next/server";
import { submitExercise } from "@/features/exercises/services/exercise-service";
import { fetchLearnerSubmissions } from "@/features/exercises/repositories/exercise-repository";
import type { SubmitExerciseRequest } from "@/features/exercises/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const { exerciseId: rawExerciseId } = await params;
  const exerciseId = Number.parseInt(rawExerciseId, 10);

  if (Number.isNaN(exerciseId) || exerciseId <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid exercise ID",
        },
      },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as SubmitExerciseRequest;

    if (!body || typeof body !== "object" || !body.answer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request payload",
          },
        },
        { status: 400 }
      );
    }

    const result = await submitExercise(exerciseId, body);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Unauthorized",
          },
        },
        { status: 401 }
      );
    }

    if (message === "Exercise not found" || message === "Exercise is not published") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message,
          },
        },
        { status: 404 }
      );
    }

    if (message.startsWith("Invalid answer format") || message.startsWith("Unsupported exercise type")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message,
          },
        },
        { status: 400 }
      );
    }

    console.error("POST /api/exercises/:exerciseId/submissions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const { exerciseId: rawExerciseId } = await params;
  const exerciseId = Number.parseInt(rawExerciseId, 10);

  if (Number.isNaN(exerciseId) || exerciseId <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid exercise ID",
        },
      },
      { status: 400 }
    );
  }

  try {
    const submissions = await fetchLearnerSubmissions(exerciseId);
    return NextResponse.json({
      success: true,
      data: { submissions },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Unauthorized",
          },
        },
        { status: 401 }
      );
    }

    console.error("GET /api/exercises/:exerciseId/submissions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
