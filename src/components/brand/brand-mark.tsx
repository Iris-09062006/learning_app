import type { SVGAttributes } from "react";

import { cn } from "@/shared/utils/cn";

interface BrandMarkProps extends SVGAttributes<SVGSVGElement> {
  title?: string;
}

export function BrandMark({ className, title, ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M5 8.25c4.12 0 7.8 1.18 11 3.55v14.45c-3.2-2.36-6.88-3.55-11-3.55V8.25Z"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M27 8.25c-4.12 0-7.8 1.18-11 3.55v14.45c3.2-2.36 6.88-3.55 11-3.55V8.25Z"
        fill="currentColor"
      />
      <path
        d="m20 6 2.2 2.2L26 4.4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
