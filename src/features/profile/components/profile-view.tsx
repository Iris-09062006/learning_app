import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import type { ProfileResponse } from "@/features/profile/types";

interface ProfileViewProps {
  profile: ProfileResponse;
}

export function ProfileView({ profile }: ProfileViewProps) {
  return (
    <>
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center text-sm font-semibold text-primary hover:underline"
      >
        &larr; Về dashboard
      </Link>
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Xem thông tin tài khoản và cập nhật tên hiển thị."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-text-muted">Email</dt>
                <dd className="mt-1 break-all font-medium">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Vai trò</dt>
                <dd className="mt-1 font-medium capitalize">{profile.role}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Ngày tạo</dt>
                <dd className="mt-1 font-medium">
                  {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(profile.createdAt))}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cập nhật username</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm initialUsername={profile.username} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
