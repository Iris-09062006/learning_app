import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card", () => {
  it("renders its compound structure with semantic title and description", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle>Python basics</CardTitle>
          <CardDescription>Start with variables.</CardDescription>
        </CardHeader>
        <CardContent>Lesson content</CardContent>
        <CardFooter>Continue learning</CardFooter>
      </Card>,
    );

    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Python basics",
    );
    expect(screen.getByText("Start with variables.").tagName).toBe("P");
    expect(screen.getByText("Lesson content").parentElement).toBe(
      screen.getByTestId("card"),
    );
    expect(screen.getByText("Continue learning").parentElement).toBe(
      screen.getByTestId("card"),
    );
  });

  it("uses the required card shape and merges custom classes", () => {
    render(<Card className="rounded-xl" data-testid="card" />);

    const className = screen.getByTestId("card").className;
    expect(className).toContain("rounded-xl");
    expect(className).not.toContain("rounded-2xl");
    expect(className).toContain("border-slate-200");
  });
});
