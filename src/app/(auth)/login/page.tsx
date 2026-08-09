import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập | Python Learning",
  description: "Đăng nhập để tiếp tục lộ trình học Python của bạn.",
};

interface LoginPageProps {
  searchParams: Promise<{ registered?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered } = await searchParams;
  const notice =
    registered === "1"
      ? "Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận trước khi đăng nhập."
      : undefined;

  return <LoginForm notice={notice} />;
}
