import { expect, test } from "@playwright/test";

test("renders a non-Python course from server data without a Python badge", async ({ page }) => {
  await page.goto("/courses");

  const courseCard = page
    .getByTestId("course-card")
    .filter({ hasText: "Nhập môn Kỹ thuật Phần mềm" });

  await expect(courseCard).toContainText("Hiểu quy trình, yêu cầu và thiết kế phần mềm");
  await expect(courseCard.getByText("PYTHON", { exact: true })).toHaveCount(0);
  await courseCard.getByRole("link", { name: "Xem chi tiết" }).click();

  await expect(page).toHaveURL(/\/courses\/2$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: "Nhập môn Kỹ thuật Phần mềm" }),
  ).toBeVisible();
  await expect(page.getByText("Hiểu quy trình, yêu cầu và thiết kế phần mềm từ các nguồn học tập đã chọn.")).toBeVisible();
  await expect(page.getByText("PYTHON", { exact: true })).toHaveCount(0);
  await expect(page).toHaveTitle("Nhập môn Kỹ thuật Phần mềm | LearningApp");
});
