import { authService } from "@/features/auth/auth.service";

export async function POST() {
  try {
    await authService.logout();

    return Response.json(
      {
        success: true,
        data: {
          loggedOut: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return authService.handleRouteError(error);
  }
}
