import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const browser = await chromium.launch(),
  context = await browser.newContext({
    viewport: { width: 1366, height: 1000 },
  }),
  page = await context.newPage();
await page.context().request.post("http://localhost:3202/api/auth/login", {
  data: {
    email: process.env.REVIEW_EMAIL || "giaovien@mamnho.vn",
    password: process.env.REVIEW_PASSWORD || "MamNho@2026",
  },
});
await page.goto("http://localhost:3202");
await page
  .getByRole("heading", { name: "Một ngày dạy học thật vui!" })
  .waitFor();
const all = [];
for (const name of [
  "Thư viện đề",
  "Bài tập đã giao",
  "Học sinh",
  "Kết quả học tập",
  "Cài đặt & thông báo",
]) {
  await page
    .getByRole("button", { name, exact: name !== "Thư viện đề" })
    .first()
    .click();
  await page.waitForTimeout(150);
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  all.push({
    page: name,
    violations: r.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
await page.getByRole("button", { name: "Thử vai học sinh" }).click();
await page.getByRole("heading", { name: /mình học thôi/ }).waitFor();
await page
  .getByRole("button", { name: "Làm bài Cùng chinh phục đề số 1" })
  .click();
await page
  .getByRole("heading", { name: "Kết quả của phép tính: 317 × 2 là:" })
  .waitFor();
await page.setViewportSize({ width: 390, height: 844 });
const r = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa"])
  .analyze();
all.push({
  page: "student",
  violations: r.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  })),
});
await page.getByRole("button", { name: "Đến câu 8", exact: true }).click();
await page
  .getByRole("button", { name: "Phóng to đề gốc", exact: true })
  .click();
await page.getByRole("dialog").waitFor();
await page.screenshot({ path: "artifacts/source-zoom-mobile.png" });
await page.getByRole("button", { name: "Phóng lớn đề" }).click();
await page.getByRole("button", { name: "Đóng", exact: true }).click();
await page.screenshot({
  path: "artifacts/student-final-390.png",
  fullPage: true,
});
console.log(JSON.stringify(all, null, 2));
fs.writeFileSync(
  "artifacts/accessibility-pages.json",
  JSON.stringify(all, null, 2),
);
await browser.close();
