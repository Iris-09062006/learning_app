import { NextRequest, NextResponse } from "next/server";
import {
  getPublishedCourses,
  ServiceError,
} from "@/features/courses/services/course-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const search = searchParams.get("search");

    const result = await getPublishedCourses({ page, pageSize, search });

    return NextResponse.json(
      {
        success: true,
        data: result.items,
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.statusCode }
      );
    }

    console.error("[GET /api/courses]", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to fetch courses.",
        },
      },
      { status: 500 }
    );
  }
}
