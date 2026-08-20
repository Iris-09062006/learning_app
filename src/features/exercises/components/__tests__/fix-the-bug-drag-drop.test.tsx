import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FixTheBugDragDrop } from "@/features/exercises/components/fix-the-bug-drag-drop";
import type { ExerciseOption } from "@/features/exercises/types";

const options: ExerciseOption[] = [
  { id: 1, content: "return x + 1;", order: 1 },
  { id: 2, content: "return x - 1;", order: 2 },
  { id: 3, content: "return x * 1;", order: 3 },
];

function createDataTransfer() {
  const store = new Map<string, string>();
  return {
    setData: (type: string, value: string) => {
      store.set(type, value);
    },
    getData: (type: string) => store.get(type) ?? "",
    effectAllowed: "move",
    dropEffect: "move",
  } as unknown as DataTransfer;
}

describe("FixTheBugDragDrop", () => {
  it("renders all code fragments as draggable buttons", () => {
    render(<FixTheBugDragDrop options={options} value={null} onChange={vi.fn()} />);

    expect(screen.getByTestId("fix-the-bug-drag-drop")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(options.length + 1);
    expect(screen.getByText("return x + 1;")).toBeInTheDocument();
    expect(screen.getByText("return x - 1;")).toBeInTheDocument();
    expect(screen.getByText("return x * 1;")).toBeInTheDocument();
  });

  it("selects an option on click and announces the selection", () => {
    const onChange = vi.fn();
    render(<FixTheBugDragDrop options={options} value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Mảnh code: return x + 1;" }));

    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.getByTestId("drag-drop-announcer")).toHaveTextContent(
      'Đã chọn mảnh code “return x + 1;” vào vị trí trống.'
    );
  });

  it("shows a focus-visible indicator when the empty slot moves focus to the options", () => {
    render(<FixTheBugDragDrop options={options} value={null} onChange={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Chọn mảnh code ở bên dưới để điền vào vị trí này",
      }),
    );

    const optionsGroup = screen.getByRole("button", {
      name: "Mảnh code: return x + 1;",
    }).parentElement as HTMLElement;
    expect(optionsGroup).toHaveFocus();
    expect(optionsGroup).toHaveClass("focus-visible:ring-focus-ring");
  });

  it("shows the selected option in the drop zone and removes it from the list", () => {
    const onChange = vi.fn();
    render(<FixTheBugDragDrop options={options} value={1} onChange={onChange} />);

    expect(screen.getByText("return x + 1;")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gỡ bỏ" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mảnh code: return x + 1;" })
    ).not.toBeInTheDocument();
  });

  it("clears the selection when the remove button is clicked", () => {
    const onChange = vi.fn();
    render(<FixTheBugDragDrop options={options} value={1} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Gỡ bỏ" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("places an option into the drop zone on drop with a valid id", () => {
    const onChange = vi.fn();
    const dataTransfer = createDataTransfer();
    dataTransfer.setData("text/plain", "2");

    render(<FixTheBugDragDrop options={options} value={null} onChange={onChange} />);

    const dropZone = screen.getByTestId("drop-zone");
    fireEvent.dragOver(dropZone, { dataTransfer });
    fireEvent.drop(dropZone, { dataTransfer });

    expect(onChange).toHaveBeenCalledWith(2);
    expect(screen.getByTestId("drag-drop-announcer")).toHaveTextContent(
      'Đã bỏ mảnh code “return x - 1;” vào vị trí trống.'
    );
  });

  it("announces an invalid drop without changing the selection", () => {
    const onChange = vi.fn();
    const dataTransfer = createDataTransfer();
    dataTransfer.setData("text/plain", "999");

    render(<FixTheBugDragDrop options={options} value={null} onChange={onChange} />);

    const dropZone = screen.getByTestId("drop-zone");
    fireEvent.dragOver(dropZone, { dataTransfer });
    fireEvent.drop(dropZone, { dataTransfer });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("drag-drop-announcer")).toHaveTextContent(
      "Không thể bỏ mảnh code vào vị trí này."
    );
  });

  it("sets drag data and announces the fragment when drag starts", () => {
    const onChange = vi.fn();
    const dataTransfer = createDataTransfer();

    render(<FixTheBugDragDrop options={options} value={null} onChange={onChange} />);

    fireEvent.dragStart(
      screen.getByRole("button", { name: "Mảnh code: return x * 1;" }),
      { dataTransfer }
    );

    expect(dataTransfer.getData("text/plain")).toBe("3");
    expect(screen.getByTestId("drag-drop-announcer")).toHaveTextContent(
      'Đang kéo mảnh code “return x * 1;”.'
    );
  });

  it("shows an empty state when every option is placed", () => {
    render(<FixTheBugDragDrop options={[options[0]]} value={1} onChange={vi.fn()} />);

    expect(
      screen.getByText("Đã đặt tất cả mảnh code. Nhấn “Gỡ bỏ” nếu muốn đổi lựa chọn.")
    ).toBeInTheDocument();
  });
it("uses Stitch tokens and no legacy palette classes", () => {
    const { container } = render(
      <FixTheBugDragDrop options={options} value={1} onChange={vi.fn()} />
    );

    // Drop zone idle state → design-token border.
    expect(screen.getByTestId("drop-zone")).toHaveClass("border-strong");

    // Selected option chip → code tokens.
    expect(screen.getByText("return x + 1;")).toHaveClass("bg-code-background");

    // Option card → surface/primary tokens.
    const optionCard = screen.getByRole("button", { name: "Mảnh code: return x - 1;" });
    expect(optionCard).toHaveClass("bg-surface", "border-border");

    // No legacy palette utilities (slate/indigo/emerald/rose/white) remain.
    expect(container.innerHTML).not.toMatch(
      /(^|\s)(bg|text|border|shadow|ring)-(slate|indigo|emerald|rose|white)-\d+/
    );
  });
});
