import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  ClipboardList,
  Users,
  CheckCheck,
  Clock,
  Upload,
  FileText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import {
  PageHeading,
  Button,
  Badge,
  SectionHeading,
  TextLink,
  Empty,
} from "../components/UI";
import LearningArt from "../components/LearningArt";
import { dateLabel } from "../lib/api";
export function AssignmentCard({
  assignment,
  attempt,
  studentCount,
  onOpen,
  teacher,
}) {
  const submitted = !teacher && !!attempt?.submitted_at,
    graded = attempt?.grade != null,
    late = new Date(assignment.deadline) < new Date(),
    progress = studentCount
      ? Math.round((assignment.submitted / studentCount) * 100)
      : 0;
  return (
    <article className="assignment-card">
      <div className="assignment-card-top">
        <span className="subject-icon">
          <ClipboardList size={25} />
        </span>
        <Badge tone={submitted ? "green" : late ? "gray" : "orange"}>
          {submitted ? "Đã hoàn thành" : late ? "Đã qua hạn" : "Đang diễn ra"}
        </Badge>
      </div>
      <div className="subject-label">
        TOÁN HỌC <span>·</span> LỚP 3
      </div>
      <h3>{assignment.title}</h3>
      <div className="assignment-meta">
        <span>
          <FileText size={15} />
          {assignment.questionCount} câu hỏi
        </span>
        <span>
          <Clock size={15} />
          {assignment.duration} phút
        </span>
      </div>
      <div className="card-rule" />
      {teacher ? (
        <div className="assignment-progress">
          <div>
            <span>Tiến độ nộp bài</span>
            <strong>
              {assignment.submitted}
              <span>/{studentCount} học sinh</span>
            </strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <p className="student-card-note">
          {graded
            ? `Em đạt ${attempt.grade}/10 điểm. Giỏi lắm!`
            : submitted
              ? "Cô sẽ sớm gửi lời nhận xét cho em nhé."
              : attempt
                ? "Em đã bắt đầu rồi. Mình tiếp tục nhé!"
                : "Một thử thách nhỏ đang chờ em!"}
        </p>
      )}
      <div className="assignment-card-bottom">
        <span className={late ? "muted" : "deadline"}>
          <CalendarDays size={15} />
          {late ? "Hạn nộp" : "Hạn"} {dateLabel(assignment.deadline)}
        </span>
        <button
          className="circle-action"
          aria-label={`${teacher ? "Xem bài" : submitted ? "Xem kết quả" : "Làm bài"} ${assignment.title}`}
          onClick={() => onOpen(assignment)}
        >
          <ArrowRight size={19} />
        </button>
      </div>
    </article>
  );
}
function Calendar({ assignments }) {
  const [month, setMonth] = useState(new Date()),
    [selected, setSelected] = useState(new Date().getDate());
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    start =
      (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7,
    today = new Date();
  const sameMonth =
    today.getMonth() === month.getMonth() &&
    today.getFullYear() === month.getFullYear();
  const selectedTasks = assignments.filter((a) => {
    const d = new Date(a.deadline);
    return (
      d.getMonth() === month.getMonth() &&
      d.getFullYear() === month.getFullYear() &&
      d.getDate() === selected
    );
  });
  return (
    <section className="panel calendar-panel">
      <div className="calendar-title">
        <h3>Lịch học tập</h3>
        <CalendarDays size={19} />
      </div>
      <div className="calendar-month">
        <strong>
          Tháng {month.getMonth() + 1}, {month.getFullYear()}
        </strong>
        <div>
          <button
            aria-label="Tháng trước"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Tháng sau"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1,
            hasTask = assignments.some((a) => {
              const d = new Date(a.deadline);
              return (
                d.getDate() === day &&
                d.getMonth() === month.getMonth() &&
                d.getFullYear() === month.getFullYear()
              );
            });
          return (
            <button
              key={day}
              aria-label={`Ngày ${day} tháng ${month.getMonth() + 1}`}
              className={`${sameMonth && today.getDate() === day ? "today" : ""} ${selected === day ? "selected" : ""}`}
              onClick={() => setSelected(day)}
            >
              {day}
              {hasTask && <i />}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i />
          Hạn nộp bài
        </span>
        <span>
          Ngày {selected}/{month.getMonth() + 1}
        </span>
      </div>
      <div className="calendar-event">
        {selectedTasks.length ? (
          selectedTasks.map((t) => (
            <p key={t.id}>
              <span className="event-dot" />
              {t.title}
            </p>
          ))
        ) : (
          <p>
            <span className="event-dot light" />
            Một ngày để học thêm điều mới.
          </p>
        )}
      </div>
    </section>
  );
}
export default function Dashboard({
  user,
  data,
  navigate,
  onAssign,
  onImport,
  onOpen,
  onEdit,
}) {
  const teacher = user.role === "teacher",
    submissions = data.attempts.filter((a) => a.submitted_at),
    pending = submissions.filter((a) => a.grade == null),
    studentDone = new Set(submissions.map((a) => a.assignment_id)),
    total = teacher
      ? data.assignments.length * data.students.length
      : data.assignments.length,
    done = submissions.length,
    percent = total ? Math.round((done / total) * 100) : 0;
  const stats = teacher
    ? [
        [
          "Bài tập đã giao",
          data.assignments.length,
          ClipboardList,
          "purple",
          "Sẵn sàng cho những tiến bộ",
        ],
        [
          "Học sinh trong lớp",
          data.students.length,
          Users,
          "blue",
          "Cùng nhau học mỗi ngày",
        ],
        [
          "Bài làm đã nộp",
          submissions.length,
          CheckCheck,
          "green",
          `${percent}% bài tập hoàn thành`,
        ],
        [
          "Bài chờ chấm",
          pending.length,
          Clock,
          "orange",
          "Chờ lời nhận xét từ cô",
        ],
      ]
    : [
        [
          "Bài tập của em",
          data.assignments.length,
          BookOpen,
          "purple",
          "Mỗi bài một điều mới",
        ],
        ["Đã hoàn thành", done, CheckCheck, "green", "Em đang làm rất tốt!"],
        [
          "Chờ em khám phá",
          data.assignments.length - studentDone.size,
          Sparkles,
          "orange",
          "Bắt đầu ngay thôi!",
        ],
        [
          "Bài đã được chấm",
          submissions.filter((a) => a.grade != null).length,
          GraduationCap,
          "blue",
          "Xem lời nhắn từ cô",
        ],
      ];
  return (
    <>
      <PageHeading
        title={
          teacher
            ? "Một ngày dạy học thật vui!"
            : `Chào ${user.name.split(" ").slice(-2).join(" ")}, mình học thôi!`
        }
        description={
          teacher
            ? "Cùng Mầm Nhỏ gieo những hạt giống tri thức cho lớp học của bạn."
            : "Mỗi bài học là một chuyến phiêu lưu. Hôm nay em sẵn sàng chưa?"
        }
      >
        <div className="today-chip">
          <CalendarDays size={17} />
          {new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "numeric",
            month: "numeric",
            year: "numeric",
          })}
        </div>
      </PageHeading>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="banner-kicker">
            <span />
            GÓC NHỎ CỦA {teacher ? "NGƯỜI GIEO MẦM" : "NHÀ KHÁM PHÁ"}
          </span>
          <h2>
            {teacher ? (
              <>
                Gieo một bài học,
                <br />
                ươm ngàn điều hay.
              </>
            ) : (
              <>
                Học một chút mỗi ngày,
                <br />
                lớn thêm bao điều hay.
              </>
            )}
          </h2>
          <p>
            {teacher
              ? "Bớt thời gian chuẩn bị. Thêm thời gian đồng hành."
              : "Không cần vội vàng. Em cứ làm hết sức mình nhé!"}
            <br />
            {teacher
              ? "Để mỗi bài tập là một niềm vui khám phá."
              : "Cô luôn ở đây, đồng hành cùng em."}
          </p>
          <Button onClick={teacher ? onAssign : () => navigate("assignments")}>
            {teacher ? <Plus size={19} /> : <BookOpen size={19} />}
            {teacher ? "Giao bài tập mới" : "Khám phá bài tập"}
            <ArrowUpRight size={18} />
          </Button>
        </div>
        <LearningArt />
        <span className="banner-note">
          <Sparkles size={15} />
          Mỗi em bé, một mầm xanh
        </span>
      </section>
      <div className="stats-grid">
        {stats.map(([label, value, Icon, tone, hint], i) => (
          <button
            className="stat-card"
            key={label}
            onClick={() =>
              navigate(
                teacher
                  ? ["assignments", "students", "results", "results"][i]
                  : ["assignments", "results", "assignments", "results"][i],
              )
            }
          >
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={20} />
              </span>
            </div>
            <strong>{String(value).padStart(2, "0")}</strong>
            <small>
              {i === 2 && teacher ? <span className="mini-up">↗</span> : null}
              {hint}
            </small>
          </button>
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <SectionHeading
            title={teacher ? "Bài tập đang diễn ra" : "Bài tập dành cho em"}
            description={
              teacher
                ? "Những nhiệm vụ nhỏ, những tiến bộ lớn."
                : "Từng bước một, em sẽ làm được!"
            }
            action={
              <TextLink onClick={() => navigate("assignments")}>
                Xem tất cả
              </TextLink>
            }
          />
          <div className="assignment-grid dashboard-assignments">
            {data.assignments.slice(0, 2).map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                attempt={data.attempts.find((t) => t.assignment_id === a.id)}
                studentCount={data.students.length}
                onOpen={onOpen}
                teacher={teacher}
              />
            ))}
            {teacher && data.assignments.length < 2 && (
              <button className="new-assignment-card" onClick={onAssign}>
                <span>
                  <Plus size={25} />
                </span>
                <h3>Thêm một thử thách mới</h3>
                <p>
                  Chọn một đề hay,
                  <br />
                  gửi cả lớp cùng khám phá.
                </p>
                <strong>
                  Giao bài tập <ArrowRight size={16} />
                </strong>
              </button>
            )}
            {!teacher && !data.assignments.length && (
              <Empty
                title="Cô đang chuẩn bị bài mới"
                text="Quay lại sau một chút nhé!"
              />
            )}
          </div>
          {teacher ? (
            <>
              <SectionHeading
                title="Thư viện của bạn"
                description="Đề hay đã sẵn sàng, chỉ chờ bạn chọn."
                action={
                  <TextLink onClick={() => navigate("library")}>
                    Mở thư viện
                  </TextLink>
                }
              />
              <div className="library-preview panel">
                {data.exams.slice(0, 3).map((e, i) => (
                  <button
                    className="library-row"
                    key={e.id}
                    onClick={() => onEdit(e.id)}
                  >
                    <span className={`file-icon file-${i}`}>
                      <FileText size={23} />
                    </span>
                    <span className="library-row-info">
                      <strong>{e.title}</strong>
                      <small>
                        Toán lớp 3 <span>·</span> {e.questionCount} câu hỏi{" "}
                        <span>·</span> Trắc nghiệm & tự luận
                      </small>
                    </span>
                    <Badge tone={e.reviewed ? "green" : "gray"}>
                      {e.reviewed ? "Đã duyệt" : "Bản nháp"}
                    </Badge>
                    <ChevronRight size={17} />
                  </button>
                ))}
                <button className="library-upload-row" onClick={onImport}>
                  <Upload size={18} />
                  <span>
                    Có bộ đề mới? <strong>Tải PDF lên thư viện</strong>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </>
          ) : (
            <div className="encourage-card">
              <Sparkles />
              <div>
                <h3>Sai một chút cũng không sao!</h3>
                <p>
                  Mỗi lần thử lại là một lần em hiểu bài hơn. Cứ tự tin và bắt
                  đầu nhé.
                </p>
              </div>
            </div>
          )}
        </div>
        <aside className="dashboard-aside">
          <Calendar assignments={data.assignments} />
          <section className="panel overview-panel">
            <div className="calendar-title">
              <h3>{teacher ? "Nhịp học của lớp" : "Hành trình của em"}</h3>
              <span className="tiny-leaf">🌱</span>
            </div>
            <div className="donut-row">
              <div className="donut" style={{ "--progress": `${percent}%` }}>
                <div>
                  <strong>{percent}%</strong>
                  <span>hoàn thành</span>
                </div>
              </div>
              <div className="donut-legend">
                <p>
                  <i className="purple-dot" />
                  <strong>{done}</strong> bài đã nộp
                </p>
                <p>
                  <i className="pale-dot" />
                  <strong>{Math.max(0, total - done)}</strong> bài chưa nộp
                </p>
              </div>
            </div>
            <div className="overview-note">
              <span>✧</span>
              {teacher
                ? "Mỗi tiến bộ nhỏ đều đáng ghi nhận."
                : "Một bước nhỏ hôm nay, một thành công ngày mai."}
            </div>
          </section>
          <section className="tip-card">
            <span>
              <Lightbulb size={20} />
              <strong>Mầm nhỏ mách bạn</strong>
            </span>
            <p>
              {teacher
                ? "Một lời động viên đúng lúc có thể biến bài tập khó thành niềm vui học tập."
                : "Hãy đọc đề hai lần, viết ra nháp rồi mới chọn đáp án nhé!"}
            </p>
            <span className="tip-flower">✳</span>
          </section>
        </aside>
      </div>
    </>
  );
}
