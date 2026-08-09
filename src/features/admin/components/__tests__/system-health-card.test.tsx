import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SystemHealthCard } from "../system-health-card";

const health = { status: "ok" as const, database: "connected" as const, timestamp: "2026-08-05T00:00:00Z" };

describe("SystemHealthCard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders coarse health values without infrastructure details", () => {
    render(<SystemHealthCard initialHealth={health} />);
    expect(screen.getByText("Hoạt động bình thường")).toBeInTheDocument();
    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(screen.queryByText(/SUPABASE|database url|service role/i)).not.toBeInTheDocument();
  });

  it("refreshes health and renders degraded state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      data: { status: "degraded", database: "unavailable", timestamp: "2026-08-05T01:00:00Z" },
    }), { status: 503 })));
    render(<SystemHealthCard initialHealth={health} />);
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra lại" }));
    expect(await screen.findByText("Suy giảm")).toBeInTheDocument();
    expect(screen.getByText("unavailable")).toBeInTheDocument();
  });
});
