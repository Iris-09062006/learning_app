import { NextResponse } from "next/server";

import { contentPipelineErrorResponse } from "@/app/api/admin/content-pipeline-route-utils";
import { ContentPipelineError, uploadContentSource, uploadStagedContentSource } from "@/features/content-pipeline/services/content-pipeline-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ContentPipelineError("VALIDATION_ERROR", "A source document file is required.");
    const idempotencyKey = form.get("idempotencyKey");
    return NextResponse.json(
      { success: true, data: idempotencyKey === null
        ? await uploadContentSource(file)
        : await uploadStagedContentSource(file, idempotencyKey) },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return contentPipelineErrorResponse(error);
  }
}
