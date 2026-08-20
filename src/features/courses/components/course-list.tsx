import React from "react";
import { StatePanel } from "@/components/ui/state-panel";
import type { CourseSummary } from "@/features/courses/types";
import { CourseCard } from "./course-card";

interface CourseListProps {
  courses: CourseSummary[];
  search?: string;
}

export const CourseList: React.FC<CourseListProps> = ({ courses, search }) => {
  if (!courses || courses.length === 0) {
    return (
      <StatePanel
        variant="empty"
        data-testid="course-list-empty"
        className="p-12"
      >
        {search
          ? `Không tìm thấy khóa học phù hợp với “${search}”.`
          : "Hiện chưa có khóa học nào được phát hành."}
      </StatePanel>
    );
  }

  return (
    <div
      data-testid="course-list"
      className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
};
