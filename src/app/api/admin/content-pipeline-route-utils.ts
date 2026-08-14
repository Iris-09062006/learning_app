import { NextResponse } from "next/server";

import { ContentPipelineError } from "@/features/content-pipeline/services/content-pipeline-service";

export function contentPipelineErrorResponse(error: unknown) {
  if (error instanceof ContentPipelineError) {
    const status = error.code === "UNAUTHENTICATED" ? 401
      : error.code === "FORBIDDEN" ? 403
        : error.code === "NOT_FOUND" ? 404
          : ["INVALID_STATE", "SOURCE_LIMIT_EXCEEDED", "SOURCE_CONFLICT", "SOURCE_MUTATION_LOCKED", "STALE_OUTLINE"].includes(error.code) ? 409
            : error.code === "PAYLOAD_TOO_LARGE" ? 413
              : error.code === "UNSUPPORTED_MEDIA_TYPE" ? 415
                : ["INVALID_SOURCE", "FETCH_FAILED", "EXTRACTION_ERROR", "EXTRACTION_FAILED"].includes(error.code) ? 422
                  : error.code === "INVALID_SOURCE_REFERENCE" ? 400
            : error.code.startsWith("SEARCH_PROVIDER_") ? 503
            : error.code === "WEB_EXTRACTION_UNAVAILABLE" ? 503
            : error.code === "RATE_LIMITED" ? 429
            : error.code === "VALIDATION_ERROR" ? 400
              : 500;
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (error.code === "RATE_LIMITED" && typeof error.details?.retryAfterSeconds === "number") {
      headers["Retry-After"] = String(Math.max(1, Math.ceil(error.details.retryAfterSeconds)));
    }
    const safeDetails = error.details ? {
      ...(typeof error.details.retryAfterSeconds === "number" ? { retryAfterSeconds: error.details.retryAfterSeconds } : {}),
      ...(typeof error.details.sourceDocumentId === "number" ? { sourceDocumentId: error.details.sourceDocumentId } : {}),
    } : {};
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, ...safeDetails } },
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
