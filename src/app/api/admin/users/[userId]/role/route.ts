import { NextResponse } from "next/server";

import { adminErrorResponse, readJsonBody } from "@/app/api/admin/admin-route-utils";
import {
  parseRoleInput,
  parseUserId,
  updateAdminUserRole,
} from "@/features/admin/services/admin-service";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ userId: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = parseUserId((await context.params).userId);
    const role = parseRoleInput(await readJsonBody(request));
    return NextResponse.json({ success: true, data: await updateAdminUserRole(userId, role) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
