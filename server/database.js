import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";

pg.types.setTypeParser(20, Number);
const transactions = new AsyncLocalStorage();
const poolKey = Symbol.for("mam-nho.postgres");
function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Thiếu DATABASE_URL. Hãy cấu hình PostgreSQL và chạy npm run db:setup.",
    );
  if (!globalThis[poolKey]) {
    globalThis[poolKey] = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX || 3),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 55000,
      idle_in_transaction_session_timeout: 60000,
      allowExitOnIdle: true,
      ...(process.env.DATABASE_SSL_CA
        ? {
            ssl: {
              ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n"),
              rejectUnauthorized: true,
            },
          }
        : {}),
    });
    globalThis[poolKey].on("error", (error) =>
      console.error(
        "Idle PostgreSQL connection:",
        error.code || "disconnected",
      ),
    );
  }
  return globalThis[poolKey];
}
async function query(text, values = []) {
  return (transactions.getStore() || pool()).query(text, values);
}
export const db = {
  query,
  // Existing domain queries use positional ? parameters. Values always stay bound.
  prepare(text) {
    let i = 0;
    const sql = text.replace(/\?/g, () => `$${++i}`);
    return {
      async get(...args) {
        return (await query(sql, args)).rows[0];
      },
      async all(...args) {
        return (await query(sql, args)).rows;
      },
      async run(...args) {
        const r = await query(sql, args);
        return { changes: r.rowCount };
      },
    };
  },
  async transaction(fn) {
    if (transactions.getStore()) return fn();
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const result = await transactions.run(client, fn);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
  async close() {
    if (globalThis[poolKey]) {
      await globalThis[poolKey].end();
      delete globalThis[poolKey];
    }
  },
};
export const id = () => randomUUID();
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(":");
    return timingSafeEqual(
      Buffer.from(hash, "hex"),
      scryptSync(password, salt, 64),
    );
  } catch {
    return false;
  }
}
export function publicUser(u) {
  return u
    ? {
        id: u.id,
        name: u.name,
        role: u.role,
        ...(u.role === "teacher" ? { email: u.email } : {}),
      }
    : null;
}
export async function getSetting(key) {
  return (await db.prepare("SELECT value FROM settings WHERE key=?").get(key))
    ?.value;
}
export async function setSetting(key, value) {
  await db
    .prepare(
      "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .run(key, value);
}
