import { NextResponse } from "next/server";
import { getCourseRecommendation, AiServiceError } from "@/features/ai/services/ai-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  const numericCourseId = Number.parseInt(courseId, 10);

  if (Number.isNaN(numericCourseId) || numericCourseId <= 0) {
    return NextResponse.json(
      { error: "Invalid course ID format" },
      { status: 400 }
    );
  }

  try {
    const recommendationResult = await getCourseRecommendation(numericCourseId);
    return NextResponse.json(recommendationResult);
  } catch (error: unknown) {
    if (error instanceof AiServiceError) {
      if (error.code === "UNAUTHENTICATED") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.code === "FORBIDDEN") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Failed to load course recommendation" },
      { status: 500 }
    );
  }
}