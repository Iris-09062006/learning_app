import React from "react";
import type { CourseSummary } from "@/features/courses/types";
import { CourseCard } from "./course-card";

interface CourseListProps {
  courses: CourseSummary[];
  search?: string;
}

export const CourseList: React.FC<CourseListProps> = ({ courses, search }) => {
  if (!courses || courses.length === 0) {
    return (
      <div
        data-testid="course-list-empty"
        className="rounded-xl border border-dashed border-border bg-surface p-12 text-center"
      >
        <p className="text-sm text-text-muted">
          {search
            ? `Không tìm thấy khóa học phù hợp với “${search}”.`
            : "Hiện chưa có khóa học nào được phát hành."}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="course-list"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
};
