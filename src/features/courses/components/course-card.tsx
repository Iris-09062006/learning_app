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
      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 motion-reduce:transform-none motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40 dark:hover:shadow-indigo-950/40"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-block rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            {course.language.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500 capitalize dark:text-slate-400">
            {course.level}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
          {course.title}
        </h3>

        <p className="mt-2 text-sm text-slate-600 line-clamp-2 dark:text-slate-300">
          {course.description || "Chưa có mô tả cho khóa học này."}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        {course.isEnrolled ? (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Đã đăng ký ({course.completionPercentage ?? 0}%)
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Chưa đăng ký
          </span>
        )}

        <Link
          href={`/courses/${course.id}`}
          className="group/link inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-400"
        >
          {course.isEnrolled ? "Tiếp tục học" : "Xem chi tiết"}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover/link:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">&rarr;</span>
        </Link>
      </div>
    </div>
  );
};