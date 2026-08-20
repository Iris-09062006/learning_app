"use client";

import { useState } from "react";
import type {
  DbDifficultyLevel,
  DbExerciseType,
  GeneratedExerciseContent,
} from "@/features/ai/types";
import type { ReviewStatus, SubmitReviewInput } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ModerationReviewFormProps {
  exerciseId: number;
  initialTitle: string;
  initialDescription: string;
  initialExerciseType: DbExerciseType;
  initialDifficulty: DbDifficultyLevel;
  initialContent: GeneratedExerciseContent;
  onSuccess: () => void;
}

const decisionOptions: Array<{ value: ReviewStatus; label: string }> = [
  { value: "approved", label: "Duyệt" },
  { value: "needs_revision", label: "Cần chỉnh sửa" },
  { value: "rejected", label: "Từ chối" },
];

const typeOptions: Array<{ value: DbExerciseType; label: string }> = [
  { value: "predict_output", label: "Predict output" },
  { value: "fix_the_bug", label: "Fix the bug" },
];

const difficultyOptions: Array<{ value: DbDifficultyLevel; label: string }> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function ModerationReviewForm(props: ModerationReviewFormProps) {
  const [status, setStatus] = useState<ReviewStatus>("approved");
  const [feedback, setFeedback] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(props.initialTitle);
  const [description, setDescription] = useState(props.initialDescription);
  const [exerciseType, setExerciseType] = useState(props.initialExerciseType);
  const [difficulty, setDifficulty] = useState(props.initialDifficulty);
  const [codeSnippet, setCodeSnippet] = useState(props.initialContent.codeSnippet);
  const [optionsText, setOptionsText] = useState(props.initialContent.options.join("\n"));
  const [correctAnswer, setCorrectAnswer] = useState(props.initialContent.correctAnswer);
  const [explanation, setExplanation] = useState(props.initialContent.explanation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: SubmitReviewInput = {
        generatedExerciseId: props.exerciseId,
        status,
        feedback: feedback.trim() || undefined,
        ...(isEditing ? {
          editedDraft: {
            title: title.trim(),
            description: description.trim(),
            exerciseType,
            difficulty,
            content: {
              title: title.trim(),
              description: description.trim(),
              codeSnippet,
              options: optionsText.split("\n").map((option) => option.trim()).filter(Boolean),
              correctAnswer: correctAnswer.trim(),
              explanation: explanation.trim(),
            },
          },
        } : {}),
      };

      const response = await fetch(`/api/moderation/generated-exercises/${props.exerciseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: payload.status,
          comment: payload.feedback,
          editedDraft: payload.editedDraft,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Không thể gửi đánh giá");
      }
      props.onSuccess();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Kiểm duyệt bài tập</h2>
        <p className="mt-1 text-sm text-text-muted">
          Có thể chỉnh toàn bộ draft trước khi đưa ra quyết định.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger bg-danger-soft p-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-text-primary">
          Quyết định
        </legend>
        <div className="flex flex-wrap gap-4">
          {decisionOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm text-text-secondary"
            >
              <input
                type="radio"
                name="status"
                className="size-4 accent-primary"
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <Textarea
          id="feedback"
          label="Phản hồi"
          name="feedback"
          maxLength={2000}
          rows={3}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
        />
      </div>

      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsEditing((value) => !value)}
        >
          {isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa draft"}
        </Button>
      </div>

      {isEditing && (
        <div className="mt-4 min-w-0 space-y-4 rounded-xl border border-border bg-surface-subtle p-4">
          <Input
            id="edit-title"
            label="Tiêu đề"
            maxLength={150}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            id="edit-description"
            label="Mô tả"
            maxLength={2000}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Select
              id="edit-exercise-type"
              label="Loại bài tập"
              value={exerciseType}
              onChange={(event) =>
                setExerciseType(event.target.value as DbExerciseType)
              }
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              id="edit-difficulty"
              label="Độ khó"
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as DbDifficultyLevel)
              }
            >
              {difficultyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            id="edit-code-snippet"
            label="Code snippet"
            maxLength={10000}
            rows={7}
            className="font-mono"
            value={codeSnippet}
            onChange={(event) => setCodeSnippet(event.target.value)}
          />
          <Textarea
            id="edit-options"
            label="Các lựa chọn (mỗi dòng một lựa chọn)"
            rows={5}
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
          />
          <Input
            id="edit-correct-answer"
            label="Đáp án đúng"
            value={correctAnswer}
            onChange={(event) => setCorrectAnswer(event.target.value)}
          />
          <Textarea
            id="edit-explanation"
            label="Giải thích"
            maxLength={5000}
            rows={4}
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
          />
        </div>
      )}

      <div className="mt-4 flex justify-end gap-3 border-t border-border pt-4">
        <Button type="submit" variant="primary" isLoading={loading}>
          {loading ? "Đang gửi..." : "Gửi đánh giá"}
        </Button>
      </div>
    </form>
  );
}
