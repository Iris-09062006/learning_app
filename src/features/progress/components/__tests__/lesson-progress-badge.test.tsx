import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonProgressBadge } from "../lesson-progress-badge";
import type { ProgressStatus } from "@/features/courses/types";

const statuses: ProgressStatus[] = ["locked", "unlocked", "inProgress", "completed"];

describe("LessonProgressBadge", () => {
  it.each(statuses)("renders a badge for status %s", (status) => {
    render(<LessonProgressBadge status={status} />);

    expect(screen.getByTestId("lesson-progress-badge")).toBeInTheDocument();
  });

  it.each([
    ["locked", "Đã khóa"],
    ["unlocked", "Đã mở"],
    ["inProgress", "Đang học"],
    ["completed", "Hoàn thành"],
  ] as const)("renders the label for status %s", (status, label) => {
    render(<LessonProgressBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});