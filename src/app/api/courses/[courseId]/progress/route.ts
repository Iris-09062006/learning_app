import { NextResponse } from "next/server";
import {
  getCourseProgress,
  ProgressError,
} from "@/features/progress/services/progress-service";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { courseId: rawCourseId } = await params;
  const courseId = Number(rawCourseId);

  if (!Number.isInteger(courseId) || courseId < 1) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid course ID.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const progress = await getCourseProgress(courseId);

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

    console.error("[GET /api/courses/:courseId/progress]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch course progress.",
        },
      },
      { status: 500 }
    );
  }
}