import { ModerationQueueView } from "@/features/moderation/components/moderation-queue-view";

export const metadata = {
  title: "Moderation Queue",
  description: "Review and publish AI-generated exercises",
};

export default function ModerationPage() {
  return (
    <div className="space-y-6">
      <ModerationQueueView />
    </div>
  );
}