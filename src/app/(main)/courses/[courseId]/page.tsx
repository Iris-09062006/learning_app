import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { createProductTitle } from "@/config/product";
import { CourseLearningRecommendation } from "@/features/ai/components/course-learning-recommendation";
import { CourseDetailView } from "@/features/courses/components/course-detail-view";
import { getCourseById } from "@/features/courses/services/course-service";

const getCachedCourseById = cache(getCourseById);

interface CourseDetailPageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = await getCachedCourseById(Number(courseId));

  return {
    title: createProductTitle(course?.title ?? "Không tìm thấy khóa học"),
    description: course?.description ?? "Thông tin chi tiết và lộ trình của khóa học.",
  };
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { courseId } = await params;
  const course = await getCachedCourseById(Number(courseId));

  if (!course) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
      <PageContainer className="max-w-4xl space-y-6 pb-16 lg:pb-0">
        <CourseLearningRecommendation courseId={course.id} />
        <CourseDetailView course={course} />
      </PageContainer>
    </main>
  );
}
