"use client";

import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";

interface CoursesErrorProps {
  reset: () => void;
}

export default function CoursesError({ reset }: CoursesErrorProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <StatePanel
        variant="error"
        title="Không thể tải danh sách khóa học"
        className="mx-auto max-w-3xl"
        action={<Button onClick={reset}>Thử lại</Button>}
      >
        Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.
      </StatePanel>
    </main>
  );
}
