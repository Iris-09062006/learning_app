import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseLearningRecommendation } from "@/features/ai/components/course-learning-recommendation";
import { CourseDetailView } from "@/features/courses/components/course-detail-view";
import { getCourseById } from "@/features/courses/services/course-service";

interface CourseDetailPageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = await getCourseById(Number(courseId));

  return {
    title: course
      ? `${course.title} | Python Learning Platform`
      : "Không tìm thấy khóa học | Python Learning Platform",
    description: course?.description ?? "Chi tiết khóa học Python.",
  };
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { courseId } = await params;
  const course = await getCourseById(Number(courseId));

  if (!course) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <CourseLearningRecommendation courseId={course.id} />
        <CourseDetailView course={course} />
      </div>
    </main>
  );
}