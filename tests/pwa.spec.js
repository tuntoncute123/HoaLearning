import { test, expect, devices } from "@playwright/test";
const iphone = devices["iPhone 13"];
const android = devices["Pixel 7"];
async function phone(browser, device = iphone, init) {
  const context = await browser.newContext({
    ...device,
    baseURL: "http://localhost:3201",
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Chào mừng bạn về lớp!" }),
  ).toBeVisible();
  return { context, page };
}
test("iPhone shows detailed, scrollable instructions; close restores install button focus", async ({
  browser,
}) => {
  const { context, page } = await phone(browser);
  await page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Cài Mầm Nhỏ trên iPhone");
  await expect(dialog.locator("li")).toHaveCount(5);
  await expect(dialog).toContainText("Sửa tác vụ");
  await expect(dialog).toContainText("Open as Web App");
  await page.screenshot({ path: "artifacts/pwa-ios-guide-390.png" });
  await dialog.getByRole("button", { name: "Em đã hiểu" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Tôi là giáo viên" }).click();
  await expect(
    page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
  ).toHaveCount(0);
  await context.close();
});
test("in-app iOS browser explains opening Safari and supplies address", async ({
  browser,
}) => {
  const { context, page } = await phone(browser, {
    ...iphone,
    userAgent: iphone.userAgent + " [FBAN/FBIOS;FBAV/500]",
  });
  await page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Mở bằng Safari trước nhé",
  );
  await expect(page.getByLabel("Địa chỉ lớp học")).toHaveValue(
    "http://localhost:3201/",
  );
  await context.close();
});
test("desktop including narrow window and iPad have no install CTA", async ({
  browser,
}) => {
  for (const opts of [
    { viewport: { width: 390, height: 844 } },
    { viewport: { width: 1920, height: 1080 } },
    devices["iPad Pro 11"],
  ]) {
    const { context, page } = await phone(browser, opts);
    await expect(
      page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
    ).toHaveCount(0);
    await context.close();
  }
});
test("installed iOS and Android apps hide install CTA", async ({ browser }) => {
  for (const device of [iphone, android]) {
    const { context, page } = await phone(browser, device, () => {
      Object.defineProperty(navigator, "standalone", { value: true });
      const original = window.matchMedia.bind(window);
      window.matchMedia = (q) =>
        q === "(display-mode: standalone)"
          ? { matches: true, addEventListener() {}, removeEventListener() {} }
          : original(q);
    });
    await expect(
      page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
    ).toHaveCount(0);
    await context.close();
  }
});
test("Android native prompt handles dismissal, retry and installation", async ({
  browser,
}) => {
  const { context, page } = await phone(browser, android);
  const prompt = async (outcome) =>
    page.evaluate((outcome) => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = async () => {
        window.promptCalls = (window.promptCalls || 0) + 1;
      };
      event.userChoice = Promise.resolve({ outcome });
      window.dispatchEvent(event);
    }, outcome);
  await prompt("dismissed");
  await page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Em chưa cài ứng dụng");
  await page.getByRole("button", { name: "Em đã hiểu" }).click();
  await prompt("accepted");
  await page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.promptCalls)).toBe(2);
  await context.close();
});
test("Android without native prompt has manual steps; appinstalled removes CTA", async ({
  browser,
}) => {
  const { context, page } = await phone(browser, android);
  await page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Mở menu ⋮");
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
  ).toHaveCount(0);
  await context.close();
});
test("mobile student sees CTA on dashboard and settings; manifest and icons are valid", async ({
  browser,
}) => {
  const { context, page } = await phone(browser);
  const login = await context.request.post("/api/auth/login", {
    data: { email: "teacher@example.com", password: "BrowserTest2026!Secure" },
  });
  expect(login.ok()).toBeTruthy();
  const student = await (
    await context.request.post("/api/students", {
      data: { name: "Học sinh PWA" },
    })
  ).json();
  await context.request.post("/api/auth/logout");
  await page.getByLabel("Tên hoặc mã đăng nhập của em").fill(student.code);
  await page.getByRole("button", { name: "Vào lớp thôi" }).click();
  await expect(
    page.getByRole("heading", { name: /mình học thôi/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/pwa-student-390.png",
    fullPage: true,
  });
  await page.goto("/?page=settings");
  await expect(
    page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Cài Mầm Nhỏ", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Thêm vào Màn hình chính",
  );
  const manifest = await (
    await context.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons)
    expect((await context.request.get(icon.src)).ok()).toBeTruthy();
  expect(
    (await context.request.get("/apple-touch-icon.png")).ok(),
  ).toBeTruthy();
  await context.close();
});
