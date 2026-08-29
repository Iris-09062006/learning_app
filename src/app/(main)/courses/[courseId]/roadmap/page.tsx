import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { createProductTitle } from "@/config/product";
import { CourseRoadmapView } from "@/features/courses/components/course-roadmap-view";
import {
  getCourseRoadmap,
  ServiceError,
} from "@/features/courses/services/course-service";

const getCachedCourseRoadmap = cache(getCourseRoadmap);

interface CourseRoadmapPageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CourseRoadmapPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const numId = Number(courseId);
  if (!Number.isInteger(numId) || numId < 1) {
    return { title: createProductTitle("Không tìm thấy lộ trình") };
  }

  try {
    const roadmap = await getCachedCourseRoadmap(numId);
    return {
      title: createProductTitle(`Lộ trình: ${roadmap.course.title}`),
      description: `Chi tiết lộ trình học cho khóa học ${roadmap.course.title}`,
    };
  } catch {
    return {
      title: createProductTitle("Lộ trình học"),
    };
  }
}

export default async function CourseRoadmapPage({
  params,
}: CourseRoadmapPageProps) {
  const { courseId } = await params;
  const numId = Number(courseId);

  if (!Number.isInteger(numId) || numId < 1) {
    notFound();
  }

  try {
    const roadmap = await getCachedCourseRoadmap(numId);

    return (
      <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
        <PageContainer className="max-w-4xl space-y-6 pb-16 lg:pb-0">
          <CourseRoadmapView roadmap={roadmap} />
        </PageContainer>
      </main>
    );
  } catch (error: unknown) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") {
        notFound();
      }
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login");
      }
      if (error.code === "COURSE_NOT_ENROLLED") {
        redirect(`/courses/${numId}`);
      }
    }
    throw error;
  }
}
