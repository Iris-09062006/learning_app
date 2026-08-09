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

interface LoginFormProps {
  notice?: string;
}

interface LoginFieldErrors {
  email?: string;
  password?: string;
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

function validateLogin(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Vui lòng nhập địa chỉ email hợp lệ.";
  }

  if (!password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  }

  return errors;
}

export function LoginForm({ notice }: LoginFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const errors = validateLogin(email, password);

    setFieldErrors(errors);
    setFormError(undefined);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isRecord(payload) || payload.success !== true) {
        setFormError(
          getApiErrorMessage(payload) ??
            "Không thể đăng nhập lúc này. Vui lòng thử lại.",
        );
        return;
      }

      router.replace("/dashboard");
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
          className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-600"
        >
          &gt;_
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Chào mừng trở lại
          </h1>
          <CardDescription className="text-sm leading-6 sm:text-base">
            Đăng nhập để tiếp tục lộ trình học Python của bạn.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 sm:px-8">
        {notice ? (
          <p
            role="status"
            className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-5 text-cyan-900"
          >
            {notice}
          </p>
        ) : null}

        <form noValidate className="space-y-5" onSubmit={handleSubmit}>
          <Input
            id="login-email"
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
            id="login-password"
            name="password"
            type="password"
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
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
            aria-label="Đăng nhập"
          >
            Đăng nhập
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-slate-100 px-6 py-5 text-sm text-slate-600 sm:px-8">
        Chưa có tài khoản?&nbsp;
        <Link
          href="/register"
          className="font-semibold text-indigo-600 underline-offset-4 hover:underline"
        >
          Đăng ký miễn phí
        </Link>
      </CardFooter>
    </Card>
  );
}
