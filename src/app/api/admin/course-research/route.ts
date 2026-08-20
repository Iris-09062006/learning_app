import { NextResponse } from "next/server";

import { researchCourseSources } from "@/features/content-pipeline/services/content-pipeline-service";
import { contentPipelineErrorResponse, readPipelineJson } from "../content-pipeline-route-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      { success: true, data: await researchCourseSources(await readPipelineJson(request)) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
