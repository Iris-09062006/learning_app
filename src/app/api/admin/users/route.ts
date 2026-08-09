import { NextResponse } from "next/server";

import { adminErrorResponse } from "@/app/api/admin/admin-route-utils";
import { listAdminUsers, parseAdminUserFilters } from "@/features/admin/services/admin-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const filters = parseAdminUserFilters(new URL(request.url).searchParams);
    return NextResponse.json({ success: true, data: await listAdminUsers(filters) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
