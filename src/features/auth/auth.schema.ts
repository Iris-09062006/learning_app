export interface RegisterInput {
  email: string;
  password: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

class ValidationZodError extends Error {
  errors: Array<{ field: string; message: string }>;
  constructor(errors: Array<{ field: string; message: string }>) {
    super("VALIDATION_ERROR");
    this.name = "ValidationZodError";
    this.errors = errors;
  }
}

export const registerSchema = {
  parse(data: unknown): RegisterInput {
    if (!data || typeof data !== "object") {
      throw new ValidationZodError([{ field: "body", message: "Invalid JSON body" }]);
    }
    const { email, password, username } = data as Record<string, unknown>;
    const errors: Array<{ field: string; message: string }> = [];

    if (typeof email !== "string" || !email.includes("@")) {
      errors.push({ field: "email", message: "Email không hợp lệ" });
    }

    if (typeof password !== "string" || password.length === 0) {
      errors.push({ field: "password", message: "Password không được để trống" });
    }

    const trimmedUsername = typeof username === "string" ? username.trim() : "";
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      errors.push({
        field: "username",
        message: "Username phải từ 3 đến 50 ký tự",
      });
    }

    if (errors.length > 0) {
      throw new ValidationZodError(errors);
    }

    return {
      email: (email as string).trim(),
      password: password as string,
      username: trimmedUsername,
    };
  },
};

export const loginSchema = {
  parse(data: unknown): LoginInput {
    if (!data || typeof data !== "object") {
      throw new ValidationZodError([{ field: "body", message: "Invalid JSON body" }]);
    }
    const { email, password } = data as Record<string, unknown>;
    const errors: Array<{ field: string; message: string }> = [];

    if (typeof email !== "string" || !email.includes("@")) {
      errors.push({ field: "email", message: "Email không hợp lệ" });
    }

    if (typeof password !== "string" || password.length === 0) {
      errors.push({ field: "password", message: "Password không được để trống" });
    }

    if (errors.length > 0) {
      throw new ValidationZodError(errors);
    }

    return {
      email: (email as string).trim(),
      password: password as string,
    };
  },
};
