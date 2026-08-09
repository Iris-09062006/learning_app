import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileView } from "@/features/profile/components/profile-view";
import { getOwnProfile, ProfileServiceError } from "@/features/profile/services/profile-service";

export const metadata: Metadata = { title: "Hồ sơ | Python Learning Platform" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  try {
    return <ProfileView profile={await getOwnProfile()} />;
  } catch (error) {
    if (error instanceof ProfileServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
}
