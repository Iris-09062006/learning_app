"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AiExplanationView } from "@/features/ai/components/ai-explanation-view";
import { FixTheBugDragDrop } from "@/features/exercises/components/fix-the-bug-drag-drop";
import type {
  GetExerciseResponse,
  SubmitExerciseResponse,
} from "@/features/exercises/types";

interface ExerciseViewProps {
  exercise: GetExerciseResponse;
}

interface SubmitEnvelope {
  success: boolean;
  data?: SubmitExerciseResponse;
  error?: { message?: string; code?: string };
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({ exercise }) => {
  const router = useRouter();
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitExerciseResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    if (isSubmitting || selectedOptionId === null) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch(`/api/exercises/${exercise.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: { selectedOptionId },
        }),
      });

      const payload = (await response.json()) as SubmitEnvelope;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Không thể nộp bài tập.");
      }

      if (!payload.data) {
        throw new Error("Phản hồi không hợp lệ.");
      }

      setResult(payload.data);
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể nộp bài tập."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div data-testid="exercise-view" className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-on-primary-container">
            Bài tập {exercise.order}
          </span>
          <span className="text-xs capitalize text-text-muted">
            {exercise.type} &bull; {exercise.difficulty}
          </span>
        </div>

        <h1 className="mt-3 text-xl font-bold text-text-primary">
          {exercise.title}
        </h1>

        {exercise.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {exercise.description}
          </p>
        )}

        {exercise.codeSnippet && (
          <pre className="mt-4 overflow-x-auto rounded-xl bg-code-background p-5 font-mono text-sm leading-7 text-code-text">
            <code>{exercise.codeSnippet}</code>
          </pre>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Chọn đáp án
        </h2>

        {exercise.type === "fix_the_bug" ? (
          <div className="mt-4">
            <FixTheBugDragDrop
              options={exercise.options}
              value={selectedOptionId}
              onChange={setSelectedOptionId}
            />
          </div>
        ) : (
        <div className="mt-4 space-y-3">
          {exercise.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedOptionId(option.id)}
                aria-pressed={isSelected}
                className={[
                  "flex w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected
                    ? "border-primary bg-primary-soft shadow-sm"
                    : "border-border bg-surface hover:border-primary hover:bg-primary-soft",
                ].join(" ")}
              >
                <span className="text-sm text-text-primary">
                  {option.content}
                </span>
                <span
                  className={[
                    "ml-3 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-outline-variant",
                  ].join(" ")}
                >
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-on-primary" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        )}

        <div className="mt-6 flex flex-col items-start gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedOptionId === null}
          >
            {isSubmitting
              ? "Đang nộp..."
              : result
                ? "Nộp lại"
                : "Nộp bài"}
          </Button>

          {errorMessage && (
            <p
              role="alert"
              className="max-w-md rounded-lg border border-danger bg-danger-soft px-4 py-3 text-xs text-danger"
            >
              {errorMessage}
            </p>
          )}

          {result && (
            <div
              role="status"
              className={[
                "w-full rounded-xl border p-5 text-sm shadow-sm",
                result.isCorrect
                  ? "border-success bg-success-soft text-success"
                  : "border-danger bg-danger-soft text-danger",
              ].join(" ")}
            >
              <p className="font-semibold">
                {result.isCorrect ? "Chính xác!" : "Chưa chính xác"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{result.feedback}</p>
              {!result.isCorrect ? (
                <AiExplanationView submissionId={result.submissionId} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
