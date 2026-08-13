import { NextResponse } from "next/server";

import { contentPipelineErrorResponse, readPipelineJson } from "@/app/api/admin/content-pipeline-route-utils";
import { attachSourceToCourseImport, getCourseImportSourceReview } from "@/features/content-pipeline/services/content-pipeline-service";

export const runtime = "nodejs";
interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    return NextResponse.json(
      { success: true, data: await getCourseImportSourceReview((await context.params).id) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    return NextResponse.json(
      { success: true, data: await attachSourceToCourseImport((await context.params).id, await readPipelineJson(request)) },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
