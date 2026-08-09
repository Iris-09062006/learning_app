import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import type { ProfileResponse } from "@/features/profile/types";

interface ProfileViewProps {
  profile: ProfileResponse;
}

export function ProfileView({ profile }: ProfileViewProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          &larr; Về dashboard
        </Link>
        <header className="mt-5">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Hồ sơ cá nhân</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Xem thông tin tài khoản và cập nhật tên hiển thị.</p>
        </header>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <CardHeader><CardTitle>Thông tin tài khoản</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <div><dt className="text-slate-500 dark:text-slate-400">Email</dt><dd className="mt-1 break-all font-medium">{profile.email}</dd></div>
                <div><dt className="text-slate-500 dark:text-slate-400">Vai trò</dt><dd className="mt-1 font-medium capitalize">{profile.role}</dd></div>
                <div><dt className="text-slate-500 dark:text-slate-400">Ngày tạo</dt><dd className="mt-1 font-medium">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(profile.createdAt))}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card className="dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <CardHeader><CardTitle>Cập nhật username</CardTitle></CardHeader>
            <CardContent><ProfileForm initialUsername={profile.username} /></CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
