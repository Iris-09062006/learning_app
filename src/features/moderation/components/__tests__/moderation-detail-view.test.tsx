import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DbGeneratedExerciseStatus } from "@/features/ai/types";
import type { ModerationQueueItem } from "../../types";
import { ModerationDetailView } from "../moderation-detail-view";

function json(data: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => data } as Response;
}

function queueItem(
  id: number,
  status: DbGeneratedExerciseStatus = "pending",
): ModerationQueueItem {
  return {
    id,
    lessonId: 101,
    lessonTitle: "Bài học mẫu",
    exerciseType: "predict_output",
    difficulty: "easy",
    title: `Bài tập kiểm duyệt ${id}`,
    description: `Mô tả bài tập ${id}`,
    content: {
      title: `Bài tập kiểm duyệt ${id}`,
      description: `Mô tả bài tập ${id}`,
      codeSnippet: "let x = 1;",
      options: ["A", "B"],
      correctAnswer: "A",
      explanation: "Giải thích đáp án.",
    },
    status,
    provider: "9router",
    model: "gpt-4o",
    requestedBy: "moderator@example.com",
    publishedExerciseId: status === "published" ? 4001 : null,
    publishedAt: status === "published" ? "2026-08-15T00:00:00Z" : null,
    createdAt: "2026-08-10T00:00:00Z",
    updatedAt: "2026-08-10T00:00:00Z",
    reviews:
      status === "approved" || status === "rejected"
        ? [
            {
              id: 1,
              generatedExerciseId: id,
              reviewerId: "00000000-0000-4000-8000-000000000002",
              status: status === "approved" ? "approved" : "rejected",
              feedback: "Nội dung phù hợp.",
              createdAt: "2026-08-11T00:00:00Z",
            },
          ]
        : [],
  };
}

function mockDetail(
  fixture: ModerationQueueItem,
  publishData?: unknown,
  publishOk = true,
  publishStatus = 200,
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (...args) => {
    const init = args[1];
    if (init?.method === "POST") {
      return json(
        publishData ?? {
          generatedExerciseId: fixture.id,
          publishedExerciseId: 4001,
          status: "published",
          publishedAt: "2026-08-15T00:00:00Z",
        },
        publishOk,
        publishStatus,
      );
    }
    return json(fixture);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ModerationDetailView", () => {
  it("renders item data, status chip, JSON payload and the review form", async () => {
    mockDetail(queueItem(5, "pending"));
    render(<ModerationDetailView id={5} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Bài tập kiểm duyệt 5" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mô tả bài tập 5")).toBeInTheDocument();
    expect(screen.getByText("predict output")).toBeInTheDocument();
    expect(screen.getByText("easy")).toBeInTheDocument();
    expect(screen.getByText("9router (gpt-4o)")).toBeInTheDocument();
    expect(screen.getByText(/ID: #5 \| Bài học: Bài học mẫu/u)).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /Quay lại hàng đợi kiểm duyệt/u });
    expect(backLink).toHaveAttribute("href", "/moderation");
    expect(backLink).toHaveClass("text-primary");

    const chip = screen.getByText("pending");
    expect(chip).toHaveClass("bg-warning-soft", "text-warning");
    expect(
      screen.queryByRole("button", { name: "Publish to Production" }),
    ).not.toBeInTheDocument();

    const payload = screen.getByText(
      (content) => content.includes('"codeSnippet"'),
      { selector: "pre" },
    );
    expect(payload.textContent).toContain("let x = 1;");
    expect(
      screen.getByRole("heading", { name: "Kiểm duyệt bài tập" }),
    ).toBeInTheDocument();
  });

  it("publishes an approved item and shows the success state while re-fetching", async () => {
    const fetchMock = mockDetail(queueItem(6, "approved"));
    render(<ModerationDetailView id={6} />);

    const publishButton = await screen.findByRole("button", {
      name: "Publish to Production",
    });
    expect(publishButton).toHaveClass("bg-primary", "text-on-primary");

    fireEvent.click(publishButton);

    expect(
      await screen.findByText(
        "Exercise successfully published! Created exercise #4001",
      ),
    ).toBeInTheDocument();

    const publishCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    expect(String(publishCall?.[0])).toContain(
      "/api/moderation/generated-exercises/6/publish",
    );
    const getCalls = fetchMock.mock.calls.filter(
      ([, init]) => !(init as RequestInit)?.method,
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("surfaces publish failures as an alert", async () => {
    mockDetail(queueItem(6, "approved"), { error: "DRAFT_NOT_APPROVED" }, false, 400);
    render(<ModerationDetailView id={6} />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Publish to Production" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("DRAFT_NOT_APPROVED");
    expect(alert).toHaveClass("border-danger", "bg-danger-soft", "text-danger");
  });
it("renders the error state as an alert for a missing item", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      json({ error: "Not Found" }, false, 404),
    );
    render(<ModerationDetailView id={999} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Lỗi");
    expect(alert).toHaveTextContent("Bài tập không tồn tại");
    expect(alert).toHaveClass("border-danger", "bg-danger-soft");
    expect(
      screen.getByRole("link", { name: /Quay lại hàng đợi kiểm duyệt/u }),
    ).toHaveAttribute("href", "/moderation");
  });

  it("renders the review history with token surfaces", async () => {
    mockDetail(queueItem(8, "rejected"));
    render(<ModerationDetailView id={8} />);

    expect(
      await screen.findByRole("heading", { name: "Lịch sử kiểm duyệt" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nội dung phù hợp.")).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByText("rejected").length).toBeGreaterThanOrEqual(1);
  });

  it("renders only Stitch tokens with no legacy palette or dark-hardcoded classes", async () => {
    mockDetail(queueItem(6, "approved"));
    const { container } = render(<ModerationDetailView id={6} />);

    await screen.findByRole("button", { name: "Publish to Production" });

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
        "red-",
        "dark:",
      ]) {
        expect(className).not.toContain(legacy);
      }
      expect(className).not.toMatch(/\/\d+$/u);
    }
  });
});