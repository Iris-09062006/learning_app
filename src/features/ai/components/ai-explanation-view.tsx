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
    <div className="mt-4 border-t border-border pt-4">
      {!explanation && !isLoading && (
        <button
          type="button"
          onClick={handleRequestExplanation}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ai bg-ai-soft px-3.5 py-2 text-xs font-semibold text-text-primary shadow-sm transition-all duration-200 hover:border-ai-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
        >
          <span>✨ Hỏi AI Mentor giải thích</span>
        </button>
      )}

      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-xs text-text-secondary"
        >
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-ai border-t-transparent motion-reduce:animate-none" />
          <span>AI Mentor đang suy nghĩ...</span>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-2 max-w-md rounded-lg border border-danger bg-danger-soft px-4 py-3 text-xs text-danger">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRequestExplanation}
            className="mt-1 cursor-pointer text-xs font-semibold underline decoration-current underline-offset-2 hover:opacity-80"
          >
            Thử lại
          </button>
        </div>
      )}

      {explanation && (
        <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-ai bg-ai-soft p-5 text-xs shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-semibold text-text-primary">
            <span>💡 Giải thích từ AI Mentor</span>
            <span className="text-[10px] font-normal text-text-muted">
              Provider: {explanation.provider}
            </span>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-text-secondary">
            {explanation.response}
          </p>
          <p className="mt-3 border-t border-ai pt-3 text-[11px] font-medium text-text-muted">
            Nội dung do AI tạo — có thể chứa sai sót.
          </p>
        </div>
      )}
    </div>
  );
};
