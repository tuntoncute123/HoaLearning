import { randomBytes, createHash } from "node:crypto";
import { db, id, publicUser, verifyPassword } from "./database.js";
import { pushKeys, notifyUsers, validSubscription } from "./push.js";
import { createRouter } from "./http.js";
import { documentRoutes } from "./documents.js";
const app = createRouter(),
  production = process.env.NODE_ENV === "production";
app.use(async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin) {
    const allowed = process.env.APP_ORIGIN || req.url.origin;
    if (
      req.headers.origin !== allowed &&
      !(
        !production &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(req.headers.origin)
      )
    )
      return res.status(403).json({
        error: "Nguồn yêu cầu không hợp lệ.",
      });
  }
  const token = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("mam_session="))
    ?.slice(12);
  if (token) {
    const s = await db
      .prepare("SELECT user_id FROM sessions WHERE token=? AND expires>?")
      .get(token, Date.now());
    if (s)
      req.user = await db
        .prepare("SELECT * FROM users WHERE id=?")
        .get(s.user_id);
  }
  next();
});
const fail = (res, status, error) =>
  res.status(status).json({
    error,
  });
const auth = (req, res, next) =>
  req.user ? next() : fail(res, 401, "Vui lòng đăng nhập để tiếp tục.");
const teacher = (req, res, next) =>
  req.user?.role === "teacher"
    ? next()
    : fail(res, 403, "Chức năng dành cho giáo viên.");
const student = (req, res, next) =>
  req.user?.role === "student"
    ? next()
    : fail(res, 403, "Hãy vào tài khoản học sinh để làm bài.");
