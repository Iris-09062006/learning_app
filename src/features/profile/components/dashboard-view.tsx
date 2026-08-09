import Link from "next/link";

import { LearningRecommendationCard } from "@/features/ai/components/learning-recommendation-card";
import type { LearnerDashboardData } from "@/features/profile/types";

interface DashboardViewProps {
  data: LearnerDashboardData;
}

export function DashboardView({ data }: DashboardViewProps) {
  const { learningMetrics } = data.profile;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Learning dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Chào mừng trở lại, {data.profile.username}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Theo dõi tiến độ và tiếp tục bài học gần nhất của bạn.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Quản lý hồ sơ
          </Link>
        </header>

        <section aria-labelledby="learning-summary-heading">
          <h2 id="learning-summary-heading" className="sr-only">Tổng quan học tập</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Khóa học", learningMetrics.enrolledCourses],
              ["Đang học", learningMetrics.activeCourses],
              ["Đã hoàn thành", learningMetrics.completedCourses],
              ["Bài học hoàn tất", `${learningMetrics.completedLessons}/${learningMetrics.totalLessons}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="recommendation-heading">
          <h2 id="recommendation-heading" className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
            Bước học tiếp theo
          </h2>
          <LearningRecommendationCard recommendation={data.recommendation} />
        </section>

        <section aria-labelledby="enrolled-courses-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="enrolled-courses-heading" className="text-xl font-bold text-slate-900 dark:text-white">
              Khóa học của bạn
            </h2>
            <Link href="/courses" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Xem danh mục
            </Link>
          </div>

          {data.courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-slate-600 dark:text-slate-300">Bạn chưa đăng ký khóa học nào.</p>
              <Link href="/courses" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">
                Khám phá khóa học
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {data.courses.map((course) => (
                <article key={course.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                        {course.status === "completed" ? "Đã hoàn thành" : course.status === "cancelled" ? "Đã hủy" : "Đang học"}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{course.title}</h3>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{course.completionPercentage}%</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                    {course.description ?? "Tiếp tục lộ trình học tập của khóa học này."}
                  </p>
                  <div className="mt-5">
                    <div
                      role="progressbar"
                      aria-label={`Tiến độ ${course.title}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={course.completionPercentage}
                      className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                    >
                      <div className="h-full rounded-full bg-indigo-600" style={{ width: `${course.completionPercentage}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {course.completedLessons}/{course.totalLessons} bài học hoàn tất
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={course.resumeUrl} className="inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">
                      {course.resumeLessonId ? "Tiếp tục học" : "Xem lộ trình"}
                    </Link>
                    <Link href={`/courses/${course.id}/roadmap`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200">
                      Lộ trình
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
