import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import fs from "node:fs";
loadEnvConfig(process.cwd());
const { db, getSetting, setSetting } = await import("../server/database.js");
const { seed } = await import("../server/seed.js");
const { default: webpush } = await import("web-push");
try {
  await db.transaction(async () => {
    await db.query("SELECT pg_advisory_xact_lock(727319026)");
    await db.query(
      fs.readFileSync(
        new URL("../database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await seed();
    if (!(await getSetting("vapid")))
      await setSetting("vapid", JSON.stringify(webpush.generateVAPIDKeys()));
    await db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    await db.prepare("DELETE FROM rate_limits WHERE expires<?").run(Date.now());
    await db.prepare("DELETE FROM uploads WHERE expires<?").run(Date.now());
  });
  console.log(
    "PostgreSQL ready. Schema, teacher, PDF library and VAPID keys persisted.",
  );
} finally {
  await db.close();
}
