import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DbGeneratedExerciseStatus,
  GeneratedExerciseContent,
} from "@/features/ai/types";
import type { ModerationQueueItem, ModerationQueueResult } from "../../types";
import { ModerationQueueView } from "../moderation-queue-view";

function json(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

const content: GeneratedExerciseContent = {
  title: "Bài tập kiểm duyệt 1",
  description: "Mô tả bài tập 1",
  codeSnippet: "let x = 1;",
  options: ["A", "B"],
  correctAnswer: "A",
  explanation: "Giải thích đáp án.",
};

function queueItem(
  id: number,
  status: DbGeneratedExerciseStatus = "pending",
): ModerationQueueItem {
  return {
    id,
    lessonId: 100 + id,
    lessonTitle: `Bài học ${id}`,
    exerciseType: "predict_output",
    difficulty: "easy",
    title: `Bài tập kiểm duyệt ${id}`,
    description: `Mô tả bài tập ${id}`,
    content,
    status,
    provider: "9router",
    model: "gpt-4o",
    requestedBy: "learner@example.com",
    publishedExerciseId: status === "published" ? 900 + id : null,
    publishedAt: status === "published" ? "2026-08-15T00:00:00Z" : null,
    createdAt: "2026-08-10T00:00:00Z",
    updatedAt: "2026-08-10T00:00:00Z",
  };
}

function queueResult(
  items: ModerationQueueItem[],
  total = items.length,
): ModerationQueueResult {
  return { items, total, limit: 10, offset: 0 };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ModerationQueueView", () => {
  it("renders queue items and preserves data and links", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(
        queueResult([
          queueItem(1, "pending"),
          queueItem(2, "approved"),
          queueItem(3, "needs_revision"),
        ]),
      ),
    );
    render(<ModerationQueueView />);

    expect(await screen.findByText("Bài tập kiểm duyệt 1")).toBeInTheDocument();
    expect(screen.getByText("Bài tập kiểm duyệt 2")).toBeInTheDocument();
    expect(screen.getByText("Bài tập kiểm duyệt 3")).toBeInTheDocument();
    expect(screen.getByText("Mô tả bài tập 1")).toBeInTheDocument();
    expect(screen.getByText("Bài học 1")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Hàng đợi kiểm duyệt bài tập",
      }),
    ).toBeInTheDocument();

    const createLink = screen.getByRole("link", { name: "Tạo Exercise" });
    expect(createLink).toHaveAttribute("href", "/moderation/lessons");
    expect(createLink).toHaveClass("bg-primary", "text-on-primary", "rounded-lg");

    expect(
      screen
        .getAllByRole("link", { name: "Xem & duyệt" })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/moderation/1", "/moderation/2", "/moderation/3"]);
  });

  it("maps status chips to semantic B-family token pairs", async () => {
    const unexpected = "unexpected" as DbGeneratedExerciseStatus;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(
        queueResult([
          queueItem(1, "pending"),
          queueItem(2, "approved"),
          queueItem(3, "needs_revision"),
          queueItem(4, "rejected"),
          queueItem(5, "published"),
          { ...queueItem(6), status: unexpected },
        ]),
      ),
    );
    render(<ModerationQueueView />);

    expect(
      await screen.findByText("Chờ duyệt", { selector: "span" }),
    ).toHaveClass("bg-warning-soft", "text-warning");
    expect(screen.getByText("Đã duyệt", { selector: "span" })).toHaveClass(
      "bg-success-soft",
      "text-success",
    );
    expect(
      screen.getByText("Cần chỉnh sửa", { selector: "span" }),
    ).toHaveClass("bg-info-soft", "text-info");
    expect(screen.getByText("Từ chối", { selector: "span" })).toHaveClass(
      "bg-danger-soft",
      "text-danger",
    );
    expect(screen.getByText("Đã xuất bản", { selector: "span" })).toHaveClass(
      "bg-primary-soft",
      "text-primary",
    );
    expect(screen.getByText("Khác", { selector: "span" })).toHaveClass(
      "bg-surface-subtle",
      "text-text-secondary",
    );
  });

  it("refetches with the selected status and resets to page 1", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json(queueResult([queueItem(1, "pending")])));

    render(<ModerationQueueView />);

    await screen.findByText("Bài tập kiểm duyệt 1");
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/moderation/generated-exercises?status=pending&page=1&limit=10",
    );

    fireEvent.change(screen.getByLabelText("Trạng thái:"), {
      target: { value: "approved" },
    });

    await waitFor(() =>
      expect(String(fetchMock.mock.calls[1][0])).toContain(
        "/api/moderation/generated-exercises?status=approved&page=1&limit=10",
      ),
    );
  });

  it("pages through the queue and disables boundary buttons", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json(queueResult([queueItem(1, "pending")], 25)));

    render(<ModerationQueueView />);

    await screen.findByText("Bài tập kiểm duyệt 1");

    const previous = screen.getByRole("button", { name: "Trước" });
    const next = screen.getByRole("button", { name: "Sau" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    await waitFor(() =>
      expect(String(fetchMock.mock.calls[1][0])).toContain(
        "/api/moderation/generated-exercises?status=pending&page=2&limit=10",
      ),
    );
    expect(screen.getByText("Trang 2 / 3 (25 mục)")).toBeInTheDocument();

    fireEvent.click(next);
    await waitFor(() =>
      expect(String(fetchMock.mock.calls[2][0])).toContain(
        "/api/moderation/generated-exercises?status=pending&page=3&limit=10",
      ),
    );
    expect(screen.getByText("Trang 3 / 3 (25 mục)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sau" })).toBeDisabled();
  });

  it("shows the loading state then surfaces fetch errors as an alert", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network down"),
    );
    render(<ModerationQueueView />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Đang tải danh sách...")).toBeInTheDocument();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Lỗi tải danh sách");
    expect(alert).toHaveTextContent("Network down");
    expect(alert).toHaveClass("border-danger", "bg-danger-soft");
  });

  it("shows the permission error message for a 403 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      { ok: false, status: 403, json: async () => ({}) } as Response,
    );
    render(<ModerationQueueView />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Bạn không có quyền truy cập. Cần quyền người duyệt.",
    );
  });

  it("renders the empty state when nothing matches the filter", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(queueResult([], 0)));
    render(<ModerationQueueView />);

    const emptyState = await screen.findByRole("status");
    expect(emptyState).toHaveTextContent(
      "Không có bài tập nào khớp với bộ lọc hiện tại.",
    );
    expect(emptyState).toHaveAttribute("data-state", "empty");
  });

  it("renders with the shared Stitch tokens and no legacy or dark-hardcoded palette", async () => {
    const unexpected = "unexpected" as DbGeneratedExerciseStatus;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(
        queueResult([
          queueItem(1, "pending"),
          queueItem(2, "approved"),
          queueItem(3, "rejected"),
          queueItem(4, "needs_revision"),
          queueItem(5, "published"),
          { ...queueItem(6), status: unexpected },
        ]),
      ),
    );
    const { container } = render(<ModerationQueueView />);

    expect(await screen.findAllByText(/Bài tập kiểm duyệt/u)).toHaveLength(6);

    for (const element of Array.from(
      container.querySelectorAll<HTMLElement>("*"),
    )) {
      const className = element.getAttribute("class") ?? "";
      for (const legacy of [
        "slate-",
        "indigo-",
        "violet-",
        "emerald-",
        "amber-",
        "blue-",
        "red-",
        "dark:",
      ]) {
        expect(className).not.toContain(legacy);
      }
      expect(className).not.toMatch(/\/\d+$/u);
    }
  });
});
