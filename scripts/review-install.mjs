import { chromium, devices, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
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
  viewport: { width: 390, height: 844 },
  userAgent: devices["iPhone 13"].userAgent,
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
});
const worker =
  context.serviceWorkers()[0] || (await context.waitForEvent("serviceworker"));
const page = await context.newPage();
await page.goto("http://localhost:3202");
await page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }).click();
const report = [];
for (const width of [360, 390]) {
  await page.setViewportSize({ width, height: 844 });
  await page.screenshot({ path: `artifacts/install-dialog-${width}.png` });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  report.push({ width, violations: result.violations });
  const d = await page
    .getByRole("dialog")
    .evaluate((d) => ({ client: d.clientWidth, scroll: d.scrollWidth }));
  expect(d.scroll).toBeLessThanOrEqual(d.client);
}
await page.setViewportSize({ width: 1366, height: 1000 });
const zoom = await worker.evaluate(async () => {
  const tabs = await chrome.tabs.query({});
  const tab = tabs.find((t) => t.url?.includes("localhost:3202"));
  await chrome.tabs.setZoom(tab.id, 2);
  return chrome.tabs.getZoom(tab.id);
});
await page.getByRole("button", { name: "Em đã hiểu" }).scrollIntoViewIfNeeded();
await page.screenshot({ path: "artifacts/install-dialog-zoom200.png" });
report.push({
  zoom,
  ...(await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    body: getComputedStyle(document.querySelector(".install-guide")).fontSize,
  }))),
});
await page.getByRole("button", { name: "Em đã hiểu" }).click();
await expect(page.getByRole("dialog")).toHaveCount(0);
fs.writeFileSync(
  "artifacts/install-review.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
await context.close();
