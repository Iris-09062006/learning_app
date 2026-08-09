import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  CurrentUser,
  LoginResponse,
  RegisterResponse,
  UserRole,
} from "./auth.types";
import { LoginInput, RegisterInput } from "./auth.schema";

export class AuthService {
  async register(input: RegisterInput): Promise<RegisterResponse> {
    const supabase = await createServerSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          username: input.username,
        },
      },
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Không thể khởi tạo tài khoản.");
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email ?? input.email,
        username: input.username,
        role: "learner",
      },
      requiresEmailConfirmation: !authData.session,
    };
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const supabase = await createServerSupabaseClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Đăng nhập thất bại.");
    }

    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error("Không thể lấy thông tin tài khoản sau khi đăng nhập.");
    }

    return {
      user: currentUser,
    };
  }

  async logout(): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  async getCurrentUser(): Promise<CurrentUser | null> {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, role, is_active")
      .eq("id", authUser.id)
      .single();

    const username =
      profile?.username ??
      authUser.user_metadata?.username ??
      authUser.email?.split("@")[0] ??
      "User";

    const role: UserRole = profile?.role ?? "learner";
    const isActive = profile?.is_active ?? true;

    return {
      id: authUser.id,
      email: authUser.email ?? "",
      username,
      role,
      isActive,
    };
  }

  handleRouteError(error: unknown): Response {
    if (error && typeof error === "object" && "name" in error) {
      const errObj = error as {
        name: string;
        errors?: Array<{ field: string; message: string }>;
      };

      if (errObj.name === "ValidationZodError" && errObj.errors) {
        const details: Record<string, string> = {};
        for (const err of errObj.errors) {
          details[err.field] = err.message;
        }
        return Response.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Dữ liệu yêu cầu không hợp lệ.",
              details,
            },
          },
          { status: 400 }
        );
      }
    }

    const message =
      error instanceof Error ? error.message : "Đã có lỗi xảy ra.";

    if (message.includes("Invalid login credentials")) {
      return Response.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Email hoặc mật khẩu không chính xác.",
          },
        },
        { status: 401 }
      );
    }

    if (message.includes("User already registered")) {
      return Response.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "Email này đã được đăng ký tài khoản.",
          },
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.",
        },
      },
      { status: 500 }
    );
  }
}

export const authService = new AuthService();
