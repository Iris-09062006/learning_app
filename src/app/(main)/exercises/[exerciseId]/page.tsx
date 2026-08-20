import { notFound, redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { ExerciseView } from "@/features/exercises/components/exercise-view";
import { fetchExerciseData } from "@/features/exercises/repositories/exercise-repository";

interface ExercisePageProps {
  params: Promise<{ exerciseId: string }>;
}

export const dynamic = "force-dynamic";

export default async function ExercisePage({ params }: ExercisePageProps) {
  const { exerciseId: exerciseIdParam } = await params;
  const exerciseId = Number(exerciseIdParam);

  if (!Number.isInteger(exerciseId) || exerciseId < 1) {
    notFound();
  }

  const result = await fetchExerciseData(exerciseId);

  if (!result.isAuthenticated) {
    redirect(`/login?next=${encodeURIComponent(`/exercises/${exerciseId}`)}`);
  }

  if (!result.exerciseExists || !result.isPublished) {
    notFound();
  }

  if (!result.isEnrolled || !result.exercise) {
    redirect("/courses");
  }

  return (
    <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
      <PageContainer className="max-w-5xl pb-16 lg:pb-0">
        <ExerciseView exercise={result.exercise} />
      </PageContainer>
    </main>
  );
}
