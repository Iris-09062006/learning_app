import { NextResponse } from "next/server";

import { contentPipelineErrorResponse, readPipelineJson } from "@/app/api/admin/content-pipeline-route-utils";
import {
  generateCourseOutlineForJob,
  updateCourseOutline,
} from "@/features/content-pipeline/services/content-pipeline-service";

export const runtime = "nodejs";
export const maxDuration = 60;
interface RouteContext { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    return NextResponse.json(
      { success: true, data: await generateCourseOutlineForJob((await context.params).id) },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    return NextResponse.json(
      { success: true, data: await updateCourseOutline((await context.params).id, await readPipelineJson(request)) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
