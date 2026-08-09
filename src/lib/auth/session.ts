import { createServerSupabaseClient } from "@/lib/supabase/server";

export class UnauthenticatedError extends Error {
  constructor(message = "Bạn cần đăng nhập để thực hiện thao tác này.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export async function getOptionalUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

export async function requireUser() {
  const user = await getOptionalUser();

  if (!user) {
    throw new UnauthenticatedError();
  }

  return user;
}
