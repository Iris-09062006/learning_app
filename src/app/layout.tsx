import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Python Learning Platform",
  description: "Nền tảng học Python với lộ trình rõ ràng và trợ lý AI an toàn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
