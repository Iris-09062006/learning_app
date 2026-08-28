"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  DbDifficultyLevel,
  DbExerciseType,
  GeneratedExerciseContent,
} from "@/features/ai/types";
import type { ReviewStatus } from "@/features/moderation/types";

interface ModerationReviewFormProps {
  exerciseId: number;
  initialTitle: string;
  initialDescription: string;
  initialExerciseType: DbExerciseType;
  initialDifficulty: DbDifficultyLevel;
  initialContent: GeneratedExerciseContent;
  onSuccess: () => void | Promise<void>;
}

const decisionOptions: Array<{ value: ReviewStatus; label: string }> = [
  { value: "approved", label: "Duyá»‡t" },
  { value: "needs_revision", label: "Cáº§n chá»‰nh sá»­a" },
  { value: "rejected", label: "Tá»« chá»‘i" },
];

const typeOptions: Array<{ value: DbExerciseType; label: string }> = [
  { value: "multiple_choice", label: "Tráº¯c nghiá»‡m" },
  { value: "true_false", label: "ÄÃºng / sai" },
  { value: "short_answer", label: "Tráº£ lá»i ngáº¯n" },
  { value: "ordering", label: "Sáº¯p xáº¿p" },
  { value: "matching", label: "GhÃ©p cáº·p" },
  { value: "scenario", label: "TÃ¬nh huá»‘ng" },
  { value: "predict_output", label: "ÄoÃ¡n káº¿t quáº£ code" },
  { value: "fix_the_bug", label: "Sá»­a lá»—i code" },
];

const difficultyOptions: Array<{ value: DbDifficultyLevel; label: string }> = [
  { value: "easy", label: "Dá»…" },
  { value: "medium", label: "Trung bÃ¬nh" },
  { value: "hard", label: "KhÃ³" },
];

