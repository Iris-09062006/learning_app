import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

export type StatePanelVariant = "loading" | "empty" | "error";

interface StatePanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  variant: StatePanelVariant;
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

const variantClasses: Record<StatePanelVariant, string> = {
  loading: "border-border bg-surface text-text-secondary",
  empty: "border-dashed border-border bg-surface text-text-secondary",
  error: "border-danger bg-danger-soft text-danger",
};

function StateIcon({ variant }: { variant: StatePanelVariant }) {
  if (variant === "loading") {
    return (
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-2 border-surface-container-highest border-t-primary"
      />
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="size-9 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      {variant === "error" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 7.75v5.5M12 16.5h.01" />
        </>
      ) : (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 7.5h16M5.25 7.5l.8 10.2a2 2 0 0 0 2 1.8h7.9a2 2 0 0 0 2-1.8l.8-10.2M9 11.5h6"
          />
          <path strokeLinecap="round" d="M8 4.5h8" />
        </>
      )}
    </svg>
  );
}

export function StatePanel({
  action,
  children,
  className,
  role,
  title,
  variant,
  ...props
}: StatePanelProps) {
  const isLoading = variant === "loading";
  const resolvedRole =
    role ?? (variant === "error" ? "alert" : variant === "loading" ? "status" : undefined);
  const liveMode =
    variant === "error" ? "assertive" : resolvedRole === "status" ? "polite" : undefined;

  return (
    <div
      role={resolvedRole}
      aria-live={liveMode}
      aria-busy={isLoading || undefined}
      data-state={variant}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center shadow-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <StateIcon variant={variant} />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="text-sm">{children}</div>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
