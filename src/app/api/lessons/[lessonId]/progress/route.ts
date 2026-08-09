import { NextResponse } from "next/server";
import {
  getLessonProgress,
  ProgressError,
} from "@/features/progress/services/progress-service";

interface RouteContext {
  params: Promise<{ lessonId: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { lessonId: rawLessonId } = await params;
  const lessonId = Number(rawLessonId);

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
    const progress = await getLessonProgress(lessonId);

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error: unknown) {
    if (error instanceof ProgressError) {
      const statusCodeMap: Record<string, number> = {
        UNAUTHENTICATED: 401,
        NOT_ENROLLED: 403,
        NOT_PUBLISHED: 403,
        NOT_FOUND: 404,
      };

      const status = statusCodeMap[error.code] ?? 400;

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

    console.error("[GET /api/lessons/:lessonId/progress]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch lesson progress.",
        },
      },
      { status: 500 }
    );
  }
}