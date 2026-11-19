import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "node:fs";
const file = fs.readdirSync(".").find((x) => x.endsWith(".pdf"));
const pdf = await getDocument({
  data: new Uint8Array(fs.readFileSync(file)),
  useSystemFonts: true,
}).promise;
let pages = [];
for (let i = 1; i <= pdf.numPages; i++) {
  let p = await pdf.getPage(i),
    c = await p.getTextContent();
  let rows = [];
  for (let t of c.items) {
    let row = rows.find((r) => Math.abs(r.y - t.transform[5]) < 3);
    if (!row) {
      row = { y: t.transform[5], items: [] };
      rows.push(row);
    }
    row.items.push(t);
  }
  rows.sort((a, b) => b.y - a.y);
  pages.push({
    page: i,
    text: rows
      .map((r) =>
        r.items
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map((t) => t.str)
          .join(" "),
      )
      .join("\n"),
  });
}
fs.writeFileSync("artifacts/pdf-text.json", JSON.stringify(pages, null, 2));
console.log("PAGES:", pdf.numPages);
console.log(
  pages
    .slice(0, 5)
    .map((x) => "PAGE " + x.page + "\n" + x.text)
    .join("\n"),
);
console.log(
  "HEADINGS",
  pages.map((p) => ({ page: p.page, head: p.text.split("\n").slice(0, 3) })),
);
