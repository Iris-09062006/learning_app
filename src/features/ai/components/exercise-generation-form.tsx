"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  DbDifficultyLevel,
  DbExerciseType,
  ExerciseGenerationContext,
  GeneratedExerciseRecord,
} from "@/features/ai/types";

export function ExerciseGenerationForm({ context }: { context: ExerciseGenerationContext }) {
  const [exerciseType, setExerciseType] = useState<DbExerciseType>("predict_output");
  const [difficulty, setDifficulty] = useState<DbDifficultyLevel>("easy");
  const [learningObjective, setLearningObjective] = useState(context.learningObjectives[0] ?? "");
  const [topicHint, setTopicHint] = useState("");
  const [result, setResult] = useState<GeneratedExerciseRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/ai/exercises/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: context.lessonId,
          exerciseType,
          difficulty,
          learningObjective: learningObjective.trim(),
          topicHint: topicHint.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.generatedExercise) {
        throw new Error(body.message || "Không thể sinh bài tập.");
      }
      setResult(body.generatedExercise);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Không thể sinh bài tập.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <Link
          href="/moderation/lessons"
          className="mb-4 inline-flex items-center text-sm font-semibold text-primary hover:underline"
        >
          ← Chọn Lesson khác
        </Link>
        <PageHeader
          title={`Tạo Exercise cho ${context.lessonTitle}`}
          description={`Course: ${context.courseTitle}. AI chỉ dùng nội dung và mục tiêu của Lesson đã publish này.`}
        />
      </div>
      {context.learningObjectives.length > 0 && (
        <aside className="rounded-xl border border-info bg-info-soft p-4 text-sm">
          <strong className="text-info">Mục tiêu chính thức:</strong>
          <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-text-primary">{context.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
        </aside>
      )}
      {error && <p role="alert" className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      {result && <p className="break-words rounded-xl border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success">Draft “{result.title}” đang chờ moderation. <Link className="font-semibold underline" href={`/moderation/${result.id}`}>Mở draft</Link></p>}
      <Card>
        <form onSubmit={submit} className="grid gap-5 p-6 md:grid-cols-2">
          <Select
            label="Loại bài tập"
            value={exerciseType}
            onChange={(event) => setExerciseType(event.target.value as DbExerciseType)}
          >
            <option value="predict_output">Predict the Output</option>
            <option value="fix_the_bug">Fix the Bug</option>
          </Select>
          <Select
            label="Độ khó"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as DbDifficultyLevel)}
          >
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </Select>
          <div className="md:col-span-2">
            <Input
              label="Mục tiêu học tập"
              list="lesson-objectives"
              maxLength={500}
              required
              value={learningObjective}
              onChange={(event) => setLearningObjective(event.target.value)}
            />
            <datalist id="lesson-objectives">{context.learningObjectives.map((objective) => <option value={objective} key={objective} />)}</datalist>
          </div>
          <div className="md:col-span-2">
            <Input
              label="Gợi ý chủ đề (không bắt buộc)"
              maxLength={500}
              value={topicHint}
              onChange={(event) => setTopicHint(event.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            isLoading={loading}
            disabled={!learningObjective.trim()}
            className="w-fit"
          >
            {loading ? "Đang sinh..." : "Sinh Exercise draft"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
