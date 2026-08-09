import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CourseSearchForm,
  createCourseCatalogHref,
} from "../course-search-form";

describe("CourseSearchForm", () => {
  it("syncs the current query and resets pagination on submit", () => {
    render(<CourseSearchForm search="python" pageSize={12} />);

    const form = screen.getByRole("search");
    const searchInput = screen.getByRole("searchbox", {
      name: "Tìm khóa học",
    });

    expect(form).toHaveAttribute("action", "/courses");
    expect(form).toHaveAttribute("method", "get");
    expect(searchInput).toHaveValue("python");
    expect(form.querySelector('input[name="page"]')).not.toBeInTheDocument();
    expect(form.querySelector('input[name="pageSize"]')).toHaveValue("12");
    expect(
      screen.getByRole("link", { name: "Xóa tìm kiếm" })
    ).toHaveAttribute("href", "/courses?pageSize=12");
  });

  it("does not render a clear link without an active search", () => {
    render(<CourseSearchForm pageSize={20} />);

    expect(
      screen.queryByRole("link", { name: "Xóa tìm kiếm" })
    ).not.toBeInTheDocument();
  });

  it("keeps and encodes search terms in pagination URLs", () => {
    expect(
      createCourseCatalogHref({
        page: 3,
        pageSize: 20,
        search: "Python & APIs",
      })
    ).toBe("/courses?pageSize=20&page=3&search=Python+%26+APIs");
  });
});
