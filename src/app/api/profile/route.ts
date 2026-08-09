import { NextResponse } from "next/server";

import {
  getOwnProfile,
  parseUpdateProfileInput,
  ProfileServiceError,
  updateOwnProfile,
} from "@/features/profile/services/profile-service";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof ProfileServiceError) {
    const status = error.code === "UNAUTHENTICATED"
      ? 401
      : error.code === "FORBIDDEN"
        ? 403
        : error.code === "NOT_FOUND"
          ? 404
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

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getOwnProfile() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ProfileServiceError("VALIDATION_ERROR", "Request body must be valid JSON.");
    }
    const input = parseUpdateProfileInput(body);
    return NextResponse.json({ success: true, data: await updateOwnProfile(input) });
  } catch (error) {
    return errorResponse(error);
  }
}
