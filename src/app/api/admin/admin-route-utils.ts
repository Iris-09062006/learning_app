import { NextResponse } from "next/server";

import { AdminServiceError } from "@/features/admin/services/admin-service";

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminServiceError) {
    const status = error.code === "UNAUTHENTICATED"
      ? 401
      : error.code === "FORBIDDEN"
        ? 403
        : error.code === "NOT_FOUND"
          ? 404
          : error.code === "LAST_ACTIVE_ADMIN"
            ? 409
            : error.code === "VALIDATION_ERROR"
              ? 400
              : 500;
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, details: error.details } },
      { status },
    );
  }
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminServiceError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}
