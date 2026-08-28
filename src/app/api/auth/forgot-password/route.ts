import { forgotPasswordSchema } from "@/features/auth/auth.schema";
import { authService } from "@/features/auth/auth.service";
import { checkRateLimit } from "@/lib/rate-limiter";

type ForgotPasswordRouteDiagnostic = {
  stage:
    | "forgot_password_request"
    | "validate_input"
    | "resolve_env"
    | "build_redirect"
    | "create_supabase_client"
    | "reset_password_for_email"
    | "build_response";
  request_received?: "yes" | "no";
  email_present?: "yes" | "no";
  next_public_supabase_url_configured?: "yes" | "no";
  next_public_supabase_anon_key_configured?: "yes" | "no";
  next_public_supabase_publishable_key_configured?: "yes" | "no";
  next_public_site_url_configured?: "yes" | "no";
  resolved_site_origin?: string;
  resolved_reset_password_path?: string;
  resolved_redirect_url?: string;
  supabase_reset_call_attempted?: "yes" | "no";
  supabase_error_code?: string;
  supabase_error_message?: string;
  supabase_error_status?: number;
  supabase_error_name?: string;
  route_response_status?: number;
};

function logForgotPasswordDiagnostic(
  diagnostic: ForgotPasswordRouteDiagnostic,
): void {
  console.info(JSON.stringify(diagnostic));
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  logForgotPasswordDiagnostic({
    stage: "forgot_password_request",
    request_received: "yes",
  });

  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit("auth:forgot-password", ip);

    if (!rateLimit.allowed) {
      logForgotPasswordDiagnostic({
        stage: "build_response",
        route_response_status: 429,
      });
      return Response.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const json = await request.json().catch(() => ({}));
    const emailPresent =
      typeof json === "object" &&
      json !== null &&
      "email" in json &&
      typeof json.email === "string" &&
      json.email.trim().length > 0;
    logForgotPasswordDiagnostic({
      stage: "validate_input",
      email_present: emailPresent ? "yes" : "no",
    });
    const validated = forgotPasswordSchema.parse(json);
    const result = await authService.forgotPassword(
      validated,
      logForgotPasswordDiagnostic,
    );

    logForgotPasswordDiagnostic({
      stage: "build_response",
      route_response_status: 200,
    });

    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    const response = authService.handleRouteError(error);
    logForgotPasswordDiagnostic({
      stage: "build_response",
      route_response_status: response.status,
    });
    return response;
  }
}
