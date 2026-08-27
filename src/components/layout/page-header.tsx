import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

export interface PageHeaderProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}

/**
 * Common page heading pattern: optional eyebrow, a headline-scale title,
 * an optional description, and an optional trailing actions slot.
 */
export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  function PageHeader(
    { actions, className, description, eyebrow, title, ...props },
    ref,
  ) {
    return (
      <header ref={ref} className={cn("mb-9", className)} {...props}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 max-w-3xl flex-1">
            {eyebrow ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-3xl break-words text-3xl font-semibold tracking-[-0.025em] [text-wrap:balance] md:text-[2.5rem] md:leading-[1.15]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl break-words leading-7 text-text-secondary">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex max-w-full shrink-0 flex-wrap items-center gap-3">
              {actions}
            </div>
          ) : null}
        </div>
      </header>
    );
  },
);

PageHeader.displayName = "PageHeader";
