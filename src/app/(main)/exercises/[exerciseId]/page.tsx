import { notFound, redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { ExerciseView } from "@/features/exercises/components/exercise-view";
import { fetchExerciseData } from "@/features/exercises/repositories/exercise-repository";
import { getExerciseReviewSubmission } from "@/features/exercises/services/exercise-service";

interface ExercisePageProps {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
}

export const dynamic = "force-dynamic";

export default async function ExercisePage({ params, searchParams }: ExercisePageProps) {
  const { exerciseId: exerciseIdParam } = await params;
  const { mode } = await searchParams;
  const exerciseId = Number(exerciseIdParam);
  const reviewRequested = mode === "review";

  if (!Number.isInteger(exerciseId) || exerciseId < 1) {
    notFound();
  }

  const result = await fetchExerciseData(exerciseId);

  if (!result.isAuthenticated) {
    const nextPath = reviewRequested
      ? `/exercises/${exerciseId}?mode=review`
      : `/exercises/${exerciseId}`;
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!result.exerciseExists || !result.isPublished) {
    notFound();
  }

  if (!result.isEnrolled || !result.exercise) {
    redirect("/courses");
  }

  // Persisted completion wins over the route hint so refreshing a completed attempt
  // cannot silently reopen an editable form. Incomplete Exercises still enter attempt mode.
  const reviewSubmission = await getExerciseReviewSubmission(exerciseId);

  return (
    <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
      <PageContainer className="max-w-5xl pb-16 lg:pb-0">
        <ExerciseView exercise={result.exercise} reviewSubmission={reviewSubmission} />
      </PageContainer>
    </main>
  );
}
