import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { writePrecache } from "../scripts/precache.mjs";

test("precache works before BUILD_ID exists and replaces stale manifests when assets or worker change", () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "hoa-precache-"));
  const distDir = path.join(projectDir, ".next");
  try {
    fs.mkdirSync(path.join(distDir, "static/chunks"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "public"));
    const asset = path.join(distDir, "static/chunks/app.js");
    const worker = path.join(projectDir, "public/sw.js");
    fs.writeFileSync(asset, "first build");
    fs.writeFileSync(worker, "worker v1");
    fs.writeFileSync(
      path.join(projectDir, "public/precache-manifest.js"),
      "stale local build",
    );
    function manifest() {
      writePrecache({ distDir, projectDir });
      const context = { self: {} };
      vm.runInNewContext(
        fs.readFileSync(
          path.join(projectDir, "public/precache-manifest.js"),
          "utf8",
        ),
        context,
      );
      return context.self;
    }
    const first = manifest();
    assert.equal(first.__PRECACHE[0], "/_next/static/chunks/app.js");
    assert.equal(first.__PRECACHE.length, 1);
    assert.equal(manifest().__BUILD, first.__BUILD);
    fs.writeFileSync(asset, "second build");
    const second = manifest();
    assert.notEqual(second.__BUILD, first.__BUILD);
    fs.writeFileSync(worker, "worker v2");
    assert.notEqual(manifest().__BUILD, second.__BUILD);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});
