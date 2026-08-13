import { NextResponse } from "next/server";

import { contentPipelineErrorResponse, readPipelineJson } from "@/app/api/admin/content-pipeline-route-utils";
import { initializeCourseImport } from "@/features/content-pipeline/services/content-pipeline-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      { success: true, data: await initializeCourseImport(await readPipelineJson(request)) },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
