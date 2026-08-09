import { describe, expect, it } from "vitest";

import { cn } from "@/shared/utils/cn";

describe("cn", () => {
  it("combines conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("rounded", false && "hidden", "px-2", "px-4")).toBe(
      "rounded px-4",
    );
  });
});
