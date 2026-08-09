import { NextResponse } from "next/server";
import {
  getLessonById,
  ServiceError,
} from "@/features/lessons/services/lesson-service";

interface LessonRouteContext {
  params: Promise<{ lessonId: string }>;
}

export async function GET(
  _request: Request,
  { params }: LessonRouteContext
): Promise<NextResponse> {
  const { lessonId: lessonIdParam } = await params;
  const lessonId = Number(lessonIdParam);

  if (!Number.isInteger(lessonId) || lessonId < 1) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid lesson ID.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const lesson = await getLessonById(lessonId);
    return NextResponse.json({
      success: true,
      data: lesson,
    });
  } catch (error: unknown) {
    if (error instanceof ServiceError) {
      const status = error.statusCode ?? 400;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status }
      );
    }

    console.error("[GET /api/lessons/:lessonId] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      },
      { status: 500 }
    );
  }
}