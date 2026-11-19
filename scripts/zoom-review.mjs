import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
const extension = path.resolve("artifacts/zoom-extension");
fs.mkdirSync(extension, { recursive: true });
fs.writeFileSync(
  path.join(extension, "manifest.json"),
  JSON.stringify({
    manifest_version: 3,
    name: "Local zoom verification",
    version: "1.0",
    permissions: ["tabs"],
    background: { service_worker: "background.js" },
  }),
);
fs.writeFileSync(
  path.join(extension, "background.js"),
  "chrome.runtime.onInstalled.addListener(()=>{});",
);
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  viewport: { width: 1366, height: 1000 },
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
});
const worker =
  context.serviceWorkers()[0] || (await context.waitForEvent("serviceworker"));
const page = await context.newPage();
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
await worker.evaluate(async () => {
  const tabs = await chrome.tabs.query({});
  const tab = tabs.find((t) => t.url?.includes("localhost:3202"));
  await chrome.tabs.setZoom(tab.id, 2);
  return chrome.tabs.getZoom(tab.id);
});
await page.waitForTimeout(300);
await page.screenshot({ path: "artifacts/dashboard-zoom200.png" });
const metrics = await page.evaluate(() => ({
  innerWidth,
  devicePixelRatio,
  scrollWidth: document.documentElement.scrollWidth,
  h1: getComputedStyle(document.querySelector("h1")).fontSize,
}));
console.log(metrics);
await page
  .getByRole("button", { name: "Giao bài tập mới", exact: true })
  .click();
await page.screenshot({ path: "artifacts/dialog-zoom200.png" });
await page
  .getByRole("button", { name: "Giao bài cho lớp" })
  .scrollIntoViewIfNeeded();
await page.screenshot({ path: "artifacts/dialog-zoom200-bottom.png" });
console.log(
  "Dialog",
  await page.locator("dialog").evaluate((d) => ({
    width: d.clientWidth,
    height: d.clientHeight,
    scrollWidth: d.scrollWidth,
    scrollHeight: d.scrollHeight,
  })),
);
fs.writeFileSync("artifacts/zoom-review.json", JSON.stringify(metrics));
await context.close();
