import { authService } from "@/features/auth/auth.service";

export async function GET() {
  try {
    const user = await authService.getCurrentUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Bạn cần đăng nhập để truy cập tài nguyên này.",
          },
        },
        { status: 401 }
      );
    }

    return Response.json(
      {
        success: true,
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    return authService.handleRouteError(error);
  }
}
