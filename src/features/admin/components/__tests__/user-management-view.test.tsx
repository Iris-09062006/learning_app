import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UserManagementView } from "../user-management-view";

const initialData = {
  items: [{
    id: "00000000-0000-4000-8000-000000000001",
    email: "root@example.com",
    username: "Root",
    role: "admin" as const,
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
  }],
  page: 1, pageSize: 20, total: 1, totalPages: 1,
};

describe("UserManagementView", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders accessible user controls and pagination state", () => {
    render(<UserManagementView initialData={initialData} />);
    expect(screen.getByText("root@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Vai trò của Root")).toHaveValue("admin");
    expect(screen.getByRole("button", { name: "Vô hiệu hóa" })).toBeEnabled();
    expect(screen.getByText(/1 người dùng/)).toBeInTheDocument();
  });

  it("uses the shared empty panel when filters return no users", () => {
    render(<UserManagementView initialData={{ ...initialData, items: [], total: 0 }} />);

    const emptyState = screen
      .getByText("Không tìm thấy người dùng phù hợp.")
      .closest("[data-state]");
    expect(emptyState).toHaveAttribute("data-state", "empty");
    expect(emptyState).toHaveClass("border-border", "bg-surface");
  });

  it("contains long user identifiers inside the scrollable table", () => {
    const username = "NguoiDungKhongCoDiemNgat".repeat(8);
    const email = `${"diachikhongcodiemngat".repeat(8)}@example.com`;
    const { container } = render(
      <UserManagementView
        initialData={{ ...initialData, items: [{ ...initialData.items[0], username, email }] }}
      />,
    );

    expect(screen.getByText(username)).toHaveClass("break-all");
    expect(screen.getByText(email)).toHaveClass("break-all");
    expect(container.querySelector("table")?.parentElement).toHaveClass(
      "max-w-full",
      "overflow-x-auto",
    );
    expect(container.querySelector("table")).toHaveClass(
      "w-full",
      "min-w-[48rem]",
      "table-fixed",
    );
  });

  it("sends role-only mutations then refreshes the list", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { auditLogId: 7 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {
        ...initialData,
        items: [{ ...initialData.items[0], role: "moderator" }],
      } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<UserManagementView initialData={initialData} />);
    fireEvent.change(screen.getByLabelText("Vai trò của Root"), { target: { value: "moderator" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0][0]).toContain("/role");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ role: "moderator" }),
    });
    expect(await screen.findByRole("status")).toHaveTextContent("audit log");
  });

  it("announces last-admin errors returned by the server", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      success: false, error: { message: "The final active administrator cannot be changed." },
    }), { status: 409 })));
    render(<UserManagementView initialData={initialData} />);
    fireEvent.click(screen.getByRole("button", { name: "Vô hiệu hóa" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("final active administrator");
    expect(alert).toHaveClass("border-danger", "bg-danger-soft");
  });

  it("labels learner deactivation as kicking and requires confirmation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { auditLogId: 8 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {
        ...initialData,
        items: [{ ...initialData.items[0], role: "learner", isActive: false }],
      } }), { status: 200 }));
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("fetch", fetchMock);
    render(<UserManagementView initialData={{
      ...initialData,
      items: [{ ...initialData.items[0], role: "learner", username: "Student" }],
    }} />);

    fireEvent.click(screen.getByRole("button", { name: "Đuổi học viên" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Đã đuổi học viên");
  });

  it("sends exactly one recovery POST and announces the audit result", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      data: { auditLogId: 9 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<UserManagementView initialData={initialData} />);

    fireEvent.click(screen.getByRole("button", { name: "Gửi recovery" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/00000000-0000-4000-8000-000000000001/recover",
      { method: "POST" },
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Đã gửi email recovery và ghi audit log.",
    );
  });
});