async function session(res, u) {
  const token = randomBytes(32).toString("hex");
  await db
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(token, u.id, Date.now() + 86400000 * 14);
  res.cookie("mam_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    maxAge: 86400000 * 14,
    path: "/",
  });
  return publicUser(u);
}
async function limiter(req, res, next) {
  const identity = req.body.code
    ? "code:" + String(req.body.code).trim().toUpperCase()
    : "email:" + String(req.body.email || req.user?.id || "").trim();
  // Persistent counters work across serverless instances. Vercel overwrites x-vercel-forwarded-for.
  const ip = process.env.VERCEL
    ? req.headers["x-vercel-forwarded-for"] || "unknown"
    : "local";
  for (const value of [identity, "ip:" + ip]) {
    const key = createHash("sha256")
        .update(req.url.pathname + ":" + value)
        .digest("hex"),
      now = Date.now();
    const row = await db
      .prepare(
        "INSERT INTO rate_limits(key,hits,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires<? THEN 1 ELSE rate_limits.hits+1 END,expires=CASE WHEN rate_limits.expires<? THEN excluded.expires ELSE rate_limits.expires END RETURNING hits",
      )
      .get(key, now + 900000, now, now);
    if (row.hits > (value.startsWith("ip:") ? 200 : 30)) {
      res.set("Retry-After", "900");
      return fail(res, 429, "Bạn thử quá nhiều lần. Vui lòng đợi 15 phút.");
    }
  }
  next();
}
app.get("/api/health", async (_, res) => {
  await db.query("SELECT 1");
  res.json({ ok: true, database: "postgresql" });
});
app.get("/api/session", async (req, res) => {
  if (!req.user && !production) {
    const u = await db
      .prepare("SELECT * FROM users WHERE role='teacher'")
      .get();
    return res.json({
      user: await session(res, u),
      demo: true,
    });
  }
  res.json({
    user: publicUser(req.user),
    demo: !production,
  });
});
app.post("/api/auth/login", limiter, async (req, res) => {
  let u;
  const { email, password, code } = req.body;
  if (code)
    u = await db
      .prepare("SELECT * FROM users WHERE code=? AND role='student'")
      .get(String(code).trim().toUpperCase());
  else {
    u = await db
      .prepare("SELECT * FROM users WHERE email=? AND role='teacher'")
      .get(String(email).trim());
    if (u && !verifyPassword(String(password), u.password)) u = null;
  }
  if (!u)
    return fail(
      res,
      401,
      "Thông tin đăng nhập chưa đúng. Em kiểm tra lại nhé.",
    );
  res.json({
    user: await session(res, u),
    demo: !production,
  });
});
app.post("/api/auth/demo", async (req, res) => {
  if (production) return fail(res, 404, "Không tìm thấy.");
  const u = await db
    .prepare("SELECT * FROM users WHERE role=? ORDER BY created_at LIMIT 1")
    .get(req.body.role === "student" ? "student" : "teacher");
  if (!u) return fail(res, 404, "Chưa có tài khoản mẫu.");
  res.json({
    user: await session(res, u),
    demo: true,
  });
});
app.post("/api/auth/logout", auth, async (req, res) => {
  const token = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("mam_session="))
    ?.slice(12);
  if (token) await db.prepare("DELETE FROM sessions WHERE token=?").run(token);
  res.clearCookie("mam_session", {
    path: "/",
  });
  res.json({
    ok: true,
  });
});
app.get("/api/data", auth, async (req, res) => {
  const assignments = (
    await db
      .prepare(
        "SELECT a.*, (SELECT COUNT(*) FROM attempts t WHERE t.assignment_id=a.id AND submitted_at IS NOT NULL) AS submitted FROM assignments a ORDER BY created_at DESC",
      )
      .all()
  ).map((a) => {
    const { snapshot, ...rest } = a;
    return {
      ...rest,
      questionCount: JSON.parse(snapshot).questions.length,
    };
  });
  const attempts = (
    req.user.role === "teacher"
      ? await db
          .prepare(
            "SELECT a.*,u.name AS student_name FROM attempts a JOIN users u ON a.student_id=u.id",
          )
          .all()
      : await db
          .prepare("SELECT * FROM attempts WHERE student_id=?")
          .all(req.user.id)
  ).map((a) => ({
    ...a,
    answers: JSON.parse(a.answers),
  }));
  const exams =
    req.user.role === "teacher"
      ? (
          await db
            .prepare(
              "SELECT e.*,d.name AS document_name FROM exams e LEFT JOIN documents d ON e.document_id=d.id ORDER BY e.created_at,e.sort_order",
            )
            .all()
        ).map(({ content, ...e }) => ({
          ...e,
          questionCount: JSON.parse(content).questions.length,
          sections: [
            ...new Set(JSON.parse(content).questions.map((q) => q.section)),
          ],
        }))
      : [];
  const students =
    req.user.role === "teacher"
      ? await db
          .prepare(
            "SELECT id,name,code,created_at FROM users WHERE role='student'",
          )
          .all()
      : [];
  const notifications = await db
    .prepare(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
    )
    .all(req.user.id);
  res.json({
    assignments,
    attempts,
    exams,
    students,
    notifications,
  });
});
app.get("/api/exams/:id", auth, teacher, async (req, res) => {
  const e = await db
    .prepare("SELECT * FROM exams WHERE id=?")
    .get(req.params.id);
  if (!e) return fail(res, 404, "Không tìm thấy đề.");
  res.json({
    ...e,
    ...JSON.parse(e.content),
    reviewed: !!e.reviewed,
  });
});
function validateExam(e) {
  if (
    typeof e.title !== "string" ||
    !e.title.trim() ||
    e.title.length > 200 ||
    !Array.isArray(e.questions) ||
    !e.questions.length ||
    e.questions.length > 200
  )
    return false;
  const ids = new Set();
  return e.questions.every((q) => {
    if (typeof q.id !== "string" || ids.has(q.id)) return false;
    ids.add(q.id);
    return (
      typeof q.prompt === "string" &&
      q.prompt.trim() &&
      q.prompt.length <= 20000 &&
      typeof q.section === "string" &&
      ["choice", "written"].includes(q.type) &&
      Number.isFinite(q.points) &&
      q.points > 0 &&
      q.points <= 100 &&
      Array.isArray(q.options) &&
      (!q.correctAnswer ||
        q.options.some((o) => o.label === q.correctAnswer)) &&
      (q.type !== "choice" ||
        (q.options.length >= 2 &&
          q.options.length <= 4 &&
          new Set(q.options.map((o) => o.label)).size === q.options.length &&
          q.options.every(
            (o) =>
              /^[A-D]$/.test(o.label) &&
              typeof o.text === "string" &&
              o.text.trim(),
          )))
    );
  });
}
app.put("/api/exams/:id", auth, teacher, async (req, res) => {
  const old = await db
    .prepare("SELECT * FROM exams WHERE id=?")
    .get(req.params.id);
  if (!old) return fail(res, 404, "Không tìm thấy đề.");
  if (!validateExam(req.body))
    return fail(
      res,
      400,
      "Kiểm tra tên đề, nội dung, điểm và lựa chọn của từng câu.",
    );
  const original = JSON.parse(old.content);
  const e = {
    ...original,
    title: req.body.title.trim(),
    reviewed: !!req.body.reviewed,
    questions: req.body.questions.map((q) => {
      const orig = original.questions.find((o) => o.id === q.id);
      return {
        ...q,
        source: orig?.source || [],
      };
    }),
  };
  if (
    e.reviewed &&
    e.questions.some((q) => q.type === "choice" && !q.correctAnswer)
  )
    return fail(
      res,
      400,
      "Hãy chọn đáp án đúng cho tất cả câu trắc nghiệm trước khi duyệt.",
    );
  await db
    .prepare("UPDATE exams SET title=?,content=?,reviewed=? WHERE id=?")
    .run(e.title, JSON.stringify(e), e.reviewed ? 1 : 0, old.id);
  res.json({
    ok: true,
  });
});
app.post("/api/assignments", auth, teacher, async (req, res) => {
  const { examId, title, deadline, duration, instructions } = req.body;
  const row = await db
    .prepare("SELECT * FROM exams WHERE id=?")
    .get(examId || "");
  if (!row?.reviewed) return fail(res, 400, "Hãy duyệt đề trước khi giao bài.");
  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.length > 200 ||
    !Number.isFinite(Number(duration)) ||
    Number(duration) < 5 ||
    Number(duration) > 180 ||
    !Number.isFinite(Date.parse(deadline)) ||
    Date.parse(deadline) <= Date.now()
  )
    return fail(
      res,
      400,
      "Kiểm tra tên bài, thời gian 5–180 phút và hạn nộp trong tương lai.",
    );
  const aid = id();
  await db
    .prepare(
      "INSERT INTO assignments(id,exam_id,title,deadline,duration,instructions,snapshot) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      aid,
      row.id,
      title.trim(),
      new Date(deadline).toISOString(),
      Number(duration),
      String(instructions || "").slice(0, 2000),
      row.content,
    );
  const push = await notifyUsers(
    (await db.prepare("SELECT id FROM users WHERE role='student'").all()).map(
      (u) => u.id,
    ),
    "Có bài tập mới! 🌱",
    title.trim(),
    `/?assignment=${aid}`,
  );
  res.json({
    id: aid,
    push,
  });
});
app.get("/api/assignments/:id", auth, async (req, res) => {
  const a = await db
    .prepare("SELECT * FROM assignments WHERE id=?")
    .get(req.params.id);
  if (!a) return fail(res, 404, "Không tìm thấy bài tập.");
  const e = JSON.parse(a.snapshot);
  delete a.snapshot;
  if (req.user.role === "student")
    e.questions = e.questions.map(({ correctAnswer, needsReview, ...q }) => q);
  res.json({
    ...a,
    exam: e,
    attempt:
      req.user.role === "student"
        ? await db
            .prepare(
              "SELECT * FROM attempts WHERE assignment_id=? AND student_id=?",
            )
            .get(a.id, req.user.id)
        : null,
    documentId: (
      await db
        .prepare("SELECT document_id FROM exams WHERE id=?")
        .get(a.exam_id)
    )?.document_id,
  });
});
function validateAnswers(answers, e) {
  return (
    answers &&
    typeof answers === "object" &&
    !Array.isArray(answers) &&
    Object.entries(answers).every(([key, value]) => {
      const q = e.questions.find((q) => q.id === key);
      return (
        q &&
        typeof value === "string" &&
        value.length <= 10000 &&
        (q.type !== "choice" ||
          !value ||
          q.options.some((o) => o.label === value))
      );
    })
  );
}
app.put("/api/assignments/:id/attempt", auth, student, async (req, res) => {
  const a = await db
    .prepare("SELECT * FROM assignments WHERE id=?")
    .get(req.params.id);
  if (!a) return fail(res, 404, "Không tìm thấy bài tập.");
  const e = JSON.parse(a.snapshot),
    { answers, submit } = req.body;
  if (!validateAnswers(answers, e))
    return fail(res, 400, "Câu trả lời không hợp lệ.");
  const old = await db
    .prepare("SELECT * FROM attempts WHERE assignment_id=? AND student_id=?")
    .get(a.id, req.user.id);
  if (old?.submitted_at) return fail(res, 409, "Bài này đã được nộp rồi.");
  let grade = null;
  if (
    submit &&
    e.questions.every((q) => q.type === "choice" && q.correctAnswer)
  ) {
    const total = e.questions.reduce((n, q) => n + q.points, 0);
    grade =
      Math.round(
        (100 *
          e.questions.reduce(
            (n, q) => n + (answers[q.id] === q.correctAnswer ? q.points : 0),
            0,
          )) /
          total,
      ) / 10;
  }
  const when = submit ? new Date().toISOString() : null;
  const saved = await db
    .prepare(
      "INSERT INTO attempts(id,assignment_id,student_id,answers,submitted_at,grade) VALUES(?,?,?,?,?,?) ON CONFLICT(assignment_id,student_id) DO UPDATE SET answers=excluded.answers,submitted_at=excluded.submitted_at,grade=excluded.grade WHERE attempts.submitted_at IS NULL",
    )
    .run(
      old?.id || id(),
      a.id,
      req.user.id,
      JSON.stringify(answers),
      when,
      grade,
    );
  if (!saved.changes) return fail(res, 409, "Bài này đã được nộp rồi.");
  if (submit)
    await notifyUsers(
      (await db.prepare("SELECT id FROM users WHERE role='teacher'").all()).map(
        (u) => u.id,
      ),
      "Một bài làm mới",
      `${req.user.name} đã nộp “${a.title}”.`,
      "/?page=results",
    );
  res.json({
    saved: true,
    submitted: !!submit,
    grade,
  });
});
app.get("/api/attempts/:id", auth, teacher, async (req, res) => {
  const a = await db
    .prepare(
      "SELECT t.*,u.name AS student_name FROM attempts t JOIN users u ON u.id=t.student_id WHERE t.id=?",
    )
    .get(req.params.id);
  if (!a) return fail(res, 404, "Không tìm thấy bài làm.");
  const assignment = await db
    .prepare("SELECT * FROM assignments WHERE id=?")
    .get(a.assignment_id);
  res.json({
    ...a,
    answers: JSON.parse(a.answers),
    exam: JSON.parse(assignment.snapshot),
    assignmentTitle: assignment.title,
    documentId: (
      await db
        .prepare("SELECT document_id FROM exams WHERE id=?")
        .get(assignment.exam_id)
    )?.document_id,
  });
});
app.put("/api/attempts/:id/grade", auth, teacher, async (req, res) => {
  const a = await db
    .prepare("SELECT * FROM attempts WHERE id=?")
    .get(req.params.id);
  if (!a?.submitted_at) return fail(res, 400, "Bài làm chưa được nộp.");
  const { grade, feedback } = req.body;
  if (
    typeof grade !== "number" ||
    !Number.isFinite(grade) ||
    grade < 0 ||
    grade > 10 ||
    typeof feedback !== "string" ||
    feedback.length > 2000
  )
    return fail(res, 400, "Điểm cần nằm trong khoảng 0–10.");
  await db
    .prepare("UPDATE attempts SET grade=?,feedback=? WHERE id=?")
    .run(grade, feedback, a.id);
  await notifyUsers(
    [a.student_id],
    "Bài của em đã được chấm! ⭐",
    "Vào Mầm Nhỏ để xem điểm và lời nhắn của cô nhé.",
    "/?page=results",
  );
  res.json({
    ok: true,
  });
});
app.post("/api/students", auth, teacher, async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (name.length < 2 || name.length > 80)
    return fail(res, 400, "Tên học sinh cần có 2–80 ký tự.");
  const student = {
    id: id(),
    name,
    code: randomBytes(5).toString("hex").toUpperCase(),
  };
  await db
    .prepare("INSERT INTO users(id,name,role,code) VALUES(?,?,'student',?)")
    .run(student.id, name, student.code);
  res.json(student);
});
app.get("/api/push/key", auth, async (_, res) =>
  res.json({ publicKey: (await pushKeys()).publicKey }),
);
app.post("/api/push/subscribe", auth, async (req, res) => {
  if (!validSubscription(req.body))
    return fail(res, 400, "Thiết bị chưa cung cấp đăng ký thông báo hợp lệ.");
  await db
    .prepare(
      "INSERT INTO subscriptions(endpoint,user_id,payload) VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,payload=excluded.payload",
    )
    .run(req.body.endpoint, req.user.id, JSON.stringify(req.body));
  res.json({
    ok: true,
  });
});
app.delete("/api/push/subscribe", auth, async (req, res) => {
  await db
    .prepare("DELETE FROM subscriptions WHERE endpoint=? AND user_id=?")
    .run(String(req.body.endpoint || ""), req.user.id);
  res.json({
    ok: true,
  });
});
app.post("/api/push/test", auth, limiter, async (req, res) =>
  res.json(
    await notifyUsers(
      [req.user.id],
      "Xin chào từ Mầm Nhỏ! 🌱",
      "Thông báo đã sẵn sàng. Mình cùng học nhé!",
      "/",
    ),
  ),
);
app.post("/api/notifications/read", auth, async (req, res) => {
  await db
    .prepare("UPDATE notifications SET read=1 WHERE user_id=?")
    .run(req.user.id);
  res.json({
    ok: true,
  });
});
documentRoutes(app, auth, teacher, fail);
export const handleRequest = app.handle;
