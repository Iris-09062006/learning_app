import { authService } from "@/features/auth/auth.service";
import { loginSchema } from "@/features/auth/auth.schema";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const validated = loginSchema.parse(json);
    const result = await authService.login(validated);

    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return authService.handleRouteError(error);
  }
}
