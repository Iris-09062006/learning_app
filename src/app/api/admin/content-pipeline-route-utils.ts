import { NextResponse } from "next/server";

import { ContentPipelineError } from "@/features/content-pipeline/services/content-pipeline-service";

export function contentPipelineErrorResponse(error: unknown) {
  if (error instanceof ContentPipelineError) {
    const status = error.code === "UNAUTHENTICATED" ? 401
      : error.code === "FORBIDDEN" ? 403
        : error.code === "NOT_FOUND" ? 404
          : error.code === "INVALID_STATE" ? 409
            : error.code === "PAYLOAD_TOO_LARGE" ? 413
              : error.code === "UNSUPPORTED_MEDIA_TYPE" ? 415
                : error.code === "EXTRACTION_ERROR" ? 422
            : error.code.startsWith("SEARCH_PROVIDER_") ? 503
            : error.code === "RATE_LIMITED" ? 429
            : error.code === "VALIDATION_ERROR" ? 400
              : 500;
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (error.code === "RATE_LIMITED" && typeof error.details?.retryAfterSeconds === "number") {
      headers["Retry-After"] = String(Math.max(1, Math.ceil(error.details.retryAfterSeconds)));
    }
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, ...(error.details ?? {}) } },
      { status, headers }
    );
  }
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}

export async function readPipelineJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ContentPipelineError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}
