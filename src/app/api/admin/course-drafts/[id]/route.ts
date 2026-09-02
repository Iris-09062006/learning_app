import { NextResponse } from "next/server";

import { contentPipelineErrorResponse } from "@/app/api/admin/content-pipeline-route-utils";
import { removeCourseDraftFromQueue } from "@/features/content-pipeline/services/content-pipeline-service";

export const runtime = "nodejs";
interface RouteContext { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    return NextResponse.json(
      { success: true, data: await removeCourseDraftFromQueue((await context.params).id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
