import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
const pg = new EmbeddedPostgres({
  databaseDir: ".local-postgres",
  user: "postgres",
  password: "local-dev-only",
  port: 54329,
  persistent: true,
  autoRehydrateSymlinks: true,
});
if (!fs.existsSync(".local-postgres/PG_VERSION")) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("mam_nho");
} catch (e) {
  if (!e.message.includes("already exists")) throw e;
}
console.log(
  "Local PostgreSQL ready: postgresql://postgres:local-dev-only@localhost:54329/mam_nho",
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
