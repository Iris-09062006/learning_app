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
    <Card className="w-full max-w-md border-slate-200/80 shadow-xl shadow-indigo-950/5">
      <CardHeader className="space-y-3 px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
        <div
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-2xl bg-cyan-50 text-xl font-bold text-cyan-600"
        >
          +1
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Bắt đầu học Python
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
            placeholder="Python Learner"
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
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
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

      <CardFooter className="justify-center border-t border-slate-100 px-6 py-5 text-sm text-slate-600 sm:px-8">
        Đã có tài khoản?&nbsp;
        <Link
          href="/login"
          className="font-semibold text-indigo-600 underline-offset-4 hover:underline"
        >
          Đăng nhập
        </Link>
      </CardFooter>
    </Card>
  );
}
