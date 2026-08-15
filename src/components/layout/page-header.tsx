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
      <header ref={ref} className={cn("mb-8", className)} {...props}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight md:text-[2rem] md:leading-10">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-text-secondary">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {actions}
            </div>
          ) : null}
        </div>
      </header>
    );
  },
);

PageHeader.displayName = "PageHeader";