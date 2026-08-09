import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardView } from "@/features/profile/components/dashboard-view";
import { getLearnerDashboard, ProfileServiceError } from "@/features/profile/services/profile-service";

export const metadata: Metadata = { title: "Dashboard | Python Learning Platform" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    return <DashboardView data={await getLearnerDashboard()} />;
  } catch (error) {
    if (error instanceof ProfileServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
}
