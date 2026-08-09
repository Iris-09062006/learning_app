import { NextResponse } from "next/server";
import { fetchExerciseData } from "@/features/exercises/repositories/exercise-repository";

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
    const result = await fetchExerciseData(exerciseId);

    if (!result.isAuthenticated) {
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

    if (!result.exerciseExists || !result.isPublished) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Exercise not found or not published",
          },
        },
        { status: 404 }
      );
    }

    if (!result.isEnrolled) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COURSE_NOT_ENROLLED",
            message: "Forbidden: Not enrolled in course",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.exercise,
    });
  } catch (error) {
    console.error("GET /api/exercises/:exerciseId error:", error);
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