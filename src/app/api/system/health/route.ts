import { NextResponse } from "next/server";

import { getSystemHealth } from "@/features/admin/services/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getSystemHealth();
  return NextResponse.json(
    { success: true, data: health },
    { status: health.status === "ok" ? 200 : 503 },
  );
}
