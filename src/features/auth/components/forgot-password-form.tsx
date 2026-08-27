"use client";

import Link from "next/link";
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

interface ForgotPasswordFieldErrors {
  email?: string;
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

export function ForgotPasswordForm() {
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const errors: ForgotPasswordFieldErrors = {};

    if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Vui lòng nhập địa chỉ email hợp lệ.";
    }

    setFieldErrors(errors);
    setFormError(undefined);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isRecord(payload) || payload.success !== true) {
        setFormError(
          getApiErrorMessage(payload) ??
            "Không thể gửi yêu cầu lúc này. Vui lòng thử lại.",
        );
        return;
      }

      setIsSubmitted(true);
    } catch {
      setFormError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md border-border bg-surface shadow-[0_28px_80px_-45px_rgba(99,102,241,0.45)]">
        <CardHeader className="space-y-3 px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
          <div
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-600"
          >
            ✓
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Kiểm tra email của bạn
            </h1>
            <CardDescription className="text-sm leading-6 sm:text-base">
              Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui
              lòng kiểm tra hộp thư đến và thư rác.
            </CardDescription>
          </div>
        </CardHeader>

        <CardFooter className="justify-center border-t border-border px-6 py-5 text-sm text-text-secondary sm:px-8">
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Quay lại đăng nhập
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border bg-surface shadow-[0_28px_80px_-45px_rgba(99,102,241,0.45)]">
      <CardHeader className="space-y-3 px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
        <div
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-xl font-bold text-amber-600"
        >
          ?
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Quên mật khẩu
          </h1>
          <CardDescription className="text-sm leading-6 sm:text-base">
            Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 sm:px-8">
        <form noValidate className="space-y-5" onSubmit={handleSubmit}>
          <Input
            id="forgot-password-email"
            name="email"
            type="email"
            label="Email"
            placeholder="ban@example.com"
            autoComplete="email"
            inputMode="email"
            disabled={isSubmitting}
            error={fieldErrors.email}
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
            aria-label="Gửi liên kết đặt lại mật khẩu"
          >
            Gửi liên kết đặt lại
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-border px-6 py-5 text-sm text-text-secondary sm:px-8">
        Nhớ mật khẩu?&nbsp;
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
