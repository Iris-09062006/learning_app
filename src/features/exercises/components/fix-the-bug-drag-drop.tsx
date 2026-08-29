"use client";

import React, { useEffect, useRef, useState } from "react";

import type { ExerciseOption } from "@/features/exercises/types";

interface FixTheBugDragDropProps {
  options: ExerciseOption[];
  value: number | null;
  onChange: (optionId: number | null) => void;
  readOnly?: boolean;
}

export const FixTheBugDragDrop: React.FC<FixTheBugDragDropProps> = ({
  options,
  value,
  onChange,
  readOnly = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  const selectedOption = options.find((option) => option.id === value) ?? null;
  const availableOptions = options.filter((option) => option.id !== value);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current !== null) {
        window.clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  function announce(message: string): void {
    setAnnouncement(message);
    if (announceTimerRef.current !== null) {
      window.clearTimeout(announceTimerRef.current);
    }
    announceTimerRef.current = window.setTimeout(() => setAnnouncement(""), 3000);
  }

  function selectOption(option: ExerciseOption): void {
    if (readOnly) return;
    onChange(option.id);
    announce(`Đã chọn mảnh code “${option.content}” vào vị trí trống.`);
  }

  function clearOption(): void {
    if (readOnly) return;
    if (selectedOption) {
      announce(`Đã gỡ bỏ mảnh code “${selectedOption.content}”. Vị trí trống.`);
    }
    onChange(null);
    optionsRef.current?.focus();
  }

  function focusOptions(): void {
    optionsRef.current?.focus();
  }

  function handleDragStart(
    event: React.DragEvent<HTMLButtonElement>,
    option: ExerciseOption
  ): void {
    if (readOnly) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", String(option.id));
    event.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    announce(`Đang kéo mảnh code “${option.content}”.`);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>): void {
    if (readOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>): void {
    if (readOnly) return;
    event.preventDefault();
    setIsDragOver(false);
    setIsDragging(false);

    const rawId = event.dataTransfer.getData("text/plain");
    const id = Number.parseInt(rawId, 10);
    const option = options.find((candidate) => candidate.id === id);

    if (option) {
      onChange(option.id);
      announce(`Đã bỏ mảnh code “${option.content}” vào vị trí trống.`);
    } else {
      announce("Không thể bỏ mảnh code vào vị trí này.");
    }
  }

  function handleDragEnd(): void {
    setIsDragging(false);
    setIsDragOver(false);
  }

  return (
    <div data-testid="fix-the-bug-drag-drop" data-readonly={readOnly} className="space-y-4">
      {/* Drop zone */}
      <div
        data-testid="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "rounded-xl border-2 border-dashed p-4 transition-colors duration-200",
          isDragOver
            ? "border-primary bg-primary-soft"
            : "border-strong",
        ].join(" ")}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {readOnly ? "Đáp án đã nộp" : "Vị trí trống — kéo mảnh code vào đây"}
        </p>

        {selectedOption ? (
          <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
            <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg bg-code-background px-4 py-3 font-mono text-sm leading-6 text-code-text">
              {selectedOption.content}
            </code>
            {!readOnly ? <button
              type="button"
              onClick={clearOption}
              className="shrink-0 cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-200 hover:border-danger hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Gỡ bỏ
            </button> : null}
          </div>
        ) : (
            <button
              type="button"
              onClick={focusOptions}
              disabled={readOnly}
            className="mt-3 w-full cursor-pointer rounded-lg border border-border bg-surface-subtle px-4 py-4 text-left text-sm text-text-muted transition-colors duration-200 hover:border-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Chọn mảnh code ở bên dưới để điền vào vị trí này
          </button>
        )}
      </div>

      {/* Options list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Các mảnh code
        </p>

        {availableOptions.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-surface-subtle px-4 py-3 text-sm text-text-secondary">
            Đã đặt tất cả mảnh code. Nhấn “Gỡ bỏ” nếu muốn đổi lựa chọn.
          </p>
        ) : (
          <div
            ref={optionsRef}
            tabIndex={-1}
            className={[
              "mt-3 grid rounded-xl gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-2",
              isDragging ? "opacity-60" : "",
            ].join(" ")}
          >
            {availableOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                draggable={!readOnly}
                disabled={readOnly}
                onClick={() => selectOption(option)}
                onDragStart={(event) => handleDragStart(event, option)}
                onDragEnd={handleDragEnd}
                aria-label={`Mảnh code: ${option.content}`}
                className={`min-w-0 rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${readOnly ? "cursor-default" : "cursor-pointer hover:border-primary hover:shadow-md active:cursor-grabbing"}`}
              >
                <code className="block max-w-full overflow-x-auto font-mono text-sm leading-6 text-code-text">
                  {option.content}
                </code>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live announcements for screen readers */}
      <div
        aria-live="polite"
        role="status"
        className="sr-only"
        data-testid="drag-drop-announcer"
      >
        {announcement}
      </div>
    </div>
  );
};
