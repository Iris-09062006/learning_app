"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

interface ResetPasswordFieldErrors {
  password?: string;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const checkedSession = useRef(false);
  const [sessionState, setSessionState] = useState<"checking" | "valid" | "invalid">(
    "checking",
  );
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (checkedSession.current) {
      return;
    }
    checkedSession.current = true;

    const supabase = createBrowserSupabaseClient();
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSessionState(data.session ? "valid" : "invalid");
      })
      .catch(() => {
        setSessionState("invalid");
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const errors: ResetPasswordFieldErrors = {};

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
    }

    setFieldErrors(errors);
    setFormError(undefined);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(error.message);
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
              Mật khẩu đã được đặt lại
            </h1>
            <CardDescription className="text-sm leading-6 sm:text-base">
              Mật khẩu mới đã được lưu. Bạn có thể đăng nhập ngay bây giờ.
            </CardDescription>
          </div>
        </CardHeader>

        <CardFooter className="justify-center border-t border-border px-6 py-5 text-sm text-text-secondary sm:px-8">
          <button
            type="button"
            onClick={() => {
              router.replace("/login");
              router.refresh();
            }}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Quay lại đăng nhập
          </button>
        </CardFooter>
      </Card>
    );
  }

  if (sessionState === "invalid") {
    return (
      <Card className="w-full max-w-md border-border bg-surface shadow-[0_28px_80px_-45px_rgba(99,102,241,0.45)]">
        <CardHeader className="space-y-3 px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
          <div
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600"
          >
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Liên kết không hợp lệ
            </h1>
            <CardDescription className="text-sm leading-6 sm:text-base">
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng
              yêu cầu liên kết mới.
            </CardDescription>
          </div>
        </CardHeader>

        <CardFooter className="justify-center border-t border-border px-6 py-5 text-sm text-text-secondary sm:px-8">
          <Link
            href="/forgot-password"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Yêu cầu liên kết mới
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border bg-surface shadow-[0_28px_80px_-45px_rgba(99,102,241,0.45)]">
      <CardHeader className="space-y-3 px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Bảo mật tài khoản</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Đặt mật khẩu mới
          </h1>
          <CardDescription className="text-sm leading-6 sm:text-base">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 sm:px-8">
        <form noValidate className="space-y-5" onSubmit={handleSubmit}>
          <Input
            id="reset-password-password"
            name="password"
            type="password"
            label="Mật khẩu mới"
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
            aria-label="Đặt lại mật khẩu"
          >
            Đặt lại mật khẩu
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
