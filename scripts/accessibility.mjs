import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1366, height: 1000 },
});
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
const r = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa"])
  .analyze();
fs.writeFileSync(
  "artifacts/accessibility.json",
  JSON.stringify(r.violations, null, 2),
);
console.log(
  JSON.stringify(
    r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    null,
    2,
  ),
);
await browser.close();
