import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { createProductTitle } from "@/config/product";
import { DashboardView } from "@/features/profile/components/dashboard-view";
import { getLearnerDashboard, ProfileServiceError } from "@/features/profile/services/profile-service";

export const metadata: Metadata = { title: createProductTitle("Dashboard") };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    return (
      <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
        <PageContainer className="pb-16 lg:pb-0">
          <DashboardView data={await getLearnerDashboard()} />
        </PageContainer>
      </main>
    );
  } catch (error) {
    if (error instanceof ProfileServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
}
