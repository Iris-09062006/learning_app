import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatePanel } from "@/components/ui/state-panel";
import { LearningRecommendationCard } from "@/features/ai/components/learning-recommendation-card";
import type { LearnerDashboardData } from "@/features/profile/types";

interface DashboardViewProps {
  data: LearnerDashboardData;
}

export function DashboardView({ data }: DashboardViewProps) {
  const { learningMetrics } = data.profile;

  return (
    <>
      <PageHeader
        eyebrow="Learning dashboard"
        title={`Chào mừng trở lại, ${data.profile.username}`}
        description="Theo dõi tiến độ và tiếp tục bài học gần nhất của bạn."
        actions={
          <Link
            href="/profile"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Quản lý hồ sơ
          </Link>
        }
      />

      <section aria-labelledby="learning-summary-heading" className="mt-8">
        <h2 id="learning-summary-heading" className="sr-only">
          Tổng quan học tập
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Khóa học", learningMetrics.enrolledCourses],
              ["Đang học", learningMetrics.activeCourses],
              ["Đã hoàn thành", learningMetrics.completedCourses],
              [
                "Bài học hoàn tất",
                `${learningMetrics.completedLessons}/${learningMetrics.totalLessons}`,
              ],
            ] as const
          ).map(([label, value]) => (
            <Card key={label} className="p-5">
              <dt className="text-sm text-text-muted">{label}</dt>
              <dd className="mt-2 text-2xl font-bold text-text-primary">{value}</dd>
            </Card>
          ))}
        </dl>
      </section>

      <section aria-labelledby="recommendation-heading" className="mt-8">
        <h2 id="recommendation-heading" className="mb-4 text-xl font-bold text-text-primary">
          Bước học tiếp theo
        </h2>
        <LearningRecommendationCard recommendation={data.recommendation} />
      </section>

      <section aria-labelledby="enrolled-courses-heading" className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="enrolled-courses-heading" className="text-xl font-bold text-text-primary">
            Khóa học của bạn
          </h2>
          <Link
            href="/courses"
            className="text-sm font-semibold text-primary hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Xem danh mục
          </Link>
        </div>

        {data.courses.length === 0 ? (
          <StatePanel
            variant="empty"
            action={
              <Link
                href="/courses"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Khám phá khóa học
              </Link>
            }
          >
            Bạn chưa đăng ký khóa học nào.
          </StatePanel>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.courses.map((course) => (
              <article
                key={course.id}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        course.status === "completed"
                          ? "text-success"
                          : course.status === "cancelled"
                            ? "text-text-muted"
                            : "text-info"
                      }`}
                    >
                      {course.status === "completed"
                        ? "Đã hoàn thành"
                        : course.status === "cancelled"
                          ? "Đã hủy"
                          : "Đang học"}
                    </p>
                    <h3 className="mt-1 line-clamp-2 break-words text-lg font-bold text-text-primary" title={course.title}>
                      {course.title}
                    </h3>
                  </div>
                  <span className="text-lg font-bold text-text-primary">
                    {course.completionPercentage}%
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
                  {course.description ?? "Tiếp tục lộ trình học tập của khóa học này."}
                </p>
                <div className="mt-5">
                  <div
                    role="progressbar"
                    aria-label={`Tiến độ ${course.title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={course.completionPercentage}
                    className="h-2 overflow-hidden rounded-full bg-surface-container"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${course.completionPercentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    {course.completedLessons}/{course.totalLessons} bài học hoàn tất
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={course.resumeUrl}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {course.resumeLessonId ? "Tiếp tục học" : "Xem lộ trình"}
                  </Link>
                  <Link
                    href={`/courses/${course.id}/roadmap`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Lộ trình
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
