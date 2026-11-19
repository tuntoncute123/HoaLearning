import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Clock,
  Flag,
  Send,
  Sprout,
  Star,
  FileText,
  BookOpen,
  LoaderCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { Button, Badge, Loading, Modal, SourceImage } from "../components/UI";
export default function Workspace({ assignmentId, user, onExit, toast }) {
  const key = `mam-draft:${user.id}:${assignmentId}`,
    cacheKey = `mam-assignment:${user.id}:${assignmentId}`;
  const [assignment, setAssignment] = useState(null),
    [answers, setAnswers] = useState({}),
    [index, setIndex] = useState(0),
    [status, setStatus] = useState("saved"),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [submitting, setSubmitting] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [showSuccess, setShowSuccess] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [flagged, setFlagged] = useState([]);
  const currentAnswers = useRef({}),
    saveChain = useRef(Promise.resolve()),
    timer = useRef(),
    locked = useRef(false),
    start = useRef(Date.now()),
    loaded = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let a;
        try {
          a = await api(`/assignments/${assignmentId}`);
          localStorage.setItem(cacheKey, JSON.stringify(a));
        } catch (e) {
          if (navigator.onLine) throw e;
          a = JSON.parse(localStorage.getItem(cacheKey) || "null");
          if (!a)
            throw new Error(
              "Em cần mở bài khi có mạng một lần trước khi làm ngoại tuyến.",
            );
        }
        if (cancelled) return;
        const draft = JSON.parse(localStorage.getItem(key) || "null");
        const server = a.attempt?.answers ? JSON.parse(a.attempt.answers) : {};
        const answer = a.attempt?.submitted_at
          ? server
          : draft?.answers || server;
        start.current = draft?.startedAt || Date.now();
        currentAnswers.current = answer;
        setAnswers(answer);
        setAssignment(a);
        setSubmitted(!!a.attempt?.submitted_at);
        locked.current = !!a.attempt?.submitted_at;
        loaded.current = true;
      } catch (e) {
        setError(e.message);
      }
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [assignmentId]);
  useEffect(() => {
    const t = setInterval(
      () =>
        setElapsed(
          Math.max(0, Math.floor((Date.now() - start.current) / 60000)),
        ),
      1000,
    );
    return () => clearInterval(t);
  }, []);
  function persist(value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          answers: value,
          startedAt: start.current,
          updatedAt: Date.now(),
        }),
      );
      return true;
    } catch {
      toast(
        "Bộ nhớ thiết bị đã đầy. Hãy giữ kết nối mạng để lưu bài.",
        "error",
      );
      return false;
    }
  }
  function scheduleSave(value) {
    clearTimeout(timer.current);
    setStatus(navigator.onLine ? "saving" : "offline");
    if (!navigator.onLine) return;
    timer.current = setTimeout(() => {
      saveChain.current = saveChain.current
        .catch(() => {})
        .then(async () => {
          if (locked.current) return;
          try {
            await api(`/assignments/${assignmentId}/attempt`, {
              method: "PUT",
              body: { answers: value },
            });
            if (currentAnswers.current === value) setStatus("saved");
          } catch (e) {
            setStatus("offline");
          }
        });
    }, 650);
  }
  function change(value) {
    if (locked.current) return;
    const next = {
      ...currentAnswers.current,
      [assignment.exam.questions[index].id]: value,
    };
    currentAnswers.current = next;
    setAnswers(next);
    persist(next);
    scheduleSave(next);
  }
  useEffect(() => {
    function online() {
      if (loaded.current && !locked.current)
        scheduleSave(currentAnswers.current);
    }
    window.addEventListener("online", online);
    function unload(e) {
      if (!locked.current && (status === "saving" || status === "offline")) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", unload);
    };
  }, [status]);
  async function submit() {
    if (!navigator.onLine) {
      setError(
        "Em đang mất mạng. Bài đã lưu trên thiết bị; kết nối lại rồi nộp nhé.",
      );
      setConfirm(false);
      return;
    }
    setSubmitting(true);
    setError("");
    locked.current = true;
    clearTimeout(timer.current);
    try {
      await saveChain.current.catch(() => {});
      await api(`/assignments/${assignmentId}/attempt`, {
        method: "PUT",
        body: { answers: currentAnswers.current, submit: true },
      });
      setSubmitted(true);
      setShowSuccess(true);
      localStorage.removeItem(key);
      const a = await api(`/assignments/${assignmentId}`).catch(() => null);
      if (a) {
        setAssignment(a);
        localStorage.setItem(cacheKey, JSON.stringify(a));
      }
      setConfirm(false);
    } catch (e) {
      locked.current = false;
      setError(e.message);
      setConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }
  if (!assignment)
    return (
      <div className="work-page">
        {error ? (
          <div className="empty">
            <p className="error-text">{error}</p>
            <Button onClick={onExit}>Quay về lớp</Button>
          </div>
        ) : (
          <Loading />
        )}
      </div>
    );
  const questions = assignment.exam.questions,
    q = questions[index],
    done = questions.filter((q) => answers[q.id]?.trim()).length;
  if (showSuccess)
    return (
      <div className="success-page">
        <div className="success-confetti">
          ✦ <span>✧</span> ✦
        </div>
        <div className="success-medal">
          <Star size={55} />
        </div>
        <Badge tone="green">BÀI ĐÃ ĐƯỢC GỬI</Badge>
        <h1>Em đã làm được rồi!</h1>
        <p>
          Cô đã nhận được bài làm của em.
          <br />
          Hãy nghỉ ngơi một chút, em xứng đáng với một lời khen!
        </p>
        <div className="success-stats">
          <span>
            <strong>
              {done}/{questions.length}
            </strong>
            câu đã trả lời
          </span>
          <span>
            <strong>{elapsed}</strong>phút cố gắng
          </span>
        </div>
        <Button onClick={onExit}>
          Về góc học tập
          <ArrowRight size={19} />
        </Button>
        <button className="text-link" onClick={() => setShowSuccess(false)}>
          Xem lại bài của em
        </button>
      </div>
    );
  return (
    <div className="work-page">
      <header className="work-header">
        <button className="work-back" aria-label="Về lớp" onClick={onExit}>
          <ArrowLeft size={20} />
          <span>Về lớp</span>
        </button>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onExit();
          }}
        >
          <span className="brand-symbol">
            <Sprout />
          </span>
          <span>Mầm Nhỏ</span>
        </a>
        <div className="save-indicator">
          {submitted ? (
            <>
              <CheckCircle2 size={18} />
              <span>Đã nộp bài</span>
            </>
          ) : status === "offline" ? (
            <>
              <CloudOff size={18} />
              <span>Lưu trên thiết bị</span>
            </>
          ) : status === "saving" ? (
            <>
              <LoaderCircle size={18} className="spin" />
              <span>Đang lưu…</span>
            </>
          ) : (
            <>
              <Cloud size={18} />
              <span>Đã lưu bài</span>
            </>
          )}
        </div>
      </header>
      <div className="work-container">
        <div className="work-title">
          <div>
            <span className="eyebrow">TOÁN HỌC · LỚP 3</span>
            <h1>{assignment.title}</h1>
            <p>
              {submitted
                ? "Em đang xem lại bài đã nộp."
                : assignment.instructions}
            </p>
          </div>
          <div className="work-timer">
            <Clock size={20} />
            <span>
              <strong>{elapsed} phút</strong>
              <small>Gợi ý: {assignment.duration} phút</small>
            </span>
          </div>
        </div>
        {error && (
          <div className="notice error-text" role="alert">
            {error}
          </div>
        )}
        <div className="work-layout">
          <div className="work-main">
            <div className="work-progress-label">
              <span>{q.section}</span>
              <span>
                Câu <strong>{index + 1}</strong> / {questions.length}
              </span>
            </div>
            <div className="progress-track work-track">
              <span
                style={{ width: `${((index + 1) / questions.length) * 100}%` }}
              />
            </div>
            <section className="question-card">
              <div className="question-card-heading">
                <Badge tone="purple">Câu {q.number}</Badge>
                <span>{q.points} điểm</span>
                <button
                  className={`flag-button ${flagged.includes(q.id) ? "flagged" : ""}`}
                  aria-label="Đánh dấu xem lại"
                  onClick={() =>
                    setFlagged((f) =>
                      f.includes(q.id)
                        ? f.filter((x) => x !== q.id)
                        : [...f, q.id],
                    )
                  }
                >
                  <Flag size={18} />
                  <span>
                    {flagged.includes(q.id) ? "Đã đánh dấu" : "Xem lại sau"}
                  </span>
                </button>
              </div>
              <h2 className="question-prompt">{q.prompt}</h2>
              {q.showSource ? (
                <div className="student-source">
                  <span>
                    <FileText size={14} />
                    Hình và nội dung trong đề gốc
                  </span>
                  <SourceImage
                    source={q.source}
                    documentId={assignment.documentId}
                  />
                </div>
              ) : (
                <details className="source-details compact">
                  <summary>
                    <FileText size={15} />
                    Xem đề gốc
                  </summary>
                  <SourceImage
                    source={q.source}
                    documentId={assignment.documentId}
                  />
                </details>
              )}
              {q.type === "choice" ? (
                <>
                  <p className="answer-instruction">
                    Chọn một đáp án em cho là đúng nhé.
                  </p>
                  <div
                    className="answer-options"
                    role="radiogroup"
                    aria-label={`Đáp án câu ${q.number}`}
                  >
                    {q.options.map((o) => (
                      <button
                        role="radio"
                        aria-checked={answers[q.id] === o.label}
                        disabled={submitted}
                        className={`answer-option ${answers[q.id] === o.label ? "selected" : ""}`}
                        key={o.label}
                        onClick={() => change(o.label)}
                      >
                        <span className="option-letter">{o.label}</span>
                        <span>{o.text}</span>
                        {answers[q.id] === o.label && (
                          <CheckCircle2 size={22} />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label className="field" htmlFor="written-answer">
                    <span>Bài làm của em</span>
                  </label>
                  {q.parts?.length > 1 && (
                    <p className="field-hint">
                      Em nhớ trình bày đủ các ý{" "}
                      {q.parts.map((p) => p.label + ")").join(", ")} nhé.
                    </p>
                  )}
                  <textarea
                    id="written-answer"
                    className="written-answer"
                    rows="8"
                    maxLength="10000"
                    disabled={submitted}
                    placeholder="Em viết cách làm và đáp số vào đây nhé…"
                    value={answers[q.id] || ""}
                    onChange={(e) => change(e.target.value)}
                  />
                  <p className="field-hint">
                    Em có thể dùng dấu ×, : hoặc / khi trình bày phép tính.
                  </p>
                </>
              )}
            </section>
            <div className="question-navigation">
              <Button
                variant="secondary"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ArrowLeft size={18} />
                Câu trước
              </Button>
              {index < questions.length - 1 ? (
                <Button onClick={() => setIndex((i) => i + 1)}>
                  Câu tiếp theo
                  <ArrowRight size={18} />
                </Button>
              ) : (
                <Button onClick={submitted ? onExit : () => setConfirm(true)}>
                  {submitted ? "Về lớp" : "Kiểm tra & nộp bài"}
                  <CheckCircle2 size={18} />
                </Button>
              )}
            </div>
          </div>
          <aside className="work-aside">
            <section className="panel question-map">
              <h3>Hành trình của em</h3>
              <p>
                Đã trả lời{" "}
                <strong>
                  {done}/{questions.length}
                </strong>{" "}
                câu
              </p>
              <div className="question-map-grid">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    aria-label={`Đến câu ${q.number}`}
                    className={`${answers[q.id]?.trim() ? "answered" : ""} ${index === i ? "current" : ""} ${flagged.includes(q.id) ? "flagged" : ""}`}
                    onClick={() => setIndex(i)}
                  >
                    {q.number}
                    {flagged.includes(q.id) && <i />}
                  </button>
                ))}
              </div>
              <div className="map-legend">
                <span>
                  <i className="done" />
                  Đã làm
                </span>
                <span>
                  <i />
                  Chưa làm
                </span>
                <span>
                  <i className="flag" />
                  Xem lại
                </span>
              </div>
              {!submitted && (
                <Button className="full-width" onClick={() => setConfirm(true)}>
                  <Send size={17} />
                  Nộp bài
                </Button>
              )}
            </section>
            <div className="work-cheer">
              <span>🌱</span>
              <h3>Cứ bình tĩnh, em nhé!</h3>
              <p>
                Đọc kĩ đề, suy nghĩ một chút.
                <br />
                Cô tin em sẽ làm được.
              </p>
            </div>
          </aside>
        </div>
      </div>
      {confirm && (
        <Modal
          title="Mình kiểm tra lại một chút nhé!"
          subtitle="Em có thể quay lại xem bất cứ câu nào trước khi nộp."
          onClose={() => !submitting && setConfirm(false)}
        >
          <div className="modal-body">
            <div className="submit-summary">
              <CheckCircle2 size={36} />
              <strong>
                {done}/{questions.length} câu đã trả lời
              </strong>
            </div>
            {done < questions.length && (
              <div className="notice">
                <p>
                  Em còn{" "}
                  <strong>{questions.length - done} câu chưa trả lời</strong>.
                  Em muốn làm tiếp hay nộp bài bây giờ?
                </p>
              </div>
            )}
            {flagged.length > 0 && (
              <p className="small-text">
                Có {flagged.length} câu được đánh dấu để xem lại.
              </p>
            )}
            <p className="small-text">
              Sau khi nộp, em có thể xem lại nhưng không sửa bài được nữa.
            </p>
            <div className="modal-actions">
              <Button
                variant="secondary"
                disabled={submitting}
                onClick={() => setConfirm(false)}
              >
                Em muốn xem lại
              </Button>
              <Button busy={submitting} onClick={submit}>
                <Send size={18} />
                {submitting ? "Đang gửi bài…" : "Nộp bài cho cô"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
