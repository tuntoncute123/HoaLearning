import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// Run inside Next's compile lifecycle, before a hosting adapter collects public
// files. A post-build script is too late for Vercel's static output snapshot.
export function writePrecache({ distDir, projectDir }) {
  const staticDir = path.join(distDir, "static");
  function walk(dir) {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
      );
  }
  const files = walk(staticDir)
    .filter((file) => /\.(js|css|woff2)$/.test(file))
    .map(
      (file) =>
        "/_next/static/" +
        path.relative(staticDir, file).split(path.sep).join("/"),
    )
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update(
      fs.readFileSync(path.join(distDir, file.replace("/_next/", ""))),
    );
  }
  hash.update(fs.readFileSync(path.join(projectDir, "public/sw.js")));
  const build = hash.digest("hex").slice(0, 24);
  fs.writeFileSync(
    path.join(projectDir, "public/precache-manifest.js"),
    `self.__BUILD=${JSON.stringify(build)};self.__PRECACHE=${JSON.stringify(files)};`,
  );
  console.log(
    `PWA: ${files.length} assets prepared before output packaging (${build}).`,
  );
}
