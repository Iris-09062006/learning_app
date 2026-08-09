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
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  ai: "bg-cyan-50 text-cyan-700",
  outline: "border border-slate-200 bg-transparent text-slate-700",
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
