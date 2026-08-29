import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DbDifficultyLevel,
  DbExerciseType,
  GeneratedExerciseContent,
} from "@/features/ai/types";
import { ModerationReviewForm } from "../moderation-review-form";

function json(data: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => data } as Response;
}

const content: GeneratedExerciseContent = {
  type: "predict_output",
  title: "Bài tập gốc",
  description: "Mô tả gốc",
  codeSnippet: "let x = 1;",
  options: ["A", "B"],
  correctAnswer: "A",
  explanation: "Giải thích đáp án.",
};

function renderForm(onSuccess = vi.fn()) {
  const result = render(
    <ModerationReviewForm
      exerciseId={7}
      initialTitle={content.title}
      initialDescription={content.description}
      initialExerciseType={"predict_output" as DbExerciseType}
      initialDifficulty={"easy" as DbDifficultyLevel}
      initialContent={content}
      onSuccess={onSuccess}
    />,
  );
  return { container: result.container, onSuccess };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ModerationReviewForm", () => {
  it("renders decision radios, feedback field, edit toggle and submit button", () => {
    renderForm();

    expect(screen.getByRole("radio", { name: "Duyệt" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Cần chỉnh sửa" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Từ chối" })).not.toBeChecked();
    expect(screen.getByLabelText("Phản hồi")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Chỉnh sửa draft" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gửi đánh giá" }),
    ).toBeInTheDocument();
  });

  it("submits the default approve decision with the exact /reviews payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ reviewId: 1 }));
    const { onSuccess } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/moderation/generated-exercises/7/reviews",
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ decision: "approved" });
  });

  it("submits the needs_revision decision with feedback in the comment field", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ reviewId: 2 }));
    const { onSuccess } = renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Cần chỉnh sửa" }));
    fireEvent.change(screen.getByLabelText("Phản hồi"), {
      target: { value: "Cần bổ sung giải thích" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      decision: "needs_revision",
      comment: "Cần bổ sung giải thích",
    });
  });

  it("submits the rejected decision with the exact payload once", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ reviewId: 4 }));
    const { onSuccess } = renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Từ chối" }));
    fireEvent.change(screen.getByLabelText("Phản hồi"), {
      target: { value: "Không đúng mục tiêu Lesson" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      decision: "rejected",
      comment: "Không đúng mục tiêu Lesson",
    });
  });

  it("sends the editedDraft payload in the exact draft shape when editing", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ reviewId: 3 }));
    const { onSuccess } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa draft" }));
    fireEvent.change(screen.getByLabelText("Tiêu đề"), {
      target: { value: "Tiêu đề mới" },
    });
    fireEvent.change(screen.getByLabelText("Mô tả"), {
      target: { value: "Mô tả mới" },
    });
    fireEvent.change(screen.getByLabelText("Loại bài tập"), {
      target: { value: "fix_the_bug" },
    });
    fireEvent.change(screen.getByLabelText("Độ khó"), {
      target: { value: "medium" },
    });
    fireEvent.change(screen.getByLabelText("Code snippet"), {
      target: { value: "const x = 2;" },
    });
    fireEvent.change(
      screen.getByLabelText("Các lựa chọn (mỗi dòng một lựa chọn)"),
      { target: { value: "A\nB\nC" } },
    );
    fireEvent.change(screen.getByLabelText("Đáp án đúng"), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByLabelText("Giải thích"), {
      target: { value: "Giải thích mới" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      decision: "approved",
      editedDraft: {
        title: "Tiêu đề mới",
        description: "Mô tả mới",
        exerciseType: "fix_the_bug",
        difficulty: "medium",
        content: {
          type: "fix_the_bug",
          title: "Tiêu đề mới",
          description: "Mô tả mới",
          codeSnippet: "const x = 2;",
          options: ["A", "B", "C"],
          correctAnswer: "B",
          explanation: "Giải thích mới",
        },
      },
    });
  });

  it("surfaces server errors as a role=alert message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({ error: "Invalid review payload" }, false, 400),
    );
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid review payload");
    expect(alert).toHaveClass("border-danger", "bg-danger-soft");
  });

  it("renders only Stitch tokens with no legacy palette or dark-hardcoded classes", () => {
    const { container } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa draft" }));

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
