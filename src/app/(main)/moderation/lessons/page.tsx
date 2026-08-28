import Link from "next/link";
import { redirect } from "next/navigation";
import { AiServiceError, getExerciseLessonTargets } from "@/features/ai/services/ai-service";

export const metadata = { title: "Choose Lesson for Exercise" };

export default async function ExerciseLessonListPage() {
  let lessons;
  try {
    lessons = await getExerciseLessonTargets();
  } catch (error: unknown) {
    if (error instanceof AiServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    if (error instanceof AiServiceError && error.code === "FORBIDDEN") redirect("/dashboard");
    throw error;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Lesson → Exercise</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Chọn đúng một Lesson đã publish để tạo Exercise draft.
          </p>
        </div>
        <Link
          href="/moderation"
          className="rounded-md text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          Hàng moderation →
        </Link>
      </div>
      {lessons.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-primary">
          Chưa có Lesson đã publish.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <li
              key={lesson.lessonId}
              className="rounded-xl border border-border bg-surface p-5 text-text-primary shadow-sm transition-colors hover:border-primary/35"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {lesson.courseTitle}
              </p>
              <h2 className="mt-1 font-bold text-text-primary">{lesson.lessonTitle}</h2>
              <Link
                href={`/moderation/lessons/${lesson.lessonId}/exercises/new`}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Tạo Exercise
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
