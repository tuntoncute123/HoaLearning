import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parsePdf, parsePages } from "../server/parser.js";
const file = fs
  .readdirSync(".")
  .find((f) => f.includes("20 ĐỀ") && f.endsWith(".pdf"));
test("provided PDF: all 20 exams and 201 questions, sections/options/subparts/source regions preserved", async () => {
  const r = await parsePdf(fs.readFileSync(file), file);
  assert.equal(r.pageCount, 46);
  assert.equal(r.exams.length, 20);
  assert.equal(r.questionCount, 201);
  assert.deepEqual(
    r.exams.map((e) => e.number),
    Array.from({ length: 20 }, (_, i) => i + 1),
  );
  const first = r.exams[0];
  assert.equal(first.questions.length, 10);
  assert.equal(first.questions[0].type, "choice");
  assert.equal(first.questions[0].options[1].text, "634");
  assert.equal(first.questions[6].parts.length, 2);
  assert.equal(first.questions[6].section, "II. Tự luận");
  assert.equal(first.questions[7].showSource, true);
  assert.equal(
    new Set(r.exams.flatMap((e) => e.questions.map((q) => q.id))).size,
    201,
  );
  assert.ok(!first.questions[7].prompt.endsWith("\n1"));
  assert.ok(!first.questions[9].prompt.endsWith("\n2"));
  for (const e of r.exams) {
    assert.equal(e.reviewed, false);
    for (const q of e.questions) {
      assert.ok(q.source.length);
      assert.equal(q.correctAnswer, "");
      for (const s of q.source) {
        assert.ok(s.page >= 1 && s.page <= 46);
        assert.ok(s.bottom > s.top);
      }
    }
  }
});
test("empty and unrecognized PDF structure fails explicitly", () => {
  assert.throws(
    () =>
      parsePages([
        {
          number: 1,
          height: 800,
          width: 600,
          rows: [{ y: 100, text: "Ảnh scan" }],
        },
      ]),
    /OCR/,
  );
});
test("partial unrelated exam formats are not silently imported", () => {
  assert.throws(
    () =>
      parsePages([
        {
          number: 1,
          height: 800,
          width: 600,
          rows: [
            { y: 80, text: "ĐỀ 1" },
            { y: 110, text: "1. Unsupported question" },
            { y: 200, text: "ĐỀ 2" },
            { y: 250, text: "Câu 1. Hello" },
          ],
        },
      ]),
    /Cấu trúc PDF chưa khớp/,
  );
});
