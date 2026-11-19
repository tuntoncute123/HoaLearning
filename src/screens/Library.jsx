import { useState, useRef } from "react";
import {
  Upload,
  Search,
  FileText,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  Check,
  ChevronDown,
  Save,
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
import {
  Button,
  Badge,
  PageHeading,
  Empty,
  Modal,
  Field,
  SourceImage,
  Loading,
} from "../components/UI";
import { api, uploadPdf } from "../lib/api";
export default function Library({ data, onImport, onEdit, onAssign }) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const exams = data.exams.filter(
    (e) =>
      (filter === "all" || (filter === "ready" ? e.reviewed : !e.reviewed)) &&
      e.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="CHUẨN BỊ NHẸ NHÀNG, DẠY HỌC THẢNH THƠI"
        title="Thư viện đề"
        description="Một nơi gọn gàng cho tất cả những bài học của bạn."
      >
        <Button onClick={onImport}>
          <Upload size={18} />
          Tải bộ đề lên
        </Button>
      </PageHeading>
      <div className="library-banner">
        <span className="library-banner-icon">
          <BookOpen size={32} />
        </span>
        <div>
          <h3>20 đề hay, ngàn điều để khám phá</h3>
          <p>
            Bộ đề Toán lớp 3 học kì I đã có trong thư viện. Duyệt nội dung và
            gửi đến lớp của bạn.
          </p>
        </div>
        <Badge tone="purple">Toán lớp 3</Badge>
      </div>
      <div className="filter-toolbar">
        <div className="tabs" aria-label="Lọc đề">
          {[
            ["all", "Tất cả"],
            ["ready", "Đã duyệt"],
            ["draft", "Bản nháp"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>
                {
                  data.exams.filter(
                    (e) =>
                      value === "all" ||
                      (value === "ready" ? e.reviewed : !e.reviewed),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Tìm đề"
            placeholder="Tìm tên đề trong thư viện…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="exam-grid">
        {exams.map((e, i) => (
          <article className="exam-card" key={e.id}>
            <div className={`exam-cover cover-${i % 4}`}>
              <div className="paper-illustration">
                <span>TOÁN LỚP 3</span>
                <strong>
                  {e.title.match(/Đề số \d+/)?.[0] || "Bộ đề mới"}
                </strong>
                <i />
                <i />
                <i />
                <div>
                  2 + 3 = ? <span>✧</span>
                </div>
              </div>
              <span className="cover-decoration">
                {["÷", "×", "+", "="][i % 4]}
              </span>
              <span className="cover-star">✦</span>
            </div>
            <div className="exam-card-body">
              <div className="exam-card-tags">
                <Badge tone="purple">Học kì I</Badge>
                <Badge tone={e.reviewed ? "green" : "gray"}>
                  {e.reviewed ? "Đã duyệt" : "Cần duyệt"}
                </Badge>
              </div>
              <h3>{e.title}</h3>
              <p>
                <FileText size={15} />
                {e.questionCount} câu <span>·</span> {e.sections.length} phần{" "}
                <span>·</span> Lớp 3
              </p>
              <div className="exam-card-actions">
                <Button variant="secondary" onClick={() => onEdit(e.id)}>
                  <Eye size={16} />
                  {e.reviewed ? "Xem đề" : "Duyệt đề"}
                </Button>
                <button
                  className="text-link"
                  onClick={() => (e.reviewed ? onAssign(e.id) : onEdit(e.id))}
                >
                  {e.reviewed ? "Giao bài" : "Chỉnh sửa"}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!exams.length && (
        <Empty
          title="Chưa tìm thấy đề phù hợp"
          text="Thử một từ khóa khác hoặc tải lên bộ đề mới nhé."
        />
      )}
    </>
  );
}
export function ImportModal({ onClose, onDone, toast }) {
  const [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [drag, setDrag] = useState(false),
    [error, setError] = useState("");
  const input = useRef();
  function select(f) {
    setError("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf"))
      return setError("Vui lòng chọn một tệp PDF.");
    if (f.size > 20 * 1024 * 1024) return setError("Tệp PDF tối đa 20 MB.");
    setFile(f);
  }
  async function upload() {
    setBusy(true);
    setError("");
    try {
      setResult(await uploadPdf(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={result ? "Bộ đề đã vào thư viện!" : "Thêm những bài học mới"}
      subtitle={
        result
          ? "Đã tách cấu trúc. Bây giờ mình cùng kiểm tra nội dung nhé."
          : "Tải PDF lên, Mầm Nhỏ giúp bạn sắp xếp từng đề, từng câu."
      }
      onClose={busy ? () => {} : onClose}
    >
      <div className="modal-body">
        {!result ? (
          <>
            <div
              className={`upload-zone ${drag ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (!busy) select(e.dataTransfer.files[0]);
              }}
            >
              <span className="upload-circle">
                <CloudUpload size={34} />
              </span>
              <h3>{file ? file.name : "Kéo thả bộ đề của bạn vào đây"}</h3>
              <p>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng để đọc`
                  : "PDF có lớp chữ · Tối đa 20 MB · 150 trang"}
              </p>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => input.current.click()}
              >
                {file ? "Chọn tệp khác" : "Chọn tệp PDF"}
              </Button>
              <input
                ref={input}
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={(e) => select(e.target.files[0])}
              />
            </div>
            <div className="import-steps">
              {[
                "Nhận diện đề & các phần",
                "Tách câu hỏi & các ý nhỏ",
                "Bạn duyệt trước khi giao",
              ].map((s, i) => (
                <span key={s}>
                  <b>{i + 1}</b>
                  {s}
                </span>
              ))}
            </div>
            <div className="notice">
              <AlertCircle size={19} />
              <p>
                Hỗ trợ mẫu “Đề số → Trắc nghiệm / Tự luận → Câu / Bài → a, b,
                c”. Hình vẽ và phân số được giữ trong ảnh đề gốc. PDF scan cần
                OCR trước.
              </p>
            </div>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" disabled={busy} onClick={onClose}>
                Để sau
              </Button>
              <Button busy={busy} disabled={!file} onClick={upload}>
                <Upload size={18} />
                {busy ? "Đang tách nội dung…" : "Tải lên & tách đề"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="success-icon">
              <CheckCircle2 size={44} />
            </div>
            <div className="import-result-stats">
              <div>
                <strong>{result.exams.length}</strong>
                <span>đề bài</span>
              </div>
              <div>
                <strong>{result.questionCount}</strong>
                <span>câu hỏi</span>
              </div>
              <div>
                <strong>{result.pageCount}</strong>
                <span>trang PDF</span>
              </div>
            </div>
            <div className="notice">
              <AlertCircle size={19} />
              <p>
                Đề được lưu ở trạng thái bản nháp. Kiểm tra ảnh gốc, điểm và bổ
                sung đáp án trước khi duyệt.
              </p>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => onDone()}>
                Về thư viện
              </Button>
              <Button onClick={() => onDone(result.exams[0].id)}>
                Duyệt đề đầu tiên
                <ArrowUpRight size={18} />
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
export function ExamEditor({ exam, onClose, onSaved, toast }) {
  const [draft, setDraft] = useState(structuredClone(exam)),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [confirmClose, setConfirmClose] = useState(false);
  const q = draft.questions[index];
  function update(changes) {
    setDirty(true);
    setDraft((d) => ({
      ...d,
      reviewed: false,
      questions: d.questions.map((q, i) =>
        i === index ? { ...q, ...changes } : q,
      ),
    }));
  }
  async function save(reviewed) {
    setBusy(true);
    setError("");
    try {
      await api(`/exams/${draft.id}`, {
        method: "PUT",
        body: { ...draft, reviewed },
      });
      toast(
        reviewed ? "Đề đã được duyệt, sẵn sàng giao bài." : "Đã lưu bản nháp.",
      );
      setDirty(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function close() {
    if (dirty) setConfirmClose(true);
    else onClose();
  }
  return (
    <Modal
      wide
      title="Góc chuẩn bị bài"
      subtitle={`${draft.questions.length} câu · Đối chiếu đề gốc và hoàn thiện trước khi giao`}
      onClose={close}
    >
      <div className="editor-body">
        <Field label="Tên đề">
          <input
            value={draft.title}
            onChange={(e) => {
              setDirty(true);
              setDraft({ ...draft, title: e.target.value });
            }}
          />
        </Field>
        <div className="editor-layout">
          <aside className="question-index">
            {[...new Set(draft.questions.map((q) => q.section))].map(
              (section) => (
                <div key={section}>
                  <h4>{section}</h4>
                  <div className="question-index-grid">
                    {draft.questions.map((question, i) =>
                      question.section === section ? (
                        <button
                          key={question.id}
                          onClick={() => setIndex(i)}
                          className={`${index === i ? "selected" : ""} ${question.correctAnswer ? "has-answer" : ""}`}
                          aria-label={`Chỉnh câu ${question.number}`}
                        >
                          {question.number}
                        </button>
                      ) : null,
                    )}
                  </div>
                </div>
              ),
            )}
            <p>
              <CheckCircle2 size={14} />
              Xanh: đã có đáp án
            </p>
          </aside>
          <div className="question-editor">
            <div className="question-editor-heading">
              <h3>Câu {q.number}</h3>
              <Badge tone={q.type === "choice" ? "purple" : "orange"}>
                {q.type === "choice" ? "Trắc nghiệm" : "Tự luận"}
              </Badge>
            </div>
            <div className="field-row">
              <Field label="Dạng câu">
                <select
                  value={q.type}
                  onChange={(e) =>
                    update({
                      type: e.target.value,
                      correctAnswer: "",
                      options:
                        e.target.value === "choice" && q.options.length < 2
                          ? [
                              { label: "A", text: "" },
                              { label: "B", text: "" },
                              { label: "C", text: "" },
                              { label: "D", text: "" },
                            ]
                          : q.options,
                    })
                  }
                >
                  <option value="choice">Trắc nghiệm</option>
                  <option value="written">Tự luận</option>
                </select>
              </Field>
              <Field label="Điểm">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={q.points}
                  onChange={(e) => update({ points: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Nội dung câu hỏi">
              <textarea
                rows="5"
                value={q.prompt}
                onChange={(e) => update({ prompt: e.target.value })}
              />
            </Field>
            {q.parts.length > 0 && (
              <p className="field-hint">
                Đã nhận diện {q.parts.length} ý nhỏ:{" "}
                {q.parts.map((p) => p.label).join(", ")}. Học sinh trình bày
                theo từng ý trong bài làm.
              </p>
            )}
            {q.type === "choice" && (
              <div className="options-editor">
                <span className="field-label">
                  Các lựa chọn <small>· Chọn vòng tròn ở đáp án đúng</small>
                </span>
                {q.options.map((o, i) => (
                  <label
                    className={`option-editor ${q.correctAnswer === o.label ? "correct" : ""}`}
                    key={o.label}
                  >
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      aria-label={`Đáp án đúng ${o.label}`}
                      checked={q.correctAnswer === o.label}
                      onChange={() => update({ correctAnswer: o.label })}
                    />
                    <b>{o.label}</b>
                    <input
                      aria-label={`Nội dung đáp án ${o.label}`}
                      value={o.text}
                      onChange={(e) =>
                        update({
                          options: q.options.map((v, j) =>
                            j === i ? { ...v, text: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={q.showSource}
                onChange={(e) => update({ showSource: e.target.checked })}
              />
              Hiện ảnh đề gốc khi học sinh làm câu này
            </label>
            <details className="source-details" open={q.showSource}>
              <summary>
                <FileText size={16} />
                Đối chiếu với PDF gốc
              </summary>
              <SourceImage source={q.source} documentId={exam.document_id} />
            </details>
          </div>
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {confirmClose && (
          <div className="notice">
            <AlertCircle size={20} />
            <div>
              <p>Có thay đổi chưa lưu. Bạn muốn tiếp tục chỉnh hay đóng?</p>
              <Button
                variant="secondary"
                onClick={() => setConfirmClose(false)}
              >
                Tiếp tục chỉnh
              </Button>{" "}
              <Button variant="danger" onClick={onClose}>
                Bỏ thay đổi & đóng
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="editor-footer">
        <span>
          Tổng điểm:{" "}
          <strong>
            {draft.questions
              .reduce((s, q) => s + q.points, 0)
              .toLocaleString("vi-VN")}
          </strong>{" "}
          · Quy về thang 10 khi chấm
        </span>
        <div>
          <Button variant="secondary" busy={busy} onClick={() => save(false)}>
            <Save size={17} />
            Lưu nháp
          </Button>
          <Button busy={busy} onClick={() => save(true)}>
            <Check size={18} />
            Duyệt đề
          </Button>
        </div>
      </div>
    </Modal>
  );
}
