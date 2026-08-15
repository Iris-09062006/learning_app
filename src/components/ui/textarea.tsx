import {
  forwardRef,
  useId,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/shared/utils/cn";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      className,
      error,
      helperText,
      id,
      label,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;
    const hasError = Boolean(error);
    const describedBy =
      [
        ariaDescribedBy,
        helperText ? helperId : undefined,
        hasError ? errorId : undefined,
      ]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={textareaId}
            className="mb-2 block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "flex min-h-[6.25rem] w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-text-primary",
            "placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60",
            hasError && "border-danger",
            className,
          )}
          aria-describedby={describedBy}
          aria-invalid={hasError ? true : ariaInvalid}
          {...props}
        />
        {helperText ? (
          <p id={helperId} className="mt-2 text-sm text-text-muted">
            {helperText}
          </p>
        ) : null}
        {hasError ? (
          <p id={errorId} className="mt-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";