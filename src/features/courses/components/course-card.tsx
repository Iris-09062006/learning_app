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
      className="flex flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-block rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
            {course.language.toUpperCase()}
          </span>
          <span className="text-xs text-text-muted capitalize">
            {course.level}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold text-text-primary">
          {course.title}
        </h3>

        <p className="mt-2 text-sm text-text-secondary line-clamp-2">
          {course.description || "Chưa có mô tả cho khóa học này."}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        {course.isEnrolled ? (
          <span className="text-xs font-medium text-success">
            Đã đăng ký ({course.completionPercentage ?? 0}%)
          </span>
        ) : (
          <span className="text-xs font-medium text-text-muted">
            Chưa đăng ký
          </span>
        )}

        <Link
          href={`/courses/${course.id}`}
          className="group/link inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {course.isEnrolled ? "Tiếp tục học" : "Xem chi tiết"}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover/link:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">&rarr;</span>
        </Link>
      </div>
    </div>
  );
};