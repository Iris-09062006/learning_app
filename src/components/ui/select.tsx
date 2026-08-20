import {
  forwardRef,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import { cn } from "@/shared/utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
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
  const selectId = id ?? generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
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
          htmlFor={selectId}
          className="mb-2 block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "flex h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface px-3 pr-9 text-sm text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60",
            hasError && "border-danger",
            className,
          )}
          aria-describedby={describedBy}
          aria-invalid={hasError ? true : ariaInvalid}
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-muted"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path
              fillRule="evenodd"
              d="M5.49 7.51a.76.76 0 0 1 1.07 0L10 10.94l3.44-3.43a.76.76 0 1 1 1.07 1.07l-3.97 3.98a.76.76 0 0 1-1.08 0l-3.96-3.98a.76.76 0 0 1 0-1.07Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
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

Select.displayName = "Select";