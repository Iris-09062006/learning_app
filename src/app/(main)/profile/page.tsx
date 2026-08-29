import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { createProductTitle } from "@/config/product";
import { ProfileView } from "@/features/profile/components/profile-view";
import { getOwnProfile, ProfileServiceError } from "@/features/profile/services/profile-service";

export const metadata: Metadata = { title: createProductTitle("Hồ sơ") };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  try {
    return (
      <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
        <PageContainer className="max-w-4xl pb-16 lg:pb-0">
          <ProfileView profile={await getOwnProfile()} />
        </PageContainer>
      </main>
    );
  } catch (error) {
    if (error instanceof ProfileServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
}
