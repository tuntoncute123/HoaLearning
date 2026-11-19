import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
function worker() {
  const handlers = {},
    notifications = [],
    opened = [];
  const context = {
    URL,
    importScripts() {},
    self: {
      location: { origin: "https://mamnho.example" },
      addEventListener(name, fn) {
        handlers[name] = fn;
      },
      registration: {
        showNotification: async (title, options) =>
          notifications.push({ title, ...options }),
      },
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (url) => opened.push(url),
    },
  };
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), context);
  return { handlers, notifications, opened };
}
test("push handler builds notification with body, icon and target URL", async () => {
  const w = worker();
  let done;
  w.handlers.push({
    data: {
      json: () => ({
        title: "Bài mới",
        body: "Lớp 3 có bài Toán.",
        url: "/?page=assignments",
      }),
    },
    waitUntil: (p) => (done = p),
  });
  await done;
  assert.equal(w.notifications[0].title, "Bài mới");
  assert.equal(w.notifications[0].body, "Lớp 3 có bài Toán.");
  assert.equal(w.notifications[0].data.url, "/?page=assignments");
  assert.equal(w.notifications[0].icon, "/icon-192.png");
});
test("malformed push falls back, and notification clicks cannot leave app origin", async () => {
  const w = worker();
  let done;
  w.handlers.push({
    data: {
      json() {
        throw new Error("malformed");
      },
    },
    waitUntil: (p) => (done = p),
  });
  await done;
  assert.equal(w.notifications[0].title, "Mầm Nhỏ");
  w.handlers.notificationclick({
    notification: { close() {}, data: { url: "https://unrelated.example/" } },
    waitUntil: (p) => (done = p),
  });
  await done;
  assert.equal(w.opened[0], "https://mamnho.example/");
});
