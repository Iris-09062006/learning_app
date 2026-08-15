import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/shared/utils/cn";

export type BadgeVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "ai"
  | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-subtle text-text-secondary",
  success: "bg-success-soft text-success",
  error: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  ai: "bg-ai-soft text-ai",
  outline: "border border-border bg-transparent text-text-secondary",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
});

Badge.displayName = "Badge";
