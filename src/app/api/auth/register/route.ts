import { authService } from "@/features/auth/auth.service";
import { registerSchema } from "@/features/auth/auth.schema";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const validated = registerSchema.parse(json);
    const result = await authService.register(validated);

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
