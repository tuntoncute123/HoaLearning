import { db, id } from "./database.js";
import { parsePdf } from "./parser.js";
export async function storeDocument(bytes, name, parsed) {
  const docId = id();
  await db.transaction(async () => {
    await db
      .prepare("INSERT INTO documents(id,name,filename,pages) VALUES(?,?,?,?)")
      .run(docId, name, docId + ".pdf", parsed.pageCount);
    await db
      .prepare("INSERT INTO assets(key,document_id,mime,bytes) VALUES(?,?,?,?)")
      .run(docId + ".pdf", docId, "application/pdf", bytes);
    for (const e of parsed.exams)
      await db
        .prepare(
          "INSERT INTO exams(id,document_id,title,content,reviewed) VALUES(?,?,?,?,?)",
        )
        .run(e.id, docId, e.title, JSON.stringify(e), e.reviewed ? 1 : 0);
  });
  return docId;
}
export function documentRoutes(app, auth, teacher, fail) {
  app.post("/api/uploads", auth, teacher, async (req, res) => {
    const { name, size } = req.body;
    if (
      typeof name !== "string" ||
      name.length > 240 ||
      !name.toLowerCase().endsWith(".pdf") ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > 20 * 1024 * 1024
    )
      return fail(res, 400, "Chọn PDF tối đa 20 MB.");
    await db.prepare("DELETE FROM uploads WHERE expires<?").run(Date.now());
    const uploadId = await db.transaction(async () => {
      await db
        .prepare("SELECT id FROM users WHERE id=? FOR UPDATE")
        .get(req.user.id);
      const active = await db
        .prepare("SELECT COUNT(*) AS total FROM uploads WHERE user_id=?")
        .get(req.user.id);
      if (active.total >= 3) return null;
      const uid = id();
      await db
        .prepare(
          "INSERT INTO uploads(id,user_id,name,size,expires) VALUES(?,?,?,?,?)",
        )
        .run(uid, req.user.id, name, size, Date.now() + 15 * 60 * 1000);
      return uid;
    });
    if (!uploadId)
      return fail(
        res,
        429,
        "Đang có nhiều tệp tải lên. Hãy đợi tối đa 15 phút rồi thử lại.",
      );
    res.json({ id: uploadId });
  });
  app.put("/api/uploads/:id/:part", auth, teacher, async (req, res) => {
    const part = Number(req.params.part),
      { data } = req.body;
    if (
      !Number.isInteger(part) ||
      part < 0 ||
      part >= 20 ||
      typeof data !== "string" ||
      data.length > 1398104 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(data)
    )
      return fail(res, 400, "Phần tệp không hợp lệ.");
    const bytes = Buffer.from(data, "base64");
    const ok = await db.transaction(async () => {
      const upload = await db
        .prepare(
          "SELECT * FROM uploads WHERE id=? AND user_id=? AND expires>? FOR UPDATE",
        )
        .get(req.params.id, req.user.id, Date.now());
      if (!upload) return false;
      const expected = Math.min(1024 * 1024, upload.size - part * 1024 * 1024);
      if (bytes.length !== expected || expected <= 0) return false;
      await db
        .prepare(
          "INSERT INTO upload_parts(upload_id,part,bytes) VALUES(?,?,?) ON CONFLICT(upload_id,part) DO UPDATE SET bytes=excluded.bytes",
        )
        .run(upload.id, part, bytes);
      return true;
    });
    if (!ok)
      return fail(
        res,
        400,
        "Tệp đã hết hạn hoặc kích thước phần tệp không đúng.",
      );
    res.json({ ok: true });
  });
  app.delete("/api/uploads/:id", auth, teacher, async (req, res) => {
    await db
      .prepare("DELETE FROM uploads WHERE id=? AND user_id=?")
      .run(req.params.id, req.user.id);
    res.json({ ok: true });
  });
  app.post("/api/import", auth, teacher, async (req, res) => {
    try {
      const result = await db.transaction(async () => {
        const upload = await db
          .prepare(
            "SELECT * FROM uploads WHERE id=? AND user_id=? AND expires>? FOR UPDATE",
          )
          .get(String(req.body.uploadId || ""), req.user.id, Date.now());
        if (!upload) throw new Error("Tệp đã hết hạn. Hãy tải lại PDF.");
        const parts = await db
          .prepare(
            "SELECT bytes FROM upload_parts WHERE upload_id=? ORDER BY part",
          )
          .all(upload.id);
        const bytes = Buffer.concat(parts.map((p) => p.bytes));
        if (
          bytes.length !== upload.size ||
          !bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"))
        )
          throw new Error("PDF chưa tải đủ hoặc không hợp lệ.");
        const parsed = await parsePdf(bytes, upload.name);
        const documentId = await storeDocument(bytes, upload.name, parsed);
        await db.prepare("DELETE FROM uploads WHERE id=?").run(upload.id);
        return { ...parsed, documentId };
      });
      res.json(result);
    } catch (e) {
      fail(
        res,
        422,
        e.message.startsWith("PDF") ||
          /Tệp|Cấu trúc|Chưa tìm|Vui lòng/.test(e.message)
          ? e.message
          : "Không thể đọc PDF. Hãy kiểm tra tệp hoặc chia nhỏ PDF.",
      );
    }
  });
  app.get("/api/documents/:id/:page.png", auth, async (req, res) => {
    const doc = await db
        .prepare("SELECT * FROM documents WHERE id=?")
        .get(req.params.id),
      n = Number(req.params.page);
    if (!doc || !Number.isInteger(n) || n < 1 || n > doc.pages)
      return fail(res, 404, "Không tìm thấy trang PDF.");
    if (
      req.user.role !== "teacher" &&
      !(await db
        .prepare(
          "SELECT a.id FROM assignments a JOIN exams e ON e.id=a.exam_id WHERE e.document_id=?",
        )
        .get(doc.id))
    )
      return fail(res, 403, "Không có quyền xem tài liệu.");
    const key = `${doc.id}-${n}.png`;
    let asset = await db
      .prepare("SELECT bytes FROM assets WHERE key=?")
      .get(key);
    if (!asset) {
      const source = await db
        .prepare("SELECT bytes FROM assets WHERE key=?")
        .get(doc.filename);
      if (!source) return fail(res, 404, "Không tìm thấy PDF gốc.");
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const { createCanvas } = await import("@napi-rs/canvas");
      const task = getDocument({
        data: new Uint8Array(source.bytes),
        useSystemFonts: true,
        isEvalSupported: false,
      });
      try {
        const pdf = await task.promise,
          p = await pdf.getPage(n),
          v = p.getViewport({ scale: 1.7 });
        if (v.width * v.height > 16000000)
          return fail(res, 422, "Trang PDF quá lớn để hiển thị.");
        const canvas = createCanvas(Math.ceil(v.width), Math.ceil(v.height));
        await p.render({ canvasContext: canvas.getContext("2d"), viewport: v })
          .promise;
        asset = { bytes: canvas.toBuffer("image/png") };
        if (asset.bytes.length > 4 * 1024 * 1024)
          return fail(
            res,
            422,
            "Ảnh PDF quá lớn. Hãy dùng PDF có trang nhỏ hơn.",
          );
        await db
          .prepare(
            "INSERT INTO assets(key,document_id,mime,bytes) VALUES(?,?,?,?) ON CONFLICT(key) DO NOTHING",
          )
          .run(key, doc.id, "image/png", asset.bytes);
      } finally {
        await task.destroy();
      }
    }
    res.set("Content-Type", "image/png").send(asset.bytes);
  });
}
