import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CourseRoadmapView } from "@/features/courses/components/course-roadmap-view";
import {
  getCourseRoadmap,
  ServiceError,
} from "@/features/courses/services/course-service";

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
    return { title: "Không tìm thấy lộ trình | Python Learning Platform" };
  }

  try {
    const roadmap = await getCourseRoadmap(numId);
    return {
      title: `Lộ trình: ${roadmap.course.title} | Python Learning Platform`,
      description: `Chi tiết lộ trình học cho khóa học ${roadmap.course.title}`,
    };
  } catch {
    return {
      title: "Lộ trình học | Python Learning Platform",
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
    const roadmap = await getCourseRoadmap(numId);

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <CourseRoadmapView roadmap={roadmap} />
        </div>
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