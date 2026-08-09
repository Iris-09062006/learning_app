import { notFound } from "next/navigation";

import { ModerationDetailView } from "@/features/moderation/components/moderation-detail-view";

interface ModerationDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Moderation Review",
  description: "Review an AI-generated exercise",
};

export default async function ModerationDetailPage({ params }: ModerationDetailPageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  return <ModerationDetailView id={id} />;
}