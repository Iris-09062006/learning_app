import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/shared/utils/cn";

/**
 * Page-level content wrapper: centers children with a shared 1200px
 * (Stitch `container-max`) cap and responsive horizontal gutters.
 */
export const PageContainer = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function PageContainer({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto w-full max-w-[75rem] px-4 sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    />
  );
});

PageContainer.displayName = "PageContainer";