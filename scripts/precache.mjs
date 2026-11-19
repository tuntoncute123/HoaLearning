import fs from "node:fs";
import path from "node:path";
const build = fs.readFileSync(".next/BUILD_ID", "utf8").trim();
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
const files = walk(".next/static")
  .filter((f) => /\.(js|css|woff2)$/.test(f))
  .map((f) => f.replace(".next/", "/_next/"));
fs.writeFileSync(
  "public/precache-manifest.js",
  `self.__BUILD=${JSON.stringify(build)};self.__PRECACHE=${JSON.stringify(files)};`,
);
console.log(`PWA: ${files.length} Next.js assets, build ${build}`);
