import type { Metadata } from "next";

import { createProductTitle } from "@/config/product";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: createProductTitle("Đặt lại mật khẩu"),
  description: "Đặt mật khẩu mới cho tài khoản của bạn.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
