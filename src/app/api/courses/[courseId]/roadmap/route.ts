import { NextResponse } from "next/server";

import {
  getCourseRoadmap,
  ServiceError,
} from "@/features/courses/services/course-service";

interface CourseRoadmapRouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(
  _request: Request,
  { params }: CourseRoadmapRouteContext
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
    const roadmap = await getCourseRoadmap(courseId);

    return NextResponse.json({
      success: true,
      data: roadmap,
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
        { status: error.statusCode }
      );
    }

    console.error("[GET /api/courses/:courseId/roadmap]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to fetch course roadmap.",
        },
      },
      { status: 500 }
    );
  }
}