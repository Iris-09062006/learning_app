import type { Metadata } from "next";

import { createProductTitle } from "@/config/product";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: createProductTitle("Quên mật khẩu"),
  description: "Yêu cầu liên kết đặt lại mật khẩu cho tài khoản của bạn.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
