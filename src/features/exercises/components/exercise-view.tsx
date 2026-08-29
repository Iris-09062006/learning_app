"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AiExplanationView } from "@/features/ai/components/ai-explanation-view";
import { FixTheBugDragDrop } from "@/features/exercises/components/fix-the-bug-drag-drop";
import type { ExerciseReviewSubmission, GetExerciseResponse, SubmitExerciseRequest, SubmitExerciseResponse } from "@/features/exercises/types";

interface ExerciseViewProps {
  exercise: GetExerciseResponse;
  reviewSubmission?: ExerciseReviewSubmission | null;
}
interface SubmitEnvelope { success: boolean; data?: SubmitExerciseResponse; error?: { message?: string; code?: string } }

const choiceTypes = new Set(["multiple_choice", "true_false", "scenario", "predict_output", "fix_the_bug"]);

function typeLabel(type: GetExerciseResponse["type"]): string {
  return ({
    multiple_choice: "Trắc nghiệm", true_false: "Đúng / sai", short_answer: "Trả lời ngắn",
    ordering: "Sắp xếp", matching: "Ghép cặp", scenario: "Tình huống",
    predict_output: "Đoán kết quả code", fix_the_bug: "Sửa lỗi code",
  } satisfies Record<GetExerciseResponse["type"], string>)[type];
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({ exercise, reviewSubmission = null }) => {
  const router = useRouter();
  const options = "options" in exercise ? exercise.options : [];
  const persistedAnswer = reviewSubmission?.answer;
  const persistedSelectedOptionId = typeof persistedAnswer?.selectedOptionId === "number"
    ? persistedAnswer.selectedOptionId
    : null;
  const persistedAnswerText = typeof persistedAnswer?.answerText === "string"
    ? persistedAnswer.answerText
    : "";
  const persistedOrder = Array.isArray(persistedAnswer?.orderedOptionIds)
    ? persistedAnswer.orderedOptionIds.filter((id): id is number => typeof id === "number")
    : [];
  const persistedMatches = Array.isArray(persistedAnswer?.matches)
    ? persistedAnswer.matches.reduce<Record<number, string>>((result, entry) => {
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          const candidate = entry as Record<string, unknown>;
          if (typeof candidate.optionId === "number" && typeof candidate.answer === "string") {
            result[candidate.optionId] = candidate.answer;
          }
        }
        return result;
      }, {})
    : {};
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(persistedSelectedOptionId);
  const [answerText, setAnswerText] = useState(persistedAnswerText);
  const [orderedOptionIds, setOrderedOptionIds] = useState(() => persistedOrder.length > 0 ? persistedOrder : options.map((option) => option.id));
  const [matches, setMatches] = useState<Record<number, string>>(persistedMatches);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitExerciseResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isReviewMode = reviewSubmission !== null;
  const isCompleted = isReviewMode || result?.isCorrect === true;

  const matchingAnswers = Array.from(new Set(options.flatMap((option) => {
    const value = option.metadata?.answerOptions;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  })));
  const canSubmit = choiceTypes.has(exercise.type)
    ? selectedOptionId !== null
    : exercise.type === "short_answer"
      ? Boolean(answerText.trim())
      : exercise.type === "ordering"
        ? orderedOptionIds.length === options.length && orderedOptionIds.length >= 2
        : exercise.type === "matching" && options.length >= 2 && options.every((option) => Boolean(matches[option.id]));

  function buildAnswer(): SubmitExerciseRequest["answer"] {
    if (choiceTypes.has(exercise.type)) return { selectedOptionId: selectedOptionId as number };
    if (exercise.type === "short_answer") return { answerText: answerText.trim() };
    if (exercise.type === "ordering") return { orderedOptionIds };
    return { matches: options.map((option) => ({ optionId: option.id, answer: matches[option.id] })) };
  }

  async function handleSubmit(): Promise<void> {
    if (isSubmitting || !canSubmit) return;
    setIsSubmitting(true); setErrorMessage(null); setResult(null);
    try {
      const response = await fetch(`/api/exercises/${exercise.id}/submissions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: buildAnswer() }),
      });
      const payload = (await response.json()) as SubmitEnvelope;
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "Không thể nộp bài tập.");
      if (!payload.data) throw new Error("Phản hồi không hợp lệ.");
      setResult(payload.data); router.refresh();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể nộp bài tập.");
    } finally { setIsSubmitting(false); }
  }

  function moveOrderingItem(index: number, offset: -1 | 1) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= orderedOptionIds.length) return;
    setOrderedOptionIds((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  const orderedOptions = orderedOptionIds.map((id) => options.find((option) => option.id === id)).filter((option): option is typeof options[number] => Boolean(option));

  return (
    <div data-testid="exercise-view" className="min-w-0 space-y-6">
      <nav aria-label="Điều hướng bài tập">
        <Link
          href={`/lessons/${exercise.lessonId}`}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-text-secondary transition hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden="true">←</span>
          Quay lại bài học
        </Link>
      </nav>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-on-primary-container">Bài tập {exercise.order}</span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isReviewMode ? <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">Xem lại · Chỉ đọc</span> : null}
            <span className="text-xs text-text-muted">{typeLabel(exercise.type)} &bull; {exercise.difficulty}</span>
          </div>
        </div>
        <h1 className="mt-3 break-words text-xl font-bold text-text-primary">{exercise.title}</h1>
        {exercise.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">{exercise.description}</p>}
        {(exercise.type === "predict_output" || exercise.type === "fix_the_bug") && exercise.codeSnippet && (
          <pre className="mt-4 max-w-full overflow-x-auto rounded-xl bg-code-background p-5 font-mono text-sm leading-7 text-code-text"><code>{exercise.codeSnippet}</code></pre>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {exercise.type === "short_answer" ? "Nhập câu trả lời" : exercise.type === "ordering" ? "Sắp xếp theo thứ tự đúng" : exercise.type === "matching" ? "Ghép từng mục" : "Chọn đáp án"}
        </h2>
        {exercise.type === "fix_the_bug" ? (
          <div className="mt-4"><FixTheBugDragDrop options={options} value={selectedOptionId} onChange={setSelectedOptionId} readOnly={isCompleted} /></div>
        ) : choiceTypes.has(exercise.type) ? (
          <div className="mt-4 space-y-3">
            {options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              return <button key={option.id} type="button" disabled={isCompleted} onClick={() => setSelectedOptionId(option.id)} aria-pressed={isSelected} className={["flex min-h-11 w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", isCompleted ? "cursor-default" : "cursor-pointer", isSelected ? "border-primary bg-primary-soft shadow-sm" : isCompleted ? "border-border bg-surface" : "border-border bg-surface hover:border-primary hover:bg-primary-soft"].join(" ")}>
                <span className="min-w-0 break-words text-sm text-text-primary">{option.content}</span>
                <span aria-hidden="true" className={["ml-3 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", isSelected ? "border-primary bg-primary" : "border-outline-variant"].join(" ")}>{isSelected && <span className="h-2 w-2 rounded-full bg-on-primary" />}</span>
              </button>;
            })}
          </div>
        ) : exercise.type === "short_answer" ? (
          <div className="mt-4"><Input id="short-answer" label="Câu trả lời" maxLength={1000} value={answerText} readOnly={isCompleted} className={isCompleted ? "cursor-default bg-surface-subtle" : undefined} onChange={(event) => setAnswerText(event.target.value)} /></div>
        ) : exercise.type === "ordering" ? (
          <ol className="mt-4 space-y-3">
            {orderedOptions.map((option, index) => <li key={option.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-text-muted">{index + 1}</span><span className="min-w-0 flex-1 break-words text-sm text-text-primary">{option.content}</span>
              <Button type="button" size="sm" variant="outline" aria-label={`Đưa ${option.content} lên`} disabled={isCompleted || index === 0} onClick={() => moveOrderingItem(index, -1)}>↑</Button>
              <Button type="button" size="sm" variant="outline" aria-label={`Đưa ${option.content} xuống`} disabled={isCompleted || index === orderedOptions.length - 1} onClick={() => moveOrderingItem(index, 1)}>↓</Button>
            </li>)}
          </ol>
        ) : (
          <div className="mt-4 space-y-4">
            {options.map((option) => <Select key={option.id} id={`match-${option.id}`} label={option.content} value={matches[option.id] ?? ""} disabled={isCompleted} className={isCompleted ? "cursor-default disabled:opacity-100" : undefined} onChange={(event) => setMatches((current) => ({ ...current, [option.id]: event.target.value }))}>
              <option value="">Chọn vế phù hợp</option>{matchingAnswers.map((answer) => <option key={answer} value={answer}>{answer}</option>)}
            </Select>)}
          </div>
        )}

        <div className="mt-6 flex flex-col items-start gap-3">
          {!isCompleted ? <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>{isSubmitting ? "Đang nộp..." : result ? "Nộp lại" : "Nộp bài"}</Button> : null}
          {errorMessage && <p role="alert" className="max-w-md rounded-lg border border-danger bg-danger-soft px-4 py-3 text-xs text-danger">{errorMessage}</p>}
          {isCompleted ? <div role="status" data-testid="exercise-completed-state" className="w-full rounded-xl border border-success bg-success-soft p-5 text-sm text-success shadow-sm">
            <p className="flex items-center gap-2 text-base font-bold">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0">
                <path d="m5 12 4 4L19 6" />
              </svg>
              Hoàn thành
            </p>
            {(reviewSubmission?.feedback || result?.feedback) ? <p className="mt-2 whitespace-pre-wrap break-words text-text-primary">{reviewSubmission?.feedback ?? result?.feedback}</p> : null}
            <Link href={`/lessons/${exercise.lessonId}`} prefetch={false} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <span aria-hidden="true" className="mr-2">←</span> Quay lại bài học
            </Link>
          </div> : result ? <div role="status" className="w-full rounded-xl border border-danger bg-danger-soft p-5 text-sm text-danger shadow-sm">
            <p className="font-semibold">Chưa chính xác</p><p className="mt-1 whitespace-pre-wrap break-words">{result.feedback}</p><AiExplanationView submissionId={result.submissionId} />
          </div> : null}
        </div>
      </div>
    </div>
  );
};
