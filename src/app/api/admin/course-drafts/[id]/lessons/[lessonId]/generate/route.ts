import { NextResponse } from "next/server";

import { contentPipelineErrorResponse } from "@/app/api/admin/content-pipeline-route-utils";
import { generateCourseLessonContent } from "@/features/content-pipeline/services/content-pipeline-service";

export const runtime = "nodejs";
export const maxDuration = 300;
interface RouteContext { params: Promise<{ id: string; lessonId: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const data = await generateCourseLessonContent(params.id, params.lessonId);
    return NextResponse.json(
      { success: true, data },
      { status: data.outcome === "generated" ? 201 : 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