function lines(value: string): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export function ModerationReviewForm(props: ModerationReviewFormProps) {
  const initial = props.initialContent;
  const [status, setStatus] = useState<ReviewStatus>("approved");
  const [feedback, setFeedback] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(props.initialTitle);
  const [description, setDescription] = useState(props.initialDescription);
  const [exerciseType, setExerciseType] = useState(props.initialExerciseType);
  const [difficulty, setDifficulty] = useState(props.initialDifficulty);
  const [explanation, setExplanation] = useState(initial.explanation);
  const [codeSnippet, setCodeSnippet] = useState("codeSnippet" in initial ? initial.codeSnippet : "");
  const [optionsText, setOptionsText] = useState("options" in initial ? initial.options.join("\n") : "");
  const [correctAnswer, setCorrectAnswer] = useState(
    "correctAnswer" in initial && typeof initial.correctAnswer === "string" ? initial.correctAnswer : ""
  );
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(
    initial.type === "true_false" ? String(initial.correctAnswer) : "true"
  );
  const [expectedAnswer, setExpectedAnswer] = useState(initial.type === "short_answer" ? initial.expectedAnswer : "");
  const [itemsText, setItemsText] = useState(initial.type === "ordering" ? initial.items.join("\n") : "");
  const [correctOrderText, setCorrectOrderText] = useState(initial.type === "ordering" ? initial.correctOrder.join("\n") : "");
  const [pairsText, setPairsText] = useState(initial.type === "matching" ? initial.pairs.map((pair) => `${pair.prompt} => ${pair.answer}`).join("\n") : "");
  const [scenario, setScenario] = useState(initial.type === "scenario" ? initial.scenario : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildContent(): GeneratedExerciseContent {
    const common = { title: title.trim(), description: description.trim(), explanation: explanation.trim() };
    if (exerciseType === "true_false") return { type: exerciseType, ...common, correctAnswer: trueFalseAnswer === "true" };
    if (exerciseType === "short_answer") return { type: exerciseType, ...common, expectedAnswer: expectedAnswer.trim() };
    if (exerciseType === "ordering") return { type: exerciseType, ...common, items: lines(itemsText), correctOrder: lines(correctOrderText) };
    if (exerciseType === "matching") {
      return {
        type: exerciseType,
        ...common,
        pairs: lines(pairsText).map((pair) => {
          const separator = pair.indexOf("=>");
          return separator < 0
            ? { prompt: pair, answer: "" }
            : { prompt: pair.slice(0, separator).trim(), answer: pair.slice(separator + 2).trim() };
        }),
      };
    }
    if (exerciseType === "scenario") return { type: exerciseType, ...common, scenario: scenario.trim(), options: lines(optionsText), correctAnswer: correctAnswer.trim() };
    if (exerciseType === "predict_output" || exerciseType === "fix_the_bug") {
      return { type: exerciseType, ...common, codeSnippet: codeSnippet.trim(), options: lines(optionsText), correctAnswer: correctAnswer.trim() };
    }
    return { type: "multiple_choice", ...common, options: lines(optionsText), correctAnswer: correctAnswer.trim() };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        status,
        feedback: feedback.trim() || undefined,
        ...(isEditing ? {
          editedDraft: {
            title: title.trim(),
            description: description.trim(),
            exerciseType,
            difficulty,
            content: buildContent(),
          },
        } : {}),
      };
      const response = await fetch(`/api/moderation/generated-exercises/${props.exerciseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: payload.status, comment: payload.feedback, editedDraft: payload.editedDraft }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "KhÃ´ng thá»ƒ gá»­i Ä‘Ã¡nh giÃ¡");
      }
      await props.onSuccess();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "ÄÃ£ xáº£y ra lá»—i");
    } finally {
      setLoading(false);
    }
  }

  const hasChoiceFields = ["multiple_choice", "scenario", "predict_output", "fix_the_bug"].includes(exerciseType);
  const isCoding = exerciseType === "predict_output" || exerciseType === "fix_the_bug";

  return (
    <form onSubmit={handleSubmit} className="min-w-0 rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Kiá»ƒm duyá»‡t bÃ i táº­p</h2>
        <p className="mt-1 text-sm text-text-muted">CÃ³ thá»ƒ chá»‰nh toÃ n bá»™ draft trÆ°á»›c khi Ä‘Æ°a ra quyáº¿t Ä‘á»‹nh.</p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-danger bg-danger-soft p-3 text-sm font-medium text-danger">{error}</p>}
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-text-primary">Quyáº¿t Ä‘á»‹nh</legend>
        <div className="flex flex-wrap gap-4">
          {decisionOptions.map((option) => (
            <label key={option.value} className="flex min-h-11 items-center gap-2 text-sm text-text-secondary">
              <input type="radio" name="status" className="size-4 accent-primary" checked={status === option.value} onChange={() => setStatus(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4"><Textarea id="feedback" label="Pháº£n há»“i" name="feedback" maxLength={2000} rows={3} value={feedback} onChange={(event) => setFeedback(event.target.value)} /></div>
      <div className="mt-4"><Button type="button" variant="outline" onClick={() => setIsEditing((value) => !value)}>{isEditing ? "Há»§y chá»‰nh sá»­a" : "Chá»‰nh sá»­a draft"}</Button></div>

      {isEditing && (
        <div className="mt-4 min-w-0 space-y-4 rounded-xl border border-border bg-surface-subtle p-4">
          <Input id="edit-title" label="TiÃªu Ä‘á»" maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea id="edit-description" label="MÃ´ táº£" maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Select id="edit-exercise-type" label="Loáº¡i bÃ i táº­p" value={exerciseType} onChange={(event) => setExerciseType(event.target.value as DbExerciseType)}>
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Select id="edit-difficulty" label="Äá»™ khÃ³" value={difficulty} onChange={(event) => setDifficulty(event.target.value as DbDifficultyLevel)}>
              {difficultyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
          {isCoding && <Textarea id="edit-code-snippet" label="Code snippet" maxLength={10000} rows={7} className="font-mono" value={codeSnippet} onChange={(event) => setCodeSnippet(event.target.value)} />}
          {exerciseType === "scenario" && <Textarea id="edit-scenario" label="TÃ¬nh huá»‘ng" maxLength={4000} rows={5} value={scenario} onChange={(event) => setScenario(event.target.value)} />}
          {hasChoiceFields && <Textarea id="edit-options" label="CÃ¡c lá»±a chá»n (má»—i dÃ²ng má»™t lá»±a chá»n)" rows={5} value={optionsText} onChange={(event) => setOptionsText(event.target.value)} />}
          {hasChoiceFields && <Input id="edit-correct-answer" label="ÄÃ¡p Ã¡n Ä‘Ãºng" value={correctAnswer} onChange={(event) => setCorrectAnswer(event.target.value)} />}
          {exerciseType === "true_false" && (
            <Select id="edit-true-false-answer" label="ÄÃ¡p Ã¡n Ä‘Ãºng" value={trueFalseAnswer} onChange={(event) => setTrueFalseAnswer(event.target.value)}>
              <option value="true">ÄÃºng</option><option value="false">Sai</option>
            </Select>
          )}
          {exerciseType === "short_answer" && <Textarea id="edit-expected-answer" label="ÄÃ¡p Ã¡n mong Ä‘á»£i" maxLength={1000} rows={3} value={expectedAnswer} onChange={(event) => setExpectedAnswer(event.target.value)} />}
          {exerciseType === "ordering" && <><Textarea id="edit-order-items" label="CÃ¡c má»¥c (má»—i dÃ²ng má»™t má»¥c)" rows={5} value={itemsText} onChange={(event) => setItemsText(event.target.value)} /><Textarea id="edit-correct-order" label="Thá»© tá»± Ä‘Ãºng (má»—i dÃ²ng má»™t má»¥c)" rows={5} value={correctOrderText} onChange={(event) => setCorrectOrderText(event.target.value)} /></>}
          {exerciseType === "matching" && <Textarea id="edit-matching-pairs" label="CÃ¡c cáº·p (má»—i dÃ²ng: váº¿ trÃ¡i => váº¿ pháº£i)" rows={6} value={pairsText} onChange={(event) => setPairsText(event.target.value)} />}
          <Textarea id="edit-explanation" label="Giáº£i thÃ­ch" maxLength={5000} rows={4} value={explanation} onChange={(event) => setExplanation(event.target.value)} />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-3 border-t border-border pt-4"><Button type="submit" variant="primary" isLoading={loading}>{loading ? "Äang gá»­i..." : "Gá»­i Ä‘Ã¡nh giÃ¡"}</Button></div>
    </form>
  );
}

