import type { Metadata } from "next";

import { createProductTitle } from "@/config/product";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: createProductTitle("Đăng ký"),
  description: "Tạo tài khoản và bắt đầu lộ trình học phù hợp với bạn.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
