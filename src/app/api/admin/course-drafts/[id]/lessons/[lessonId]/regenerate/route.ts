import { NextResponse } from "next/server";

import { contentPipelineErrorResponse } from "@/app/api/admin/content-pipeline-route-utils";
import { regenerateCourseLessonContent } from "@/features/content-pipeline/services/content-pipeline-service";

export const runtime = "nodejs";
export const maxDuration = 300;
interface RouteContext { params: Promise<{ id: string; lessonId: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    return NextResponse.json(
      { success: true, data: await regenerateCourseLessonContent(params.id, params.lessonId) },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
