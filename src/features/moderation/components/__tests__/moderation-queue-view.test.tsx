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
  type: "predict_output",
  title: "BÃ i táº­p kiá»ƒm duyá»‡t 1",
  description: "MÃ´ táº£ bÃ i táº­p 1",
  codeSnippet: "let x = 1;",
  options: ["A", "B"],
  correctAnswer: "A",
  explanation: "Giáº£i thÃ­ch Ä‘Ã¡p Ã¡n.",
};

function queueItem(
  id: number,
  status: DbGeneratedExerciseStatus = "pending",
): ModerationQueueItem {
  return {
    id,
    lessonId: 100 + id,
    lessonTitle: `BÃ i há»c ${id}`,
    exerciseType: "predict_output",
    difficulty: "easy",
    title: `BÃ i táº­p kiá»ƒm duyá»‡t ${id}`,
    description: `MÃ´ táº£ bÃ i táº­p ${id}`,
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

    expect(await screen.findByText("BÃ i táº­p kiá»ƒm duyá»‡t 1")).toBeInTheDocument();
    expect(screen.getByText("BÃ i táº­p kiá»ƒm duyá»‡t 2")).toBeInTheDocument();
    expect(screen.getByText("BÃ i táº­p kiá»ƒm duyá»‡t 3")).toBeInTheDocument();
    expect(screen.getByText("MÃ´ táº£ bÃ i táº­p 1")).toBeInTheDocument();
    expect(screen.getByText("BÃ i há»c 1")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "HÃ ng Ä‘á»£i kiá»ƒm duyá»‡t bÃ i táº­p",
      }),
    ).toBeInTheDocument();

    const createLink = screen.getByRole("link", { name: "Táº¡o Exercise" });
    expect(createLink).toHaveAttribute("href", "/moderation/lessons");
    expect(createLink).toHaveClass("bg-primary", "text-on-primary", "rounded-lg");

    expect(
      screen
        .getAllByRole("link", { name: "Xem & duyá»‡t" })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/moderation/1", "/moderation/2", "/moderation/3"]);
  });

  it("truncates long queue-card titles without discarding the accessible value", async () => {
    const title = "BÃ iTáº­pKiá»ƒmDuyá»‡tKhÃ´ngCÃ³Äiá»ƒmNgáº¯t".repeat(8);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(queueResult([{ ...queueItem(1), title, description: title }])),
    );
    render(<ModerationQueueView />);

    const heading = await screen.findByRole("heading", { level: 3, name: title });
    expect(heading).toHaveClass("min-w-0", "flex-1", "truncate");
    expect(heading).toHaveAttribute("title", title);
    expect(screen.getByText(title, { selector: "p" })).toHaveClass(
      "line-clamp-2",
      "break-words",
    );
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
      await screen.findByText("Chá» duyá»‡t", { selector: "span" }),
    ).toHaveClass("bg-warning-soft", "text-warning");
    expect(screen.getByText("ÄÃ£ duyá»‡t", { selector: "span" })).toHaveClass(
      "bg-success-soft",
      "text-success",
    );
    expect(
      screen.getByText("Cáº§n chá»‰nh sá»­a", { selector: "span" }),
    ).toHaveClass("bg-info-soft", "text-info");
    expect(screen.getByText("Tá»« chá»‘i", { selector: "span" })).toHaveClass(
      "bg-danger-soft",
      "text-danger",
    );
    expect(screen.getByText("ÄÃ£ xuáº¥t báº£n", { selector: "span" })).toHaveClass(
      "bg-primary-soft",
      "text-primary",
    );
    expect(screen.getByText("KhÃ¡c", { selector: "span" })).toHaveClass(
      "bg-surface-subtle",
      "text-text-secondary",
    );
  });

  it("refetches with the selected status and resets to page 1", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json(queueResult([queueItem(1, "pending")])));

    render(<ModerationQueueView />);

    await screen.findByText("BÃ i táº­p kiá»ƒm duyá»‡t 1");
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/moderation/generated-exercises?status=pending&page=1&limit=10",
    );

    fireEvent.change(screen.getByLabelText("Tráº¡ng thÃ¡i:"), {
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

    await screen.findByText("BÃ i táº­p kiá»ƒm duyá»‡t 1");

    const previous = screen.getByRole("button", { name: "TrÆ°á»›c" });
    const next = screen.getByRole("button", { name: "Sau" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    await waitFor(() =>
      expect(String(fetchMock.mock.calls[1][0])).toContain(
        "/api/moderation/generated-exercises?status=pending&page=2&limit=10",
      ),
    );
    expect(screen.getByText("Trang 2 / 3 (25 má»¥c)")).toBeInTheDocument();

    fireEvent.click(next);
    await waitFor(() =>
      expect(String(fetchMock.mock.calls[2][0])).toContain(
        "/api/moderation/generated-exercises?status=pending&page=3&limit=10",
      ),
    );
    expect(screen.getByText("Trang 3 / 3 (25 má»¥c)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sau" })).toBeDisabled();
  });

  it("shows the loading state then surfaces fetch errors as an alert", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network down"),
    );
    render(<ModerationQueueView />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Äang táº£i danh sÃ¡ch...")).toBeInTheDocument();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Lá»—i táº£i danh sÃ¡ch");
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
      "Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p. Cáº§n quyá»n ngÆ°á»i duyá»‡t.",
    );
  });

  it("renders the empty state when nothing matches the filter", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(queueResult([], 0)));
    render(<ModerationQueueView />);

    const emptyState = await screen.findByRole("status");
    expect(emptyState).toHaveTextContent(
      "KhÃ´ng cÃ³ bÃ i táº­p nÃ o khá»›p vá»›i bá»™ lá»c hiá»‡n táº¡i.",
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

    expect(await screen.findAllByText(/BÃ i táº­p kiá»ƒm duyá»‡t/u)).toHaveLength(6);

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

