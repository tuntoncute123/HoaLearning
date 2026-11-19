import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
loadEnvConfig(process.cwd());
const { db } = await import("../server/database.js");
const file = path.resolve(process.argv[2] || "data/mam-nho.sqlite");
if (!fs.existsSync(file)) throw new Error("Không tìm thấy SQLite: " + file);
const source = new DatabaseSync(file, { readOnly: true });
const tables = [
  "users",
  "sessions",
  "documents",
  "exams",
  "assignments",
  "attempts",
  "subscriptions",
  "notifications",
  "settings",
];
try {
  await db.transaction(async () => {
    await db.query("SELECT pg_advisory_xact_lock(727319026)");
    await db.query(
      fs.readFileSync(
        new URL("../database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const table of tables) {
      if (
        (await db.query(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0].total
      )
        throw new Error(
          "Database đích phải trống. Không ghi đè dữ liệu đang có.",
        );
    }
    for (const table of tables) {
      for (const row of source
        .prepare(`SELECT * FROM ${table} ORDER BY rowid`)
        .all()) {
        const cols = Object.keys(row);
        await db.query(
          `INSERT INTO ${table}(${cols.map((c) => '"' + c + '"').join(",")}) VALUES(${cols.map((_, i) => "$" + (i + 1)).join(",")})`,
          Object.values(row),
        );
      }
    }
    const docs = source.prepare("SELECT * FROM documents").all();
    for (const doc of docs) {
      const pdf = path.join(path.dirname(file), "uploads", doc.filename);
      if (!fs.existsSync(pdf)) throw new Error("Thiếu PDF gốc: " + pdf);
      await db
        .prepare(
          "INSERT INTO assets(key,document_id,mime,bytes) VALUES(?,?,?,?)",
        )
        .run(doc.filename, doc.id, "application/pdf", fs.readFileSync(pdf));
    }
    console.log(
      `Migrated ${tables.length} tables and ${docs.length} PDFs. SQLite remains unchanged.`,
    );
  });
} finally {
  source.close();
  await db.close();
}
