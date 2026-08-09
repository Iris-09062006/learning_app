import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ModerationService } from "@/features/moderation/services/moderation-service";

export const runtime = "nodejs";

const moderationService = new ModerationService();

async function checkModeratorAccess(client: ReturnType<typeof createServerSupabaseClient>) {
  const supabase = await client;
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401, user: null };
  }

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerSupabaseClient();
  const access = await checkModeratorAccess(supabase);

  if (access.error || !access.user) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid exercise ID" },
        { status: 400 }
      );
    }

    const client = await supabase;
    const result = await moderationService.publishExercise(client, id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[Moderation API - POST generated-exercises/:id/publish]", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}