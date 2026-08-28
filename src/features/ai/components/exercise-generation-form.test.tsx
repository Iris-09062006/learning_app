import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExerciseGenerationForm } from "./exercise-generation-form";

const baseContext = {
  lessonId: 51,
  lessonTitle: "Biáº¿n",
  lessonSummary: "Giá»›i thiá»‡u phÃ©p gÃ¡n vÃ  biáº¿n.",
  lessonContent: "x = 1",
  learningObjectives: ["Hiá»ƒu phÃ©p gÃ¡n", "Váº­n dá»¥ng biáº¿n"],
  courseTitle: "Python cÆ¡ báº£n",
  courseDescription: null,
};

type CapturedFetch = { url: string; method?: string; body: Record<string, unknown> };

function captureFetch(responses: Response[]) {
  const calls: CapturedFetch[] = [];
  const mock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method,
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return responses[Math.min(calls.length, responses.length) - 1];
  });
  return { mock, calls };
}

function pendingFetch() {
  let resolveFetch!: (value: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    resolveFetch = resolve;
  });
  const mock = vi.spyOn(globalThis, "fetch").mockImplementation(() => promise);
  return { mock, promise, resolveFetch };
}

const generatedExercise = (id: number) =>
  new Response(
    JSON.stringify({ generatedExercise: { id, lessonId: 51, title: "Dá»± Ä‘oÃ¡n", status: "pending" } }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExerciseGenerationForm", () => {
  it("renders subject-aware generation guidance, difficulty, and the Lesson datalist", () => {
    render(<ExerciseGenerationForm context={baseContext} />);

    expect(screen.queryByLabelText("Loáº¡i bÃ i táº­p")).not.toBeInTheDocument();
    expect(screen.getByText(/AI sáº½ chá»n Ä‘á»‹nh dáº¡ng phÃ¹ há»£p/u)).toBeInTheDocument();

    const difficultySelect = screen.getByLabelText("Äá»™ khÃ³");
    expect(difficultySelect).toHaveValue("easy");
    expect(within(difficultySelect).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Dá»…",
      "Trung bÃ¬nh",
      "KhÃ³",
    ]);

    const objectiveInput = screen.getByLabelText("Má»¥c tiÃªu há»c táº­p");
    expect(objectiveInput).toHaveValue("Hiá»ƒu phÃ©p gÃ¡n");
    expect(objectiveInput).toHaveAttribute("maxlength", "500");
    expect(objectiveInput).toHaveAttribute("required");
    expect(objectiveInput).toHaveAttribute("list", "lesson-objectives");

    const topicInput = screen.getByLabelText("Gá»£i Ã½ chá»§ Ä‘á» (khÃ´ng báº¯t buá»™c)");
    expect(topicInput).toHaveValue("");
    expect(topicInput).toHaveAttribute("maxlength", "500");

    const datalist = document.getElementById("lesson-objectives");
    expect(Array.from(datalist?.querySelectorAll("option") ?? []).map((option) => option.getAttribute("value"))).toEqual(
      baseContext.learningObjectives,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Táº¡o Exercise cho Biáº¿n");
    expect(screen.getByRole("link", { name: "â† Chá»n Lesson khÃ¡c" })).toHaveAttribute("href", "/moderation/lessons");

    const objectivesAside = screen.getByRole("complementary");
    expect(within(objectivesAside).getByText("Má»¥c tiÃªu chÃ­nh thá»©c:")).toBeInTheDocument();
    for (const objective of baseContext.learningObjectives) {
      expect(within(objectivesAside).getByText(objective)).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "Sinh Exercise draft" })).toHaveAttribute("type", "submit");
    expect(screen.queryByLabelText("Lesson")).not.toBeInTheDocument();
  });

  it("keeps native validation: the required objective gates submit and inputs stay capped at 500 chars", () => {
    render(<ExerciseGenerationForm context={{ ...baseContext, learningObjectives: [] }} />);

    const objectiveInput = screen.getByLabelText("Má»¥c tiÃªu há»c táº­p");
    const submitButton = screen.getByRole("button", { name: "Sinh Exercise draft" });

    expect(objectiveInput).toHaveValue("");
    expect(submitButton).toBeDisabled();

    fireEvent.change(objectiveInput, { target: { value: "   " } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(objectiveInput, { target: { value: "Hiá»ƒu phÃ©p gÃ¡n" } });
    expect(submitButton).toBeEnabled();
    expect(objectiveInput).toHaveAttribute("required");
    expect(objectiveInput).toHaveAttribute("maxlength", "500");
    expect(screen.getByLabelText("Gá»£i Ã½ chá»§ Ä‘á» (khÃ´ng báº¯t buá»™c)")).toHaveAttribute("maxlength", "500");
  });

  it("posts the exact fixed payload once to the existing endpoint and blocks duplicate submits while pending", async () => {
    const { mock, promise, resolveFetch } = pendingFetch();
    const calls: CapturedFetch[] = [];
    mock.mockImplementationOnce(async (input, init) => {
      calls.push({
        url: String(input),
        method: init?.method,
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return promise;
    });

    render(<ExerciseGenerationForm context={baseContext} />);
    const submitButton = screen.getByRole("button", { name: "Sinh Exercise draft" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/ai/exercises/generate");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toEqual({
      lessonId: 51,
      difficulty: "easy",
      learningObjective: "Hiá»ƒu phÃ©p gÃ¡n",
    });

    await act(async () => {
      resolveFetch(generatedExercise(88));
    });
    expect(await screen.findByRole("link", { name: "Má»Ÿ draft" })).toHaveAttribute("href", "/moderation/88");
    expect(calls).toHaveLength(1);
  });

  it("keeps the pending state disabled and busy with the loading label, then restores submit", async () => {
    const { resolveFetch } = pendingFetch();

    render(<ExerciseGenerationForm context={baseContext} />);
    const submitButton = screen.getByRole("button", { name: "Sinh Exercise draft" });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Äang sinh...")).toBeInTheDocument();

    await act(async () => {
      resolveFetch(generatedExercise(1));
    });
    expect(await screen.findByRole("link", { name: "Má»Ÿ draft" })).toHaveAttribute("href", "/moderation/1");
    expect(screen.queryByText("Äang sinh...")).not.toBeInTheDocument();
    expect(submitButton).toBeEnabled();
  });

  it("surfaces the API error with role=alert and allows retry with the identical payload", async () => {
    const { calls } = captureFetch([
      new Response(JSON.stringify({ message: "Háº¿t giá»›i háº¡n sinh." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
      generatedExercise(77),
    ]);

    render(<ExerciseGenerationForm context={baseContext} />);
    const submitButton = screen.getByRole("button", { name: "Sinh Exercise draft" });
    fireEvent.click(submitButton);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Háº¿t giá»›i háº¡n sinh.");
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);
    expect(await screen.findByRole("link", { name: "Má»Ÿ draft" })).toHaveAttribute("href", "/moderation/77");

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(calls[1]);
    expect(calls[0].body).toEqual({
      lessonId: 51,
      difficulty: "easy",
      learningObjective: "Hiá»ƒu phÃ©p gÃ¡n",
    });
  });

  it("trims and conditionally includes the topic hint in the request body", async () => {
    const { calls } = captureFetch([generatedExercise(90)]);

    render(<ExerciseGenerationForm context={baseContext} />);
    fireEvent.change(screen.getByLabelText("Gá»£i Ã½ chá»§ Ä‘á» (khÃ´ng báº¯t buá»™c)"), {
      target: { value: "  vÃ²ng láº·p for  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sinh Exercise draft" }));

    expect(await screen.findByRole("link", { name: "Má»Ÿ draft" })).toHaveAttribute("href", "/moderation/90");
    expect(calls[0].body).toEqual({
      lessonId: 51,
      difficulty: "easy",
      learningObjective: "Hiá»ƒu phÃ©p gÃ¡n",
      topicHint: "vÃ²ng láº·p for",
    });
  });

  it("links the generated draft to its moderation review", async () => {
    captureFetch([generatedExercise(88)]);

    render(<ExerciseGenerationForm context={baseContext} />);
    fireEvent.click(screen.getByRole("button", { name: "Sinh Exercise draft" }));

    const draftLink = await screen.findByRole("link", { name: "Má»Ÿ draft" });
    expect(draftLink).toHaveAttribute("href", "/moderation/88");
    const resultPanel = screen.getByText(/Ä‘ang chá» moderation/u).closest("p");
    expect(resultPanel).toHaveTextContent("Draft â€œDá»± Ä‘oÃ¡nâ€ Ä‘ang chá» moderation.");
  });

  it("renders with the shared Stitch tokens and no legacy or dark-hardcoded palette", () => {
    const { container } = render(<ExerciseGenerationForm context={baseContext} />);

    const submitButton = screen.getByRole("button", { name: "Sinh Exercise draft" });
    expect(submitButton).toHaveClass("bg-primary", "text-on-primary", "rounded-xl");
    expect(screen.getByRole("link", { name: "â† Chá»n Lesson khÃ¡c" })).toHaveClass("text-primary");

    const form = container.querySelector("form");
    expect(form).toHaveClass("grid", "gap-5", "p-6", "md:grid-cols-2");
    const formCard = form?.parentElement;
    expect(formCard).toHaveClass("rounded-2xl", "border", "border-border", "bg-surface");

    for (const select of screen.getAllByRole("combobox")) {
      expect(select).toHaveClass("border-border", "bg-surface", "rounded-xl");
    }
    for (const input of screen.getAllByRole("textbox")) {
      expect(input).toHaveClass("border-border", "bg-surface", "rounded-xl");
    }

    const objectivesAside = screen.getByRole("complementary");
    expect(objectivesAside).toHaveClass("rounded-xl", "border-info", "bg-info-soft");
    expect(within(objectivesAside).getByText("Má»¥c tiÃªu chÃ­nh thá»©c:")).toHaveClass("text-info");

    for (const element of Array.from(container.querySelectorAll("*"))) {
      const className = element.getAttribute("class") ?? "";
      for (const legacy of ["slate-", "indigo-", "violet-", "emerald-", "red-", "blue-", "dark:"]) {
        expect(className).not.toContain(legacy);
      }
      expect(className).not.toMatch(/\/\d+$/u);
    }
  });

  it("does not expose a manual exercise-type selector", () => {
    const { container } = render(<ExerciseGenerationForm context={baseContext} />);

    const selects = Array.from(container.querySelectorAll("select"));
    expect(selects).toHaveLength(1);
    expect(screen.getByLabelText("Äá»™ khÃ³")).toBe(selects[0]);
    expect(screen.queryByLabelText("Loáº¡i bÃ i táº­p")).not.toBeInTheDocument();

    const inputs = Array.from(container.querySelectorAll("input"));
    expect(inputs).toHaveLength(2);
    expect(screen.getByLabelText("Má»¥c tiÃªu há»c táº­p")).toBe(inputs[0]);
    expect(screen.getByLabelText("Gá»£i Ã½ chá»§ Ä‘á» (khÃ´ng báº¯t buá»™c)")).toBe(inputs[1]);

    expect(container.querySelector("textarea")).toBeNull();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByLabelText(/nhiá»‡t Ä‘á»™|temperature|model|sá»‘ lÆ°á»£ng cÃ¢u|difficulty/i)).not.toBeInTheDocument();
  });
});

