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
  ExerciseGenerationContext,
  GeneratedExerciseRecord,
} from "@/features/ai/types";

export function ExerciseGenerationForm({ context }: { context: ExerciseGenerationContext }) {
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
          difficulty,
          learningObjective: learningObjective.trim(),
          topicHint: topicHint.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.generatedExercise) {
        throw new Error(body.message || "KhÃ´ng thá»ƒ sinh bÃ i táº­p.");
      }
      setResult(body.generatedExercise);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "KhÃ´ng thá»ƒ sinh bÃ i táº­p.");
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
          â† Chá»n Lesson khÃ¡c
        </Link>
        <PageHeader
          title={`Táº¡o Exercise cho ${context.lessonTitle}`}
          description={`Course: ${context.courseTitle}. AI chá»‰ dÃ¹ng ná»™i dung vÃ  má»¥c tiÃªu cá»§a Lesson Ä‘Ã£ publish nÃ y.`}
        />
      </div>
      {context.learningObjectives.length > 0 && (
        <aside className="rounded-xl border border-info bg-info-soft p-4 text-sm">
          <strong className="text-info">Má»¥c tiÃªu chÃ­nh thá»©c:</strong>
          <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-text-primary">{context.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
        </aside>
      )}
      {error && <p role="alert" className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      {result && <p className="break-words rounded-xl border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success">Draft â€œ{result.title}â€ Ä‘ang chá» moderation. <Link className="font-semibold underline" href={`/moderation/${result.id}`}>Má»Ÿ draft</Link></p>}
      <Card>
        <form onSubmit={submit} className="grid gap-5 p-6 md:grid-cols-2">
          <p className="rounded-lg border border-border bg-surface-subtle p-4 text-sm leading-relaxed text-text-secondary">
            AI sáº½ chá»n Ä‘á»‹nh dáº¡ng phÃ¹ há»£p vá»›i ná»™i dung vÃ  má»¥c tiÃªu Lesson. BÃ i táº­p code chá»‰ Ä‘Æ°á»£c dÃ¹ng khi Lesson thá»±c sá»± dáº¡y láº­p trÃ¬nh hoáº·c suy luáº­n trÃªn code.
          </p>
          <Select
            label="Äá»™ khÃ³"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as DbDifficultyLevel)}
          >
            <option value="easy">Dá»…</option>
            <option value="medium">Trung bÃ¬nh</option>
            <option value="hard">KhÃ³</option>
          </Select>
          <div className="md:col-span-2">
            <Input
              label="Má»¥c tiÃªu há»c táº­p"
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
              label="Gá»£i Ã½ chá»§ Ä‘á» (khÃ´ng báº¯t buá»™c)"
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
            {loading ? "Äang sinh..." : "Sinh Exercise draft"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

