import { NextResponse } from "next/server";

import { contentPipelineErrorResponse } from "@/app/api/admin/content-pipeline-route-utils";
import { detachSourceFromCourseImport } from "@/features/content-pipeline/services/content-pipeline-service";

export const runtime = "nodejs";
interface RouteContext { params: Promise<{ id: string; sourceDocumentId: string }> }

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    return NextResponse.json(
      { success: true, data: await detachSourceFromCourseImport(params.id, params.sourceDocumentId) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
