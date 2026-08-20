"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { AdminCourseSummary } from "@/features/admin/types";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}
export function CourseManagementView({ initialCourses }: { initialCourses: AdminCourseSummary[] }) {
  const [courses, setCourses] = useState(initialCourses);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function deleteCourse(course: AdminCourseSummary) {
    const confirmed = window.confirm(
      `Xóa khóa học “${course.title}”? Khóa học sẽ bị ẩn và ngừng xuất bản; lịch sử học tập vẫn được giữ lại.`,
    );
    if (!confirmed) return;

    setDeletingId(course.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });
      const body = await response.json() as ApiResponse<unknown>;
      if (!response.ok || !body.success) {
        setMessage({ kind: "error", text: body.error?.message ?? "Không thể xóa khóa học." });
        return;
      }
      setCourses((current) => current.filter((item) => item.id !== course.id));
      setMessage({ kind: "success", text: "Đã xóa khóa học khỏi hệ thống và ghi audit log." });
    } catch {
      setMessage({ kind: "error", text: "Không thể kết nối tới máy chủ." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Xóa khóa học sẽ gỡ khóa học khỏi catalog và ngừng xuất bản toàn bộ nội dung. Tiến độ và bài nộp của học viên không bị xóa.
      </p>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600"}>
          {message.text}
        </p>
      ) : null}
      <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[48rem] table-fixed divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
          <caption className="sr-only">Danh sách khóa học có thể quản lý</caption>
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr><th scope="col" className="px-4 py-3">Khóa học</th><th scope="col" className="px-4 py-3">Trạng thái</th><th scope="col" className="px-4 py-3">Ngày tạo</th><th scope="col" className="px-4 py-3">Thao tác</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="px-4 py-4"><p className="break-words font-semibold text-slate-900 dark:text-white">{course.title}</p><p className="break-all text-xs text-slate-500">/{course.slug}</p></td>
                <td className="px-4 py-4">{course.isPublished ? "Đã xuất bản" : "Bản nháp"}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{new Intl.DateTimeFormat("vi-VN").format(new Date(course.createdAt))}</td>
                <td className="px-4 py-4"><Button size="sm" variant="danger" isLoading={deletingId === course.id} onClick={() => void deleteCourse(course)}>Xóa khóa học</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 ? <p className="p-8 text-center text-slate-500">Không còn khóa học nào để quản lý.</p> : null}
      </div>
    </div>
  );
}
