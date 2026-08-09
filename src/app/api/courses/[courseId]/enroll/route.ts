import { NextResponse } from "next/server";

import {
  enrollInCourse,
  ServiceError,
} from "@/features/courses/services/course-service";

interface EnrollCourseRouteContext {
  params: Promise<{ courseId: string }>;
}

export async function POST(
  _request: Request,
  { params }: EnrollCourseRouteContext
): Promise<NextResponse> {
  const { courseId: courseIdParam } = await params;
  const courseId = Number(courseIdParam);

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
    const enrollment = await enrollInCourse(courseId);

    return NextResponse.json(
      {
        success: true,
        data: enrollment,
      },
      { status: 201 }
    );
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
        { status: error.statusCode }
      );
    }

    console.error("[POST /api/courses/:courseId/enroll]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to enroll in course.",
        },
      },
      { status: 500 }
    );
  }
}