import { PageContainer } from "@/components/layout/page-container";
import { ModerationQueueView } from "@/features/moderation/components/moderation-queue-view";

export const metadata = {
  title: "Moderation Queue",
  description: "Review and publish AI-generated exercises",
};

export default function ModerationPage() {
  return (
    <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
      <PageContainer className="pb-16 lg:pb-0">
        <ModerationQueueView />
      </PageContainer>
    </main>
  );
}