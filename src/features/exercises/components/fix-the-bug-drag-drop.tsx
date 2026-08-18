"use client";

import React, { useEffect, useRef, useState } from "react";

import type { ExerciseOption } from "@/features/exercises/types";

interface FixTheBugDragDropProps {
  options: ExerciseOption[];
  value: number | null;
  onChange: (optionId: number | null) => void;
}

export const FixTheBugDragDrop: React.FC<FixTheBugDragDropProps> = ({
  options,
  value,
  onChange,
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
    onChange(option.id);
    announce(`Đã chọn mảnh code “${option.content}” vào vị trí trống.`);
  }

  function clearOption(): void {
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
    event.dataTransfer.setData("text/plain", String(option.id));
    event.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    announce(`Đang kéo mảnh code “${option.content}”.`);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>): void {
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
    <div data-testid="fix-the-bug-drag-drop" className="space-y-4">
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
          Vị trí trống — kéo mảnh code vào đây
        </p>

        {selectedOption ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <code className="rounded-lg bg-code-background px-4 py-3 font-mono text-sm leading-6 text-code-text">
              {selectedOption.content}
            </code>
            <button
              type="button"
              onClick={clearOption}
              className="shrink-0 cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-200 hover:border-danger hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Gỡ bỏ
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={focusOptions}
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
              "mt-3 grid gap-3 sm:grid-cols-2",
              isDragging ? "opacity-60" : "",
            ].join(" ")}
          >
            {availableOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                draggable
                onClick={() => selectOption(option)}
                onDragStart={(event) => handleDragStart(event, option)}
                onDragEnd={handleDragEnd}
                aria-label={`Mảnh code: ${option.content}`}
                className="cursor-pointer rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing"
              >
                <code className="font-mono text-sm leading-6 text-code-text">
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