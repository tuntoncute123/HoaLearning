import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mam-nho-test-"));
let server, teacherCookie, studentCookie, exam, assignment, student;
const root = "http://127.0.0.1:3199";
async function request(
  url,
  { method = "GET", body, cookie = teacherCookie } = {},
) {
  const r = await fetch(root + "/api" + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
before(async () => {
  server = spawn(process.execPath, ["scripts/test-server.mjs"], {
    env: {
      ...process.env,
      TEST_PORT: "3199",
      NODE_ENV: "production",
      DATA_DIR: directory,
      TEST_EMAIL: "test@mam nho.vn".replace(" ", ""),
      TEST_PASSWORD: "StrongTestPassword2026!",
    },
    stdio: "pipe",
  });
  let logs = "";
  server.stderr.on("data", (c) => (logs += c));
  for (let i = 0; i < 600; i++) {
    try {
      const r = await fetch(root + "/api/health");
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server did not start: " + logs);
});
after(async () => {
  if (server && server.exitCode === null) {
    const stopped = new Promise((r) => server.once("exit", r));
    server.kill();
    await stopped;
  }
  fs.rmSync(directory, { recursive: true, force: true });
});
test("teacher authentication, scoped data, exam snapshot, student submission and grading", async () => {
  assert.equal((await request("/session", { cookie: "" })).data.user, null);
  assert.equal((await request("/data", { cookie: "" })).status, 401);
  assert.equal(
    (
      await request("/auth/demo", {
        method: "POST",
        body: { role: "teacher" },
        cookie: "",
      })
    ).status,
    404,
  );
  const login = await request("/auth/login", {
    method: "POST",
    body: { email: "test@mamnho.vn", password: "StrongTestPassword2026!" },
    cookie: "",
  });
  assert.equal(login.status, 200);
  teacherCookie = login.cookie;
  let data = (await request("/data")).data;
  assert.equal(data.exams.length, 20);
  assert.equal(data.students.length, 0);
  exam = (await request("/exams/" + data.exams[0].id)).data;
  assert.equal(exam.questions.length, 10);
  const invalid = await request("/assignments", {
    method: "POST",
    body: {
      examId: data.exams[1].id,
      title: "Draft",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      duration: 40,
    },
  });
  assert.equal(invalid.status, 400);
  student = (
    await request("/students", {
      method: "POST",
      body: { name: "Học sinh kiểm thử" },
    })
  ).data;
  assert.equal(student.code.length, 10);
  const a = await request("/assignments", {
    method: "POST",
    body: {
      examId: exam.id,
      title: "Bài kiểm thử",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      duration: 40,
      instructions: "Đọc đề kĩ.",
    },
  });
  assert.equal(a.status, 200);
  assignment = a.data.id;
  const changed = { ...exam, title: "Đề thay đổi sau khi giao" };
  assert.equal(
    (await request("/exams/" + exam.id, { method: "PUT", body: changed }))
      .status,
    200,
  );
  const s = await request("/auth/login", {
    method: "POST",
    body: { code: student.code },
    cookie: "",
  });
  studentCookie = s.cookie;
  assert.equal(s.status, 200);
  const visible = await request("/assignments/" + assignment, {
    cookie: studentCookie,
  });
  assert.equal(visible.data.exam.title, exam.title);
  assert.ok(
    visible.data.exam.questions.every(
      (q) => !Object.hasOwn(q, "correctAnswer"),
    ),
  );
  assert.equal(
    (await request("/exams/" + exam.id, { cookie: studentCookie })).status,
    403,
  );
  assert.equal(
    (
      await request("/students", {
        method: "POST",
        body: { name: "Unauthorized" },
        cookie: studentCookie,
      })
    ).status,
    403,
  );
  const source = await fetch(
    root + `/api/documents/${visible.data.documentId}/1.png`,
    { headers: { cookie: studentCookie } },
  );
  assert.equal(source.status, 200);
  assert.equal(source.headers.get("content-type"), "image/png");
  const answers = Object.fromEntries(
    exam.questions.map((q) => [
      q.id,
      q.type === "choice" ? q.correctAnswer : "Em đã trình bày cách giải.",
    ]),
  );
  assert.equal(
    (
      await request(`/assignments/${assignment}/attempt`, {
        method: "PUT",
        body: { answers: { unknown: "x" } },
        cookie: studentCookie,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/assignments/${assignment}/attempt`, {
        method: "PUT",
        body: { answers },
        cookie: studentCookie,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/assignments/${assignment}/attempt`, {
        method: "PUT",
        body: { answers, submit: true },
        cookie: studentCookie,
      })
    ).data.grade,
    null,
  );
  assert.equal(
    (
      await request(`/assignments/${assignment}/attempt`, {
        method: "PUT",
        body: { answers },
        cookie: studentCookie,
      })
    ).status,
    409,
  );
  data = (await request("/data")).data;
  const attempt = data.attempts[0];
  assert.ok(attempt.submitted_at);
  assert.equal(
    (await request("/attempts/" + attempt.id, { cookie: studentCookie }))
      .status,
    403,
  );
  assert.equal(
    (
      await request(`/attempts/${attempt.id}/grade`, {
        method: "PUT",
        body: { grade: 11, feedback: "No" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/attempts/${attempt.id}/grade`, {
        method: "PUT",
        body: { grade: 9.5, feedback: "Em làm rất tốt!" },
      })
    ).status,
    200,
  );
  const result = (await request("/data", { cookie: studentCookie })).data;
  assert.equal(result.attempts[0].grade, 9.5);
  assert.equal(result.exams.length, 0);
  assert.equal(result.students.length, 0);
  assert.ok(result.notifications.some((n) => n.title.includes("được chấm")));
  const student2 = (
    await request("/students", {
      method: "POST",
      body: { name: "Học sinh khác" },
    })
  ).data;
  const s2 = await request("/auth/login", {
    method: "POST",
    body: { code: student2.code },
    cookie: "",
  });
  assert.equal(
    (await request("/data", { cookie: s2.cookie })).data.attempts.length,
    0,
  );
  assert.equal(
    (
      await request("/push/subscribe", {
        method: "POST",
        body: {
          endpoint: "https://localhost/private",
          keys: { auth: "x", p256dh: "y" },
        },
      })
    ).status,
    400,
  );
  const key = (await request("/push/key")).data.publicKey;
  assert.ok(key.length > 80);
  const cross = await fetch(root + "/api/students", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: teacherCookie,
      origin: "https://evil.example",
    },
    body: JSON.stringify({ name: "Cross site" }),
  });
  assert.equal(cross.status, 403);
});

test("chunk uploads are authenticated, ordered, bounded and persist complete PDFs in PostgreSQL", async () => {
  const file = fs
    .readdirSync(".")
    .find((f) => f.includes("20 ĐỀ") && f.endsWith(".pdf"));
  // A valid PDF with trailing whitespace spans six one-MiB chunks (> Vercel's 4.5 MB).
  const bytes = Buffer.concat([
    fs.readFileSync(file),
    Buffer.alloc(5 * 1024 * 1024, 32),
  ]);
  assert.equal(
    (
      await request("/uploads", {
        method: "POST",
        body: { name: file, size: bytes.length },
        cookie: studentCookie,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/uploads", {
        method: "POST",
        body: { name: file, size: 21 * 1024 * 1024 },
      })
    ).status,
    400,
  );
  const created = await request("/uploads", {
    method: "POST",
    body: { name: file, size: bytes.length },
  });
  assert.equal(created.status, 200);
  const uploadId = created.data.id;
  assert.equal(
    (await request("/import", { method: "POST", body: { uploadId } })).status,
    422,
  );
  for (
    let offset = 0, part = 0;
    offset < bytes.length;
    offset += 1024 * 1024, part++
  ) {
    const body = {
      data: bytes.subarray(offset, offset + 1024 * 1024).toString("base64"),
    };
    assert.equal(
      (await request(`/uploads/${uploadId}/${part}`, { method: "PUT", body }))
        .status,
      200,
    );
    // Retry of a chunk is idempotent.
    if (part === 0)
      assert.equal(
        (await request(`/uploads/${uploadId}/${part}`, { method: "PUT", body }))
          .status,
        200,
      );
  }
  const imported = await request("/import", {
    method: "POST",
    body: { uploadId },
  });
  assert.equal(imported.status, 200);
  assert.equal(imported.data.exams.length, 20);
  assert.equal(imported.data.questionCount, 201);
  const image = await fetch(
    root + `/api/documents/${imported.data.documentId}/1.png`,
    { headers: { cookie: teacherCookie } },
  );
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.equal(image.headers.get("cache-control"), "no-store");
  assert.ok((await image.arrayBuffer()).byteLength > 1000);
  const forbidden = await fetch(
    root + `/api/documents/${imported.data.documentId}/1.png`,
    { headers: { cookie: studentCookie } },
  );
  assert.equal(forbidden.status, 403);
  assert.equal(
    (await request("/import", { method: "POST", body: { uploadId } })).status,
    422,
  );
});

test("simultaneous autosave and submit never revert a submitted attempt", async () => {
  const newcomer = (
    await request("/students", {
      method: "POST",
      body: { name: "Kiểm thử đồng thời" },
    })
  ).data;
  const login = await request("/auth/login", {
    method: "POST",
    cookie: "",
    body: { code: newcomer.code },
  });
  const answers = { [exam.questions[0].id]: "B" };
  const results = await Promise.all([
    request(`/assignments/${assignment}/attempt`, {
      method: "PUT",
      cookie: login.cookie,
      body: { answers, submit: true },
    }),
    request(`/assignments/${assignment}/attempt`, {
      method: "PUT",
      cookie: login.cookie,
      body: { answers: {}, submit: false },
    }),
  ]);
  assert.equal(results[0].status, 200);
  assert.ok([200, 409].includes(results[1].status));
  const after = await request(`/assignments/${assignment}`, {
    cookie: login.cookie,
  });
  assert.ok(after.data.attempt.submitted_at);
  assert.deepEqual(JSON.parse(after.data.attempt.answers), answers);
});
