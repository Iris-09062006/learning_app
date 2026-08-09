import { NextRequest, NextResponse } from "next/server";
import { getCourseById } from "@/features/courses/services/course-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse> {
  try {
    const { courseId: courseIdParam } = await params;
    const courseId = Number(courseIdParam);
    if (!Number.isFinite(courseId) || courseId < 1) {
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

    const course = await getCourseById(courseId);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Course not found or not published.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: course,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/courses/:courseId]", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to fetch course details.",
        },
      },
      { status: 500 }
    );
  }
}