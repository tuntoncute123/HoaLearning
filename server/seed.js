import fs from "node:fs";
import { db, id, hashPassword } from "./database.js";
import { parsePdf } from "./parser.js";
export async function seed() {
  const isDemo = process.env.NODE_ENV !== "production";
  if (!(await db.prepare("SELECT id FROM users WHERE role='teacher'").get())) {
    if (
      !isDemo &&
      (!process.env.TEACHER_PASSWORD ||
        process.env.TEACHER_PASSWORD.length < 12)
    )
      throw new Error(
        "Set TEACHER_PASSWORD (at least 12 characters) before first production start.",
      );
    await db
      .prepare(
        "INSERT INTO users(id,name,role,email,password) VALUES(?,?,?,?,?)",
      )
      .run(
        id(),
        process.env.TEACHER_NAME || "Cô Minh Anh",
        "teacher",
        process.env.TEACHER_EMAIL || "giaovien@mamnho.vn",
        hashPassword(process.env.TEACHER_PASSWORD || "MamNho@2026"),
      );
  }
  if (await db.prepare("SELECT id FROM documents LIMIT 1").get()) return;
  const file = fs
    .readdirSync(".")
    .find((f) => f.includes("20 ĐỀ") && f.toLowerCase().endsWith(".pdf"));
  if (!file) return;
  const docId = id(),
    filename = docId + ".pdf",
    bytes = fs.readFileSync(file),
    parsed = await parsePdf(bytes, file);
  await db
    .prepare("INSERT INTO documents(id,name,filename,pages) VALUES(?,?,?,?)")
    .run(docId, file, filename, parsed.pageCount);
  await db
    .prepare("INSERT INTO assets(key,document_id,mime,bytes) VALUES(?,?,?,?)")
    .run(filename, docId, "application/pdf", bytes);
  for (const e of parsed.exams) {
    if (e.number === 1) {
      const keys = ["B", "D", "D", "A", "B", "A"];
      e.questions.forEach((q, i) => {
        q.correctAnswer = keys[i] || "";
        q.needsReview = false;
      });
      const q8 = e.questions.find((q) => q.number === 8);
      if (q8)
        q8.prompt =
          "Dựa vào sơ đồ trong đề gốc, em hãy tính tổng cân nặng của con trâu và con bò. (2 điểm)";
      const q10 = e.questions.find((q) => q.number === 10);
      if (q10)
        q10.prompt =
          "Quan sát hình bên dưới. Có bao nhiêu hình tam giác và bao nhiêu hình tứ giác? (1 điểm)";
      const q4 = e.questions.find((q) => q.number === 4);
      if (q4) q4.showSource = false;
      const q9 = e.questions.find((q) => q.number === 9);
      if (q9) {
        q9.prompt =
          "Một thùng đựng 64 lít nước. Người ta đã lấy ra 1/8 số lít nước. Hỏi trong thùng còn lại bao nhiêu lít nước? (2 điểm)";
        q9.showSource = false;
      }
      e.reviewed = true;
    }
    await db
      .prepare(
        "INSERT INTO exams(id,document_id,title,content,reviewed) VALUES(?,?,?,?,?)",
      )
      .run(e.id, docId, e.title, JSON.stringify(e), e.reviewed ? 1 : 0);
  }
  if (isDemo) {
    const names = [
      "Nguyễn Minh Khang",
      "Trần Bảo Ngọc",
      "Lê Gia Hân",
      "Phạm Đức Anh",
      "Hoàng Hải Đăng",
      "Vũ Khánh Linh",
    ];
    for (const [i, name] of names.entries())
      await db
        .prepare("INSERT INTO users(id,name,role,code) VALUES(?,?,?,?)")
        .run(id(), name, "student", `DEMO000${i + 1}`);
    const e = parsed.exams[0],
      assignment = id(),
      deadline = new Date(Date.now() + 86400000 * 3).toISOString();
    await db
      .prepare(
        "INSERT INTO assignments(id,exam_id,title,deadline,duration,instructions,snapshot) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        assignment,
        e.id,
        "Cùng chinh phục đề số 1",
        deadline,
        40,
        "Em đọc kĩ đề, làm từng câu và kiểm tra lại trước khi nộp nhé. Với bài tự luận, hãy ghi cả cách làm của em!",
        JSON.stringify(e),
      );
    const students = await db
      .prepare("SELECT id FROM users WHERE role='student'")
      .all();
    for (let i = 1; i < 4; i++) {
      const answers = Object.fromEntries(
        e.questions.map((q, j) => [
          q.id,
          j < 6
            ? j === i
              ? "C"
              : q.correctAnswer
            : "Bài làm minh họa — giáo viên chấm trực tiếp.",
        ]),
      );
      await db
        .prepare(
          "INSERT INTO attempts(id,assignment_id,student_id,answers,submitted_at,grade,feedback) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          id(),
          assignment,
          students[i].id,
          JSON.stringify(answers),
          new Date(Date.now() - 3600000 * i).toISOString(),
          i === 3 ? null : 8 + i / 2,
          i === 3 ? null : "Em làm bài rất cố gắng. Hãy tiếp tục phát huy nhé!",
        );
    }
  }
  console.log(
    `Imported ${parsed.exams.length} exams, ${parsed.questionCount} questions from ${parsed.pageCount} pages.`,
  );
}
