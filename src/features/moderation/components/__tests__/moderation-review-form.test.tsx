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
  title: "BÃ i táº­p gá»‘c",
  description: "MÃ´ táº£ gá»‘c",
  codeSnippet: "let x = 1;",
  options: ["A", "B"],
  correctAnswer: "A",
  explanation: "Giáº£i thÃ­ch Ä‘Ã¡p Ã¡n.",
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

    expect(screen.getByRole("radio", { name: "Duyá»‡t" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Cáº§n chá»‰nh sá»­a" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Tá»« chá»‘i" })).not.toBeChecked();
    expect(screen.getByLabelText("Pháº£n há»“i")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Chá»‰nh sá»­a draft" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gá»­i Ä‘Ã¡nh giÃ¡" }),
    ).toBeInTheDocument();
  });

  it("submits the default approve decision with the exact /reviews payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ reviewId: 1 }));
    const { onSuccess } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Gá»­i Ä‘Ã¡nh giÃ¡" }));

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

    fireEvent.click(screen.getByRole("radio", { name: "Cáº§n chá»‰nh sá»­a" }));
    fireEvent.change(screen.getByLabelText("Pháº£n há»“i"), {
      target: { value: "Cáº§n bá»• sung giáº£i thÃ­ch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gá»­i Ä‘Ã¡nh giÃ¡" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      decision: "needs_revision",
      comment: "Cáº§n bá»• sung giáº£i thÃ­ch",
    });
  });

  it("submits the rejected decision with the exact payload once", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ reviewId: 4 }));
    const { onSuccess } = renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Tá»« chá»‘i" }));
    fireEvent.change(screen.getByLabelText("Pháº£n há»“i"), {
      target: { value: "KhÃ´ng Ä‘Ãºng má»¥c tiÃªu Lesson" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gá»­i Ä‘Ã¡nh giÃ¡" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      decision: "rejected",
      comment: "KhÃ´ng Ä‘Ãºng má»¥c tiÃªu Lesson",
    });
  });

  it("sends the editedDraft payload in the exact draft shape when editing", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ reviewId: 3 }));
    const { onSuccess } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Chá»‰nh sá»­a draft" }));
    fireEvent.change(screen.getByLabelText("TiÃªu Ä‘á»"), {
      target: { value: "TiÃªu Ä‘á» má»›i" },
    });
    fireEvent.change(screen.getByLabelText("MÃ´ táº£"), {
      target: { value: "MÃ´ táº£ má»›i" },
    });
    fireEvent.change(screen.getByLabelText("Loáº¡i bÃ i táº­p"), {
      target: { value: "fix_the_bug" },
    });
    fireEvent.change(screen.getByLabelText("Äá»™ khÃ³"), {
      target: { value: "medium" },
    });
    fireEvent.change(screen.getByLabelText("Code snippet"), {
      target: { value: "const x = 2;" },
    });
    fireEvent.change(
      screen.getByLabelText("CÃ¡c lá»±a chá»n (má»—i dÃ²ng má»™t lá»±a chá»n)"),
      { target: { value: "A\nB\nC" } },
    );
    fireEvent.change(screen.getByLabelText("ÄÃ¡p Ã¡n Ä‘Ãºng"), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByLabelText("Giáº£i thÃ­ch"), {
      target: { value: "Giáº£i thÃ­ch má»›i" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gá»­i Ä‘Ã¡nh giÃ¡" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      decision: "approved",
      editedDraft: {
        title: "TiÃªu Ä‘á» má»›i",
        description: "MÃ´ táº£ má»›i",
        exerciseType: "fix_the_bug",
        difficulty: "medium",
        content: {
          type: "fix_the_bug",
          title: "TiÃªu Ä‘á» má»›i",
          description: "MÃ´ táº£ má»›i",
          codeSnippet: "const x = 2;",
          options: ["A", "B", "C"],
          correctAnswer: "B",
          explanation: "Giáº£i thÃ­ch má»›i",
        },
      },
    });
  });

  it("surfaces server errors as a role=alert message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({ error: "Invalid review payload" }, false, 400),
    );
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Gá»­i Ä‘Ã¡nh giÃ¡" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid review payload");
    expect(alert).toHaveClass("border-danger", "bg-danger-soft");
  });

  it("renders only Stitch tokens with no legacy palette or dark-hardcoded classes", () => {
    const { container } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Chá»‰nh sá»­a draft" }));

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

