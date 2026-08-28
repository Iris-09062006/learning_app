"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AiExplanationView } from "@/features/ai/components/ai-explanation-view";
import { FixTheBugDragDrop } from "@/features/exercises/components/fix-the-bug-drag-drop";
import type { GetExerciseResponse, SubmitExerciseRequest, SubmitExerciseResponse } from "@/features/exercises/types";

interface ExerciseViewProps { exercise: GetExerciseResponse }
interface SubmitEnvelope { success: boolean; data?: SubmitExerciseResponse; error?: { message?: string; code?: string } }

const choiceTypes = new Set(["multiple_choice", "true_false", "scenario", "predict_output", "fix_the_bug"]);

function typeLabel(type: GetExerciseResponse["type"]): string {
  return ({
    multiple_choice: "Tráº¯c nghiá»‡m", true_false: "ÄÃºng / sai", short_answer: "Tráº£ lá»i ngáº¯n",
    ordering: "Sáº¯p xáº¿p", matching: "GhÃ©p cáº·p", scenario: "TÃ¬nh huá»‘ng",
    predict_output: "ÄoÃ¡n káº¿t quáº£ code", fix_the_bug: "Sá»­a lá»—i code",
  } satisfies Record<GetExerciseResponse["type"], string>)[type];
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({ exercise }) => {
  const router = useRouter();
  const options = "options" in exercise ? exercise.options : [];
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [orderedOptionIds, setOrderedOptionIds] = useState(() => options.map((option) => option.id));
  const [matches, setMatches] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitExerciseResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "KhÃ´ng thá»ƒ ná»™p bÃ i táº­p.");
      if (!payload.data) throw new Error("Pháº£n há»“i khÃ´ng há»£p lá»‡.");
      setResult(payload.data); router.refresh();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ ná»™p bÃ i táº­p.");
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
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-on-primary-container">BÃ i táº­p {exercise.order}</span>
          <span className="text-xs text-text-muted">{typeLabel(exercise.type)} &bull; {exercise.difficulty}</span>
        </div>
        <h1 className="mt-3 break-words text-xl font-bold text-text-primary">{exercise.title}</h1>
        {exercise.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">{exercise.description}</p>}
        {(exercise.type === "predict_output" || exercise.type === "fix_the_bug") && exercise.codeSnippet && (
          <pre className="mt-4 max-w-full overflow-x-auto rounded-xl bg-code-background p-5 font-mono text-sm leading-7 text-code-text"><code>{exercise.codeSnippet}</code></pre>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {exercise.type === "short_answer" ? "Nháº­p cÃ¢u tráº£ lá»i" : exercise.type === "ordering" ? "Sáº¯p xáº¿p theo thá»© tá»± Ä‘Ãºng" : exercise.type === "matching" ? "GhÃ©p tá»«ng má»¥c" : "Chá»n Ä‘Ã¡p Ã¡n"}
        </h2>
        {exercise.type === "fix_the_bug" ? (
          <div className="mt-4"><FixTheBugDragDrop options={options} value={selectedOptionId} onChange={setSelectedOptionId} /></div>
        ) : choiceTypes.has(exercise.type) ? (
          <div className="mt-4 space-y-3">
            {options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              return <button key={option.id} type="button" onClick={() => setSelectedOptionId(option.id)} aria-pressed={isSelected} className={["flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", isSelected ? "border-primary bg-primary-soft shadow-sm" : "border-border bg-surface hover:border-primary hover:bg-primary-soft"].join(" ")}>
                <span className="min-w-0 break-words text-sm text-text-primary">{option.content}</span>
                <span aria-hidden="true" className={["ml-3 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", isSelected ? "border-primary bg-primary" : "border-outline-variant"].join(" ")}>{isSelected && <span className="h-2 w-2 rounded-full bg-on-primary" />}</span>
              </button>;
            })}
          </div>
        ) : exercise.type === "short_answer" ? (
          <div className="mt-4"><Input id="short-answer" label="CÃ¢u tráº£ lá»i" maxLength={1000} value={answerText} onChange={(event) => setAnswerText(event.target.value)} /></div>
        ) : exercise.type === "ordering" ? (
          <ol className="mt-4 space-y-3">
            {orderedOptions.map((option, index) => <li key={option.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-text-muted">{index + 1}</span><span className="min-w-0 flex-1 break-words text-sm text-text-primary">{option.content}</span>
              <Button type="button" size="sm" variant="outline" aria-label={`ÄÆ°a ${option.content} lÃªn`} disabled={index === 0} onClick={() => moveOrderingItem(index, -1)}>â†‘</Button>
              <Button type="button" size="sm" variant="outline" aria-label={`ÄÆ°a ${option.content} xuá»‘ng`} disabled={index === orderedOptions.length - 1} onClick={() => moveOrderingItem(index, 1)}>â†“</Button>
            </li>)}
          </ol>
        ) : (
          <div className="mt-4 space-y-4">
            {options.map((option) => <Select key={option.id} id={`match-${option.id}`} label={option.content} value={matches[option.id] ?? ""} onChange={(event) => setMatches((current) => ({ ...current, [option.id]: event.target.value }))}>
              <option value="">Chá»n váº¿ phÃ¹ há»£p</option>{matchingAnswers.map((answer) => <option key={answer} value={answer}>{answer}</option>)}
            </Select>)}
          </div>
        )}

        <div className="mt-6 flex flex-col items-start gap-3">
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>{isSubmitting ? "Äang ná»™p..." : result ? "Ná»™p láº¡i" : "Ná»™p bÃ i"}</Button>
          {errorMessage && <p role="alert" className="max-w-md rounded-lg border border-danger bg-danger-soft px-4 py-3 text-xs text-danger">{errorMessage}</p>}
          {result && <div role="status" className={["w-full rounded-xl border p-5 text-sm shadow-sm", result.isCorrect ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"].join(" ")}>
            <p className="font-semibold">{result.isCorrect ? "ChÃ­nh xÃ¡c!" : "ChÆ°a chÃ­nh xÃ¡c"}</p><p className="mt-1 whitespace-pre-wrap break-words">{result.feedback}</p>{!result.isCorrect ? <AiExplanationView submissionId={result.submissionId} /> : null}
          </div>}
        </div>
      </div>
    </div>
  );
};

