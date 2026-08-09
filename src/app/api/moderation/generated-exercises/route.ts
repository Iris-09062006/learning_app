import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ModerationService } from "@/features/moderation/services/moderation-service";
import type { ModerationQueueFilter } from "@/features/moderation/types";

export const runtime = "nodejs";

const moderationService = new ModerationService();

async function checkModeratorAccess(client: ReturnType<typeof createServerSupabaseClient>) {
  const supabase = await client;
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401, user: null };
  }

  // Ensure role is moderator or admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !["moderator", "admin"].includes(profile.role)) {
    return { error: "Forbidden: Moderators only", status: 403, user: null };
  }

  return { error: null, status: 200, user };
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const access = await checkModeratorAccess(supabase);
  
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const lessonIdParam = searchParams.get("lessonId");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20;
    const parsedPage = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;
    const page = Number.isNaN(parsedPage) ? 1 : parsedPage;
    const offset = (Math.max(page, 1) - 1) * limit;

    const filter: ModerationQueueFilter = { limit, offset };

    if (
      statusParam === "pending" ||
      statusParam === "approved" ||
      statusParam === "rejected" ||
      statusParam === "needs_revision" ||
      statusParam === "published"
    ) {
      filter.status = statusParam;
    }

    if (lessonIdParam) {
      const parsedId = parseInt(lessonIdParam, 10);
      if (!isNaN(parsedId)) {
        filter.lessonId = parsedId;
      }
    }

    const client = await supabase;
    const result = await moderationService.listQueueItems(client, filter);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Moderation API - GET generated-exercises]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}