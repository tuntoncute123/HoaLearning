import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
const port = Number(process.env.TEST_PORT || 3201),
  pgPort = port + 50000;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mam-next-test-"));
const pg = new EmbeddedPostgres({
  databaseDir: path.join(directory, "pg"),
  user: "postgres",
  password: "isolated-test-only",
  port: pgPort,
  persistent: false,
  autoRehydrateSymlinks: true,
  onLog: () => {},
  onError: console.error,
});
let server,
  stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (server && server.exitCode === null) {
    const done = new Promise((r) => server.once("exit", r));
    server.kill("SIGTERM");
    await done;
  }
  await pg.stop();
  fs.rmSync(directory, { recursive: true, force: true });
  process.exit(code);
}
process.on("SIGTERM", () => stop());
process.on("SIGINT", () => stop());
try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("mam_test");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_SSL_CA: "",
    VAPID_PUBLIC_KEY: "",
    VAPID_PRIVATE_KEY: "",
    DATABASE_URL: `postgresql://postgres:isolated-test-only@localhost:${pgPort}/mam_test`,
    APP_ORIGIN: `http://localhost:${port}`,
    TEACHER_EMAIL: process.env.TEST_EMAIL || "teacher@example.com",
    TEACHER_PASSWORD: process.env.TEST_PASSWORD || "BrowserTest2026!Secure",
  };
  const setup = spawn(process.execPath, ["scripts/setup-db.mjs"], {
    env,
    stdio: "inherit",
  });
  const code = await new Promise((r) => setup.once("exit", r));
  if (code) throw new Error("Test database setup failed");
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    { env, stdio: "inherit" },
  );
  server.once("exit", (code) => {
    if (!stopping) stop(code || 0);
  });
} catch (e) {
  console.error(e);
  await stop(1);
}
