import { useState } from "react";
import {
  Plus,
  Search,
  Send,
  CalendarDays,
  Clock,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import {
  Button,
  Badge,
  PageHeading,
  Empty,
  Modal,
  Field,
} from "../components/UI";
import { AssignmentCard } from "./Dashboard";
import { api, fullDate } from "../lib/api";
export default function Assignments({ user, data, onAssign, onOpen }) {
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const teacher = user.role === "teacher";
  const list = data.assignments.filter((a) => {
    const submitted = data.attempts.some(
        (t) => t.assignment_id === a.id && t.submitted_at,
      ),
      active = new Date(a.deadline) > new Date();
    return (
      a.title.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "active"
          ? teacher
            ? active
            : !submitted
          : teacher
            ? !active
            : submitted))
    );
  });
  return (
    <>
      <PageHeading
        title={teacher ? "Bài tập đã giao" : "Những thử thách của em"}
        description={
          teacher
            ? "Theo dõi từng bài tập, đồng hành cùng từng học sinh."
            : "Chọn một bài, ngồi thật thoải mái và bắt đầu khám phá nhé!"
        }
      >
        {teacher && (
          <Button onClick={() => onAssign()}>
            <Plus size={18} />
            Giao bài mới
          </Button>
        )}
      </PageHeading>
      <div className="filter-toolbar">
        <div className="tabs">
          {[
            ["all", "Tất cả"],
            ["active", teacher ? "Đang diễn ra" : "Chưa hoàn thành"],
            ["done", teacher ? "Đã qua hạn" : "Đã hoàn thành"],
          ].map(([k, l]) => (
            <button
              className={filter === k ? "selected" : ""}
              key={k}
              onClick={() => setFilter(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={18} />
          <input
            placeholder="Tìm bài tập…"
            aria-label="Tìm bài tập"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="assignment-grid full-grid">
        {list.map((a) => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            studentCount={data.students.length}
            attempt={data.attempts.find((t) => t.assignment_id === a.id)}
            teacher={teacher}
            onOpen={onOpen}
          />
        ))}
      </div>
      {!list.length && (
        <Empty
          title="Góc bài tập đang chờ điều mới"
          text={
            teacher
              ? "Hãy giao thử thách đầu tiên cho cả lớp."
              : "Khi cô giao bài mới, em sẽ thấy bài tập ở đây."
          }
        >
          {teacher && (
            <Button onClick={() => onAssign()}>
              <Plus size={18} />
              Giao bài mới
            </Button>
          )}
        </Empty>
      )}
    </>
  );
}
export function AssignModal({
  exams,
  selected,
  onClose,
  onDone,
  toast,
  onLibrary,
}) {
  const ready = exams.filter((e) => e.reviewed),
    [examId, setExamId] = useState(selected || ready[0]?.id || ""),
    [title, setTitle] = useState(""),
    [deadline, setDeadline] = useState(() => {
      const d = new Date(Date.now() + 3 * 86400000);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }),
    [duration, setDuration] = useState(40),
    [instructions, setInstructions] = useState(
      "Em đọc kĩ đề và kiểm tra lại trước khi nộp nhé. Cô tin em làm được!",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api("/assignments", {
        method: "POST",
        body: {
          examId,
          title: title || exams.find((x) => x.id === examId)?.title,
          deadline: new Date(deadline).toISOString(),
          duration: Number(duration),
          instructions,
        },
      });
      toast(
        `Đã giao bài cho lớp 3.${result.push.sent ? ` Đã gửi tới ${result.push.sent} thiết bị.` : ""}`,
      );
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Gửi một bài học đến cả lớp"
      subtitle="Một nhiệm vụ nhỏ, thêm một cơ hội để các em tiến bộ."
      onClose={onClose}
    >
      <form className="modal-body" onSubmit={submit}>
        {ready.length ? (
          <>
            <Field label="Chọn đề đã duyệt">
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                required
              >
                {ready.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {e.questionCount} câu
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tên bài tập">
              <input
                maxLength="200"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={exams.find((x) => x.id === examId)?.title}
              />
            </Field>
            <div className="field-row">
              <Field label="Hạn nộp">
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </Field>
              <Field label="Thời gian gợi ý (phút)">
                <input
                  type="number"
                  min="5"
                  max="180"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Lời nhắn dành cho học sinh">
              <textarea
                rows="3"
                maxLength="2000"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </Field>
            <div className="notice green">
              <Send size={19} />
              <p>
                Giao cho toàn bộ <strong>Lớp 3</strong>. Học sinh đã bật thông
                báo sẽ nhận tin trên điện thoại. Thời gian làm bài là gợi ý,
                không tự động nộp.
              </p>
            </div>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={onClose}>
                Để sau
              </Button>
              <Button busy={busy} type="submit">
                <Send size={17} />
                Giao bài cho lớp
              </Button>
            </div>
          </>
        ) : (
          <Empty
            title="Cùng duyệt một đề trước nhé"
            text="Đề cần được kiểm tra nội dung và đáp án trước khi giao cho học sinh."
          >
            <Button type="button" onClick={onLibrary}>
              Mở thư viện
              <ArrowRight size={18} />
            </Button>
          </Empty>
        )}
      </form>
    </Modal>
  );
}
export function AssignmentInfo({ assignment, data, onClose, onResults }) {
  const submitted = data.attempts.filter(
    (a) => a.assignment_id === assignment.id && a.submitted_at,
  );
  return (
    <Modal
      title={assignment.title}
      subtitle="Bài tập dành cho cả lớp 3"
      onClose={onClose}
    >
      <div className="modal-body">
        <div className="info-grid">
          <div>
            <CalendarDays />
            <span>
              Hạn nộp<strong>{fullDate(assignment.deadline)}</strong>
            </span>
          </div>
          <div>
            <Clock />
            <span>
              Thời gian gợi ý<strong>{assignment.duration} phút</strong>
            </span>
          </div>
          <div>
            <BookOpen />
            <span>
              Cấu trúc đề<strong>{assignment.questionCount} câu hỏi</strong>
            </span>
          </div>
        </div>
        <div className="notice">
          <p>{assignment.instructions}</p>
        </div>
        <h3 className="space-top">
          Tiến độ của lớp · {submitted.length}/{data.students.length}
        </h3>
        <div className="student-status-list">
          {data.students.map((s) => (
            <div key={s.id}>
              <span>{s.name}</span>
              <Badge
                tone={
                  submitted.some((t) => t.student_id === s.id)
                    ? "green"
                    : "orange"
                }
              >
                {submitted.some((t) => t.student_id === s.id)
                  ? "Đã nộp"
                  : "Chưa nộp"}
              </Badge>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <Button onClick={onResults}>
            Xem & chấm bài
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
