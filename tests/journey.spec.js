import { test, expect } from "@playwright/test";
import fs from "node:fs";
test("teacher assigns; student saves offline, submits; teacher grades; PDF import and PWA", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Tôi là giáo viên" }).click();
  await page
    .getByLabel("Tên đăng nhập hoặc email", { exact: true })
    .fill("teacher@example.com");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("BrowserTest2026!Secure");
  await page.getByRole("button", { name: "Vào lớp thôi" }).click();
  await expect(
    page.getByRole("heading", { name: "Một ngày dạy học thật vui!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Học sinh", exact: true }).click();
  await page
    .getByRole("button", { name: "Thêm học sinh", exact: true })
    .click();
  await page.getByLabel("Họ và tên học sinh").fill("Nguyễn Học Thử");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Thêm học sinh", exact: true })
    .click();
  await expect(page.getByText("Nguyễn Học Thử", { exact: true })).toBeVisible();
  const code = await page.locator(".code-cell code").first().textContent();
  await page
    .getByRole("button", { name: "Bài tập đã giao", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Giao bài mới", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Tên bài tập", { exact: true })
    .fill("Thử thách học vui");
  await page
    .getByRole("button", { name: "Giao bài cho lớp", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thử thách học vui" }),
  ).toBeVisible();
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    student = await context.newPage();
  student.on("pageerror", (e) => errors.push(e.message));
  await student.goto("/");
  await student.getByLabel("Tên hoặc mã đăng nhập của em").fill(code);
  await student.getByRole("button", { name: "Vào lớp thôi" }).click();
  await expect(
    student.getByRole("heading", { name: /mình học thôi/ }),
  ).toBeVisible();
  await student
    .getByRole("button", { name: "Làm bài Thử thách học vui" })
    .click();
  await expect(
    student.getByRole("heading", {
      name: "Kết quả của phép tính: 317 × 2 là:",
    }),
  ).toBeVisible();
  await student.getByRole("radio", { name: "B 634" }).click();
  await expect(student.getByText("Đã lưu bài", { exact: true })).toBeVisible();
  await student.screenshot({
    path: "artifacts/student-390.png",
    fullPage: true,
  });
  await student.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => student.evaluate(() => caches.keys().then((k) => k.length)))
    .toBeGreaterThan(0);
  await context.setOffline(true);
  await student.getByRole("button", { name: "Câu tiếp theo" }).click();
  await student.getByRole("radio", { name: "D 44" }).click();
  await expect(
    student.getByText("Lưu trên thiết bị", { exact: true }),
  ).toBeVisible();
  await student.reload();
  await expect(
    student.getByRole("heading", {
      name: "Kết quả của phép tính: 317 × 2 là:",
    }),
  ).toBeVisible();
  await expect(student.getByRole("radio", { name: "B 634" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await student.getByRole("button", { name: "Đến câu 2", exact: true }).click();
  await expect(student.getByRole("radio", { name: "D 44" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await context.setOffline(false);
  await expect(student.getByText("Đã lưu bài", { exact: true })).toBeVisible();
  await student.getByRole("button", { name: "Đến câu 8", exact: true }).click();
  await student
    .getByLabel("Bài làm của em")
    .fill(
      "Con bò nặng: 276 − 85 = 191 (kg).\nCả hai con nặng: 276 + 191 = 467 (kg).",
    );
  await expect(student.locator(".student-source img").first()).toBeVisible();
  await expect
    .poll(() =>
      student
        .locator(".student-source img")
        .first()
        .evaluate((i) => i.complete && i.naturalWidth > 0),
    )
    .toBe(true);
  await student.screenshot({
    path: "artifacts/student-written-390.png",
    fullPage: true,
  });
  await student.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await expect(student.getByText(/câu chưa trả lời/)).toBeVisible();
  await student.getByRole("button", { name: "Nộp bài cho cô" }).click();
  await expect(
    student.getByRole("heading", { name: "Em đã làm được rồi!" }),
  ).toBeVisible();
  await student.screenshot({
    path: "artifacts/student-success-390.png",
    fullPage: true,
  });
  await student.getByRole("button", { name: "Về góc học tập" }).click();
  await page
    .getByRole("button", { name: "Kết quả học tập", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Chấm bài", exact: true })
    .first()
    .click();
  await page.getByLabel("Điểm cuối cùng", { exact: true }).fill("9");
  await page
    .getByLabel("Lời nhắn của cô")
    .fill("Em đã làm rất tốt, hãy chú ý trả lời đủ các câu nhé!");
  await page.getByRole("button", { name: "Lưu điểm & nhận xét" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".grade-value").first()).toContainText("9");
  await student.goto("/?page=results");
  await expect(
    student.getByText("Em đã làm rất tốt, hãy chú ý trả lời đủ các câu nhé!"),
  ).toBeVisible();
  await expect(student.locator(".result-score>strong")).toHaveText("9");
  await page
    .getByRole("button", { name: "Thư viện đề", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: "Tải bộ đề lên" }).click();
  const file = fs
    .readdirSync(".")
    .find((f) => f.includes("20 ĐỀ") && f.endsWith(".pdf"));
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByRole("button", { name: "Tải lên & tách đề" }).click();
  await expect(
    page.getByRole("heading", { name: "Bộ đề đã vào thư viện!" }),
  ).toBeVisible();
  await expect(page.locator(".import-result-stats")).toContainText("201");
  await page.getByRole("button", { name: "Duyệt đề đầu tiên" }).click();
  await page.getByLabel("Đáp án đúng B", { exact: true }).check();
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Cài đặt & thông báo" }).click();
  await expect(
    page.getByRole("button", { name: "Bật thông báo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});
