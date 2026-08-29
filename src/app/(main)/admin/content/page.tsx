import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { createProductTitle } from "@/config/product";
import { AdminServiceError, assertAdminAccess } from "@/features/admin/services/admin-service";
import { ContentPipelineAdmin } from "@/features/content-pipeline/components/content-pipeline-admin";

export const metadata = {
  title: createProductTitle("Document-to-Lesson Admin"),
  description: "Create and review cited lesson drafts from private source documents.",
};

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  try {
    await assertAdminAccess();
    return (
      <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
        <PageContainer className="pb-16 lg:pb-0">
          <ContentPipelineAdmin />
        </PageContainer>
      </main>
    );
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    if (error instanceof AdminServiceError && error.code === "FORBIDDEN") redirect("/dashboard");
    throw error;
  }
}
