"use client";

import React, { useState } from "react";

import type { AiExplanationRecord } from "@/features/ai/types";

interface AiExplanationViewProps {
  submissionId: number;
}

interface RequestEnvelope {
  success: boolean;
  data?: {
    explanation: AiExplanationRecord;
  };
  error?: { message?: string; code?: string };
}

export const AiExplanationView: React.FC<AiExplanationViewProps> = ({
  submissionId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] =
    useState<AiExplanationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestExplanation() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/explanations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });

      const payload = (await response.json()) as RequestEnvelope;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error?.message || "Không thể tải giải thích AI."
        );
      }

      if (payload.data) {
        setExplanation(payload.data.explanation);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Không thể tải giải thích AI."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      {!explanation && !isLoading && (
        <button
          type="button"
          onClick={handleRequestExplanation}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition-all duration-200 hover:bg-indigo-100 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transition-none dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
        >
          <span>✨ Hỏi AI Mentor giải thích</span>
        </button>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <span>AI Mentor đang suy nghĩ...</span>
        </div>
      )}

      {error && (
        <div className="mt-2 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRequestExplanation}
            className="mt-1 cursor-pointer text-xs font-semibold underline decoration-red-300 underline-offset-2 hover:text-red-800 dark:decoration-red-700 dark:hover:text-red-200"
          >
            Thử lại
          </button>
        </div>
      )}

      {explanation && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 text-xs text-slate-700 shadow-sm transition-all duration-200 hover:shadow-indigo-100/40 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-slate-200">
          <div className="mb-2 flex items-center justify-between font-semibold text-indigo-900 dark:text-indigo-300">
            <span>💡 Giải thích từ AI Mentor</span>
            <span className="text-[10px] text-slate-400">
              Provider: {explanation.provider}
            </span>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">
            {explanation.response}
          </p>
        </div>
      )}
    </div>
  );
};