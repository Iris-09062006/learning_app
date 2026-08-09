import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/generated/database.types";

const PUBLIC_PAGE_PATTERNS = [
  /^\/$/,
  /^\/(?:login|register)\/?$/,
  /^\/courses\/?$/,
  /^\/courses\/[^/]+\/?$/,
];

function isPublicPage(pathname: string) {
  return PUBLIC_PAGE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function shouldRedirectToLogin(pathname: string, hasUser: boolean) {
  const isApiRequest = pathname === "/api" || pathname.startsWith("/api/");
  return !hasUser && !isApiRequest && !isPublicPage(pathname);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          Object.entries(headersToSet).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Route Handlers own their JSON authentication and authorization contract.
  // Redirecting an API request to an HTML login page breaks auth submissions
  // and hides the endpoint's intended 401/403 response from API consumers.
  if (shouldRedirectToLogin(pathname, Boolean(user))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
