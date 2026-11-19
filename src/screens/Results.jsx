import { useState } from "react";
import {
  Download,
  CheckCircle2,
  Clock,
  MessageCircle,
  ArrowRight,
  Star,
  Check,
  X,
} from "lucide-react";
import {
  Button,
  Badge,
  PageHeading,
  Empty,
  Modal,
  Field,
  SourceImage,
} from "../components/UI";
import { api, fullDate, initials, csvDownload } from "../lib/api";
export default function Results({ data, user, onGrade, onOpen }) {
  const [filter, setFilter] = useState("all");
  const teacher = user.role === "teacher",
    attempts = data.attempts
      .filter(
        (a) =>
          a.submitted_at &&
          (filter === "all" ||
            (filter === "pending" ? a.grade == null : a.grade != null)),
      )
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  const title = (id) =>
    data.assignments.find((a) => a.id === id)?.title || "Bài tập";
  return (
    <>
      <PageHeading
        title={
          teacher ? "Mỗi tiến bộ đều đáng quý" : "Những điều em đã làm được"
        }
        description={
          teacher
            ? "Xem bài làm, gửi nhận xét và khích lệ các em trên hành trình học tập."
            : "Cùng nhìn lại thành quả và lời nhắn của cô nhé!"
        }
      >
        {teacher && (
          <Button
            variant="secondary"
            onClick={() =>
              csvDownload(
                [
                  ["Học sinh", "Bài tập", "Ngày nộp", "Điểm", "Nhận xét"],
                  ...attempts.map((a) => [
                    a.student_name,
                    title(a.assignment_id),
                    fullDate(a.submitted_at),
                    a.grade ?? "Chờ chấm",
                    a.feedback || "",
                  ]),
                ],
                "ket-qua-lop-3.csv",
              )
            }
          >
            <Download size={17} />
            Xuất kết quả
          </Button>
        )}
      </PageHeading>
      <div className="filter-toolbar">
        <div className="tabs">
          {[
            ["all", "Tất cả bài đã nộp"],
            ["pending", "Chờ chấm"],
            ["graded", "Đã có điểm"],
          ].map(([k, l]) => (
            <button
              key={k}
              className={filter === k ? "selected" : ""}
              onClick={() => setFilter(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {teacher ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Bài tập</th>
                <th>Thời gian nộp</th>
                <th>Kết quả</th>
                <th>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={a.id}>
                  <td>
                    <div className="student-name">
                      <span className={`avatar avatar-${i % 4}`}>
                        {initials(a.student_name)}
                      </span>
                      <strong>{a.student_name}</strong>
                    </div>
                  </td>
                  <td>{title(a.assignment_id)}</td>
                  <td>
                    <span>{fullDate(a.submitted_at)}</span>
                    {new Date(a.submitted_at) >
                      new Date(
                        data.assignments.find((x) => x.id === a.assignment_id)
                          ?.deadline,
                      ) && <small className="late-label">Nộp sau hạn</small>}
                  </td>
                  <td>
                    {a.grade == null ? (
                      <Badge tone="orange">Chờ chấm</Badge>
                    ) : (
                      <span className="grade-value">
                        {a.grade}
                        <small>/10</small>
                      </span>
                    )}
                  </td>
                  <td>
                    <Button variant="secondary" onClick={() => onGrade(a.id)}>
                      {a.grade == null ? "Chấm bài" : "Xem bài"}
                      <ArrowRight size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="student-results">
          {attempts.map((a) => (
            <article className="panel student-result" key={a.id}>
              <div
                className={`result-medal ${a.grade == null ? "pending" : ""}`}
              >
                {a.grade == null ? <Clock /> : <Star />}
              </div>
              <div>
                <Badge tone={a.grade == null ? "orange" : "green"}>
                  {a.grade == null ? "Cô đang xem bài" : "Em đã hoàn thành"}
                </Badge>
                <h3>{title(a.assignment_id)}</h3>
                <p>Nộp lúc {fullDate(a.submitted_at)}</p>
                {a.feedback && (
                  <div className="feedback">
                    <MessageCircle size={17} />
                    <p>{a.feedback}</p>
                  </div>
                )}
              </div>
              <div className="result-score">
                {a.grade != null ? (
                  <>
                    <strong>{a.grade}</strong>
                    <span>/10 điểm</span>
                  </>
                ) : (
                  <span>Chờ cô chấm nhé</span>
                )}
                <button
                  className="text-link"
                  onClick={() =>
                    onOpen(
                      data.assignments.find((x) => x.id === a.assignment_id),
                    )
                  }
                >
                  Xem bài làm
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!attempts.length && (
        <Empty
          title={
            teacher ? "Chưa có bài làm ở đây" : "Thành quả đầu tiên đang chờ em"
          }
          text={
            teacher
              ? "Khi học sinh nộp bài, bạn có thể chấm và gửi lời nhận xét tại đây."
              : "Hoàn thành một bài tập để bắt đầu hành trình nhé!"
          }
        >
          {!teacher && (
            <Button
              onClick={() => onOpen(data.assignments[0])}
              disabled={!data.assignments.length}
            >
              Làm bài ngay
              <ArrowRight size={18} />
            </Button>
          )}
        </Empty>
      )}
    </>
  );
}
export function GradeModal({ attempt, onClose, onDone, toast }) {
  const [grade, setGrade] = useState(attempt.grade ?? ""),
    [feedback, setFeedback] = useState(attempt.feedback || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const mc = attempt.exam.questions.filter(
      (q) => q.type === "choice" && q.correctAnswer,
    ),
    auto = mc.reduce(
      (sum, q) =>
        sum + (attempt.answers[q.id] === q.correctAnswer ? q.points : 0),
      0,
    ),
    total = attempt.exam.questions.reduce((sum, q) => sum + q.points, 0);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/attempts/${attempt.id}/grade`, {
        method: "PUT",
        body: { grade: Number(grade), feedback },
      });
      toast("Đã lưu điểm và gửi lời nhận xét cho học sinh.");
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      wide
      title={`Bài làm của ${attempt.student_name}`}
      subtitle={attempt.assignmentTitle}
      onClose={onClose}
    >
      <div className="grading-body">
        <div className="notice green">
          <CheckCircle2 size={20} />
          <p>
            Trắc nghiệm tự đối chiếu:{" "}
            <strong>
              {auto}/{mc.reduce((s, q) => s + q.points, 0)} điểm
            </strong>
            . Tổng đề: {total} điểm. Chấm tự luận và nhập điểm cuối cùng theo
            thang 10.
          </p>
        </div>
        {attempt.exam.questions.map((q) => (
          <div className="grading-question" key={q.id}>
            <div className="question-editor-heading">
              <h3>
                Câu {q.number} <small>· {q.points} điểm</small>
              </h3>
              {q.type === "choice" && (
                <Badge
                  tone={
                    attempt.answers[q.id] === q.correctAnswer
                      ? "green"
                      : "orange"
                  }
                >
                  {attempt.answers[q.id] === q.correctAnswer
                    ? "Chính xác"
                    : "Cần xem lại"}
                </Badge>
              )}
            </div>
            <p className="question-text">{q.prompt}</p>
            {q.showSource && (
              <SourceImage source={q.source} documentId={attempt.documentId} />
            )}
            <div className="student-answer">
              <span>Học sinh trả lời</span>
              <p>
                {q.type === "choice"
                  ? `${attempt.answers[q.id] || "Chưa trả lời"}${q.options.find((o) => o.label === attempt.answers[q.id]) ? ". " + q.options.find((o) => o.label === attempt.answers[q.id]).text : ""}`
                  : attempt.answers[q.id] || "Chưa trả lời"}
              </p>
            </div>
            {q.type === "choice" && (
              <p className="answer-key">
                Đáp án: {q.correctAnswer}.{" "}
                {q.options.find((o) => o.label === q.correctAnswer)?.text}
              </p>
            )}
          </div>
        ))}
      </div>
      <form className="grade-form" onSubmit={save}>
        <div className="field-row">
          <Field label="Điểm cuối cùng / 10">
            <input
              aria-label="Điểm cuối cùng"
              type="number"
              required
              min="0"
              max="10"
              step="0.1"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="0 – 10"
            />
          </Field>
          <Field label="Lời nhắn của cô">
            <textarea
              required
              rows="2"
              maxLength="2000"
              placeholder="Một lời động viên dành cho em…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </Field>
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Đóng
          </Button>
          <Button busy={busy} type="submit">
            <Check size={18} />
            Lưu điểm & nhận xét
          </Button>
        </div>
      </form>
    </Modal>
  );
}
