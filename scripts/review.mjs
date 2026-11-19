import { chromium } from "@playwright/test";
import fs from "node:fs";
const baseURL = process.env.REVIEW_ORIGIN || "http://localhost:3202";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1366, height: 1000 },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await context.request.post("/api/auth/login", {
  data: {
    email: process.env.REVIEW_EMAIL || "giaovien@mamnho.vn",
    password: process.env.REVIEW_PASSWORD || "MamNho@2026",
  },
});
await page.goto("/");
await page
  .getByRole("heading", { name: "Một ngày dạy học thật vui!" })
  .waitFor();
await page.evaluate(() => document.fonts.ready);
const metrics = [];
for (const width of [360, 390, 768, 1366, 1920, 2560]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `artifacts/next-dashboard-${width}.png`,
    fullPage: true,
  });
  metrics.push(
    await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      title: getComputedStyle(document.querySelector("h1")).fontSize,
      body: getComputedStyle(document.body).fontSize,
      nav: getComputedStyle(document.querySelector(".nav-item")).fontSize,
      button: getComputedStyle(document.querySelector(".welcome-copy .button"))
        .fontSize,
      card: getComputedStyle(document.querySelector(".assignment-card h3"))
        .fontSize,
    })),
  );
}
fs.writeFileSync(
  "artifacts/next-browser-review.json",
  JSON.stringify({ metrics, errors }, null, 2),
);
console.log(JSON.stringify({ metrics, errors }, null, 2));
await browser.close();
