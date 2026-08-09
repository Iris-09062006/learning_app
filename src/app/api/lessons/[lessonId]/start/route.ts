import { NextResponse } from "next/server";

import {
  ServiceError,
  startLesson,
} from "@/features/lessons/services/lesson-service";

interface StartLessonRouteContext {
  params: Promise<{ lessonId: string }>;
}

export async function POST(
  _request: Request,
  { params }: StartLessonRouteContext,
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
      { status: 400 },
    );
  }

  try {
    const lesson = await startLesson(lessonId);

    return NextResponse.json({
      success: true,
      data: lesson,
    });
  } catch (error: unknown) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode },
      );
    }

    console.error("[POST /api/lessons/:lessonId/start]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to start lesson.",
        },
      },
      { status: 500 },
    );
  }
}