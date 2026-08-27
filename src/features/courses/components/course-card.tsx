import React from "react";
import Link from "next/link";
import type { CourseSummary } from "@/features/courses/types";

interface CourseCardProps {
  course: CourseSummary;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  return (
    <div
      data-testid="course-card"
      className="group flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-[0_18px_50px_-38px_rgba(0,0,0,0.75)] transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-[0_22px_60px_-38px_rgba(99,102,241,0.4)]"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-subtle text-primary">
            <svg viewBox="0 0 24 24" fill="none" className="size-5"><path d="M5 5.5c2.6 0 4.9.8 7 2.2 2.1-1.4 4.4-2.2 7-2.2v13c-2.6 0-4.9.7-7 2.1-2.1-1.4-4.4-2.1-7-2.1v-13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 7.7v12.9" stroke="currentColor" strokeWidth="1.7"/></svg>
          </span>
          <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-text-muted capitalize">Cấp độ {course.level}</span>
        </div>

        <h3 className="mt-5 line-clamp-2 break-words text-lg font-semibold tracking-[-0.015em] text-text-primary" title={course.title}>
          {course.title}
        </h3>

        <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-text-secondary">
          {course.description || "Chưa có mô tả cho khóa học này."}
        </p>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        {course.isEnrolled ? (
          <div className="mb-4" aria-label={`Tiến độ ${course.completionPercentage ?? 0}%`}>
            <div className="flex justify-between text-xs"><span className="font-medium text-success">Đã đăng ký</span><span className="text-text-muted">{course.completionPercentage ?? 0}%</span></div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full rounded-full bg-success" style={{ width: `${course.completionPercentage ?? 0}%` }} /></div>
          </div>
        ) : (
          <span className="mb-4 block min-w-0 break-words text-xs font-medium text-text-muted">
            Chưa đăng ký
          </span>
        )}

        <Link
          href={`/courses/${course.id}`}
          className="group/link inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {course.isEnrolled ? "Tiếp tục học" : "Xem chi tiết"}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover/link:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">&rarr;</span>
        </Link>
      </div>
    </div>
  );
};
