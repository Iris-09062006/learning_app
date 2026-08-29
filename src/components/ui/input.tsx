import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
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
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);
  const describedBy = [
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
          htmlFor={inputId}
          className="mb-2 block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-text-primary transition-colors duration-200",
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
});

Input.displayName = "Input";
