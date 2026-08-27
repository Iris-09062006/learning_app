"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface RegisterFieldErrors {
  email?: string;
  password?: string;
  username?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getApiErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return undefined;
  }

  return typeof payload.error.message === "string"
    ? payload.error.message
    : undefined;
}

function requiresEmailConfirmation(payload: unknown): boolean | undefined {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return undefined;
  }

  return typeof payload.data.requiresEmailConfirmation === "boolean"
    ? payload.data.requiresEmailConfirmation
    : undefined;
}

function validateRegister(
  email: string,
  password: string,
  username: string,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};

  if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Vui lòng nhập địa chỉ email hợp lệ.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  }

  if (username.length < 3 || username.length > 50) {
    errors.username = "Tên hiển thị phải từ 3 đến 50 ký tự.";
  }

  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const username = String(formData.get("username") ?? "").trim();
    const errors = validateRegister(email, password, username);

    setFieldErrors(errors);
    setFormError(undefined);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isRecord(payload) || payload.success !== true) {
        setFormError(
          getApiErrorMessage(payload) ??
            "Không thể tạo tài khoản lúc này. Vui lòng thử lại.",
        );
        return;
      }

      const needsConfirmation = requiresEmailConfirmation(payload);
      if (needsConfirmation === undefined) {
        setFormError("Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.");
        return;
      }

      router.replace(needsConfirmation ? "/login?registered=1" : "/dashboard");
      router.refresh();
    } catch {
      setFormError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-surface shadow-[0_28px_80px_-45px_rgba(99,102,241,0.45)]">
      <CardHeader className="space-y-3 px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tạo không gian học của bạn</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            Bắt đầu hành trình học
          </h1>
          <CardDescription className="text-sm leading-6 sm:text-base">
            Tạo tài khoản để lưu tiến độ và học theo lộ trình rõ ràng.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 sm:px-8">
        <form noValidate className="space-y-5" onSubmit={handleSubmit}>
          <Input
            id="register-username"
            name="username"
            type="text"
            label="Tên hiển thị"
            placeholder="Người học mới"
            autoComplete="username"
            minLength={3}
            maxLength={50}
            disabled={isSubmitting}
            error={fieldErrors.username}
            helperText="Từ 3 đến 50 ký tự."
          />
          <Input
            id="register-email"
            name="email"
            type="email"
            label="Email"
            placeholder="ban@example.com"
            autoComplete="email"
            inputMode="email"
            disabled={isSubmitting}
            error={fieldErrors.email}
          />
          <Input
            id="register-password"
            name="password"
            type="password"
            label="Mật khẩu"
            placeholder="Tối thiểu 8 ký tự"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            disabled={isSubmitting}
            error={fieldErrors.password}
          />

          {formError ? (
            <p
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-5 text-danger"
            >
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            aria-label="Tạo tài khoản"
          >
            Tạo tài khoản
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-border px-6 py-5 text-sm text-text-secondary sm:px-8">
        Đã có tài khoản?&nbsp;
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Đăng nhập
        </Link>
      </CardFooter>
    </Card>
  );
}
