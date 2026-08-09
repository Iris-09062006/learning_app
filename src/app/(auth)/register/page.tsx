import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Đăng ký | Python Learning",
  description: "Tạo tài khoản và bắt đầu lộ trình học Python rõ ràng.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
