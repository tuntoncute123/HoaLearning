import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { randomUUID } from "node:crypto";
const clean = (s) =>
  s
    .normalize("NFC")
    .replace(/\uF0B4/g, "×")
    .replace(/\uF02D/g, "−")
    .replace(/\uF02B/g, "+")
    .replace(/\uF03D/g, "=")
    .replace(/\uF03A/g, ":")
    .replace(/[ \t]+/g, " ")
    .trim();
export async function extractPages(bytes) {
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const pdf = await task.promise;
  if (pdf.numPages > 150) {
    await task.destroy();
    throw new Error("Vui lòng dùng PDF tối đa 150 trang.");
  }
  const pages = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n),
        viewport = page.getViewport({ scale: 1 }),
        content = await page.getTextContent(),
        rows = [];
      for (const item of content.items) {
        if (!item.str?.trim()) continue;
        const y = viewport.height - item.transform[5];
        if (y < 25 || y > viewport.height - 35) continue;
        let row = rows.find((r) => Math.abs(r.y - y) < 3);
        if (!row) {
          row = { y, items: [] };
          rows.push(row);
        }
        row.items.push(item);
      }
      rows.sort((a, b) => a.y - b.y);
      pages.push({
        number: n,
        width: viewport.width,
        height: viewport.height,
        rows: rows
          .map((r) => ({
            y: r.y,
            text: clean(
              r.items
                .sort((a, b) => a.transform[4] - b.transform[4])
                .map((t) => t.str)
                .join(" "),
            ),
          }))
          .filter(
            (r) =>
              r.text !== "Toán 3" &&
              !(r.y > viewport.height - 80 && r.text === String(n)),
          ),
      });
    }
  } finally {
    await task.destroy();
  }
  return pages;
}
export function parsePages(pages, filename = "Bộ đề đã tải lên") {
  const exams = [];
  let exam = null,
    section = "I. Trắc nghiệm",
    current = null;
  const ensureExam = () => {
    if (!exam) {
      exam = {
        id: randomUUID(),
        title: filename.replace(/\.pdf$/i, ""),
        number: 1,
        questions: [],
        reviewed: false,
      };
      exams.push(exam);
    }
  };
  function finish(endPage, endY) {
    if (!current) return;
    current.text = clean(
      current.lines
        .filter(
          (t) => !/^([.\s…_–-]){5,}$/.test(t) && !/^Bài giải\s*:?$/i.test(t),
        )
        .join("\n"),
    );
    const opts = [...current.text.matchAll(/(?:^|\s)([A-D])[.)]\s*/g)];
    if (opts.length >= 2 && /trắc/i.test(current.section)) {
      current.type = "choice";
      current.prompt = current.text.slice(0, opts[0].index).trim();
      current.options = opts.map((m, i) => ({
        label: m[1],
        text: current.text
          .slice(
            m.index + m[0].length,
            opts[i + 1]?.index ?? current.text.length,
          )
          .trim(),
      }));
    } else {
      current.type = "written";
      current.prompt = current.text;
      current.options = [];
    }
    current.parts = [
      ...current.prompt.matchAll(
        /(?:^|\s)([a-d])[.)]\s+([^]*?)(?=\s+[a-d][.)]\s+|$)/g,
      ),
    ].map((m) => ({ label: m[1], text: m[2].trim() }));
    const pts = current.prompt.match(/\(([\d,.]+)\s*điểm\)/i);
    current.points = pts
      ? Number(pts[1].replace(",", "."))
      : current.type === "choice"
        ? 0.5
        : 1;
    current.correctAnswer = "";
    current.source = [];
    for (let p = current.startPage; p <= endPage; p++) {
      const page = pages.find((x) => x.number === p),
        top = p === current.startPage ? current.startY : 48,
        bottom = p === endPage ? endY : page.height - 42;
      if (bottom > top + 25)
        current.source.push({
          page: p,
          top: Math.max(30, top),
          bottom: Math.min(page.height - 35, bottom),
          width: page.width,
          height: page.height,
        });
    }
    current.needsReview = true;
    current.showSource =
      /hình|tóm tắt|phân số|\bsơ đồ\b/i.test(current.prompt) ||
      current.lines.some((l) => /^\d+$/.test(l));
    delete current.lines;
    delete current.text;
    delete current.startPage;
    delete current.startY;
    exam.questions.push(current);
    current = null;
  }
  for (const page of pages)
    for (const row of page.rows) {
      const heading = row.text.match(/^ĐỀ\s*(?:SỐ\s*)?(\d+)\s*[:.]?$/i);
      if (heading) {
        finish(page.number, row.y - 20);
        exam = {
          id: randomUUID(),
          title: `Đề số ${heading[1]} · Ôn tập học kì I`,
          number: Number(heading[1]),
          questions: [],
          reviewed: false,
        };
        exams.push(exam);
        section = "I. Trắc nghiệm";
        continue;
      }
      if (
        /^(?:[IVX]+|Phần\s*[\dIVX]+)[.\s:]+.*(?:trắc|tự luận)/i.test(row.text)
      ) {
        finish(page.number, row.y - 20);
        section = /tự luận/i.test(row.text) ? "II. Tự luận" : "I. Trắc nghiệm";
        continue;
      }
      const q = row.text.match(/^(?:Câu|Bài)\s*(\d+)\s*[.::)]?\s*(.*)/i);
      if (q) {
        ensureExam();
        const previous = page.rows[page.rows.indexOf(row) - 1];
        if (
          previous &&
          /^\d+$/.test(previous.text) &&
          row.y - previous.y < 15 &&
          current?.lines.at(-1) === previous.text
        )
          current.lines.pop();
        finish(page.number, row.y - 20);
        current = {
          id: randomUUID(),
          number: Number(q[1]),
          section,
          lines: [q[2]],
          startPage: page.number,
          startY: row.y - 20,
        };
      } else if (current) current.lines.push(row.text);
    }
  if (pages.length) finish(pages.at(-1).number, pages.at(-1).height - 42);
  const usable = exams.filter((e) => e.questions.length);
  if (exams.length > usable.length && exams.length > 1)
    throw new Error(
      "Cấu trúc PDF chưa khớp mẫu Toán: có đề không nhận diện được câu hỏi. Chưa nhập để tránh thiếu nội dung. Hãy dùng mẫu Đề số → Câu/Bài trước.",
    );
  if (!usable.length)
    throw new Error(
      "Chưa tìm thấy cấu trúc Câu 1/Bài 1. PDF cần có lớp chữ; bản scan cần OCR trước khi nhập.",
    );
  return {
    exams: usable,
    pageCount: pages.length,
    questionCount: usable.reduce((s, e) => s + e.questions.length, 0),
    warnings: [
      "Nội dung tách tự động cần được đối chiếu với PDF gốc.",
      "Phân số, hình vẽ và sơ đồ được giữ trong ảnh gốc của câu hỏi.",
      "Chưa tự suy đoán đáp án. Giáo viên bổ sung đáp án và duyệt trước khi giao.",
    ],
  };
}
export async function parsePdf(bytes, name) {
  return parsePages(await extractPages(bytes), name);
}
