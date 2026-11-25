import { useState } from "react";
import {
  Plus,
  Search,
  Copy,
  Check,
  Users,
  Download,
  KeyRound,
} from "lucide-react";
import {
  PageHeading,
  Button,
  Badge,
  Modal,
  Field,
  Empty,
} from "../components/UI";
import { api, initials, csvDownload } from "../lib/api";
export default function Students({ data, refresh, toast }) {
  const [search, setSearch] = useState(""),
    [adding, setAdding] = useState(false),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const students = data.students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );
  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/students", { method: "POST", body: { name } });
      await refresh();
      setAdding(false);
      setName("");
      toast("Đã thêm học sinh. Bạn có thể gửi mã đăng nhập riêng cho em.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(code) {
    try {
      await navigator.clipboard.writeText(code);
      toast("Đã sao chép mã đăng nhập.");
    } catch {
      toast("Chưa sao chép được. Bạn có thể chọn và sao chép mã trực tiếp.");
    }
  }
  return (
    <>
      <PageHeading
        title="Những mầm xanh của lớp"
        description="Theo dõi tiến bộ và dành sự quan tâm cho từng học sinh."
      >
        <Button
          variant="secondary"
          onClick={() =>
            csvDownload(
              [
                ["Họ tên", "Tên hoặc mã đăng nhập", "Lớp"],
                ...data.students.map((s) => [s.name, s.code, 3]),
              ],
              "hoc-sinh-lop-3.csv",
            )
          }
        >
          <Download size={17} />
          Xuất danh sách
        </Button>
        <Button onClick={() => setAdding(true)}>
          <Plus size={18} />
          Thêm học sinh
        </Button>
      </PageHeading>
      <div className="class-summary">
        <span className="class-icon">
          <Users size={29} />
        </span>
        <div>
          <h3>Lớp 3</h3>
          <p>{data.students.length} học sinh · Một tập thể, nhiều sắc màu</p>
        </div>
        <Badge tone="green">Lớp mặc định</Badge>
      </div>
      <div className="filter-toolbar">
        <h3>
          Danh sách học sinh{" "}
          <span className="count-pill">{data.students.length}</span>
        </h3>
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Tìm học sinh"
            placeholder="Tìm tên học sinh…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Tên hoặc mã đăng nhập</th>
              <th>Bài đã nộp</th>
              <th>Điểm trung bình</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const attempts = data.attempts.filter(
                  (a) => a.student_id === s.id && a.submitted_at,
                ),
                graded = attempts.filter((a) => a.grade != null);
              return (
                <tr key={s.id}>
                  <td>
                    <div className="student-name">
                      <span className={`avatar avatar-${i % 4}`}>
                        {initials(s.name)}
                      </span>
                      <strong>{s.name}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="code-cell">
                      <code>{s.code}</code>
                      <button
                        className="icon-button"
                        aria-label={`Sao chép mã ${s.name}`}
                        onClick={() => copy(s.code)}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </td>
                  <td>
                    {attempts.length}
                    <span className="muted">
                      /{data.assignments.length} bài
                    </span>
                  </td>
                  <td>
                    {graded.length ? (
                      <strong className="grade-value">
                        {(
                          graded.reduce((t, a) => t + a.grade, 0) /
                          graded.length
                        ).toFixed(1)}
                      </strong>
                    ) : (
                      <span className="muted">Chưa có điểm</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!students.length && (
          <Empty
            title="Chưa có học sinh phù hợp"
            text="Thêm một học sinh hoặc thử tên khác nhé."
          />
        )}
      </div>
      <div className="notice">
        <KeyRound size={20} />
        <p>
          Học sinh chọn <strong>Em là học sinh</strong> và nhập thông tin do
          giáo viên cấp. Với tài khoản có mật khẩu, em điền cả hai ô.
        </p>
      </div>
      {adding && (
        <Modal
          title="Chào đón một mầm xanh"
          subtitle="Mã đăng nhập riêng sẽ được tạo tự động."
          onClose={() => setAdding(false)}
        >
          <form className="modal-body" onSubmit={add}>
            <Field label="Họ và tên học sinh">
              <input
                autoFocus
                required
                minLength="2"
                maxLength="80"
                placeholder="Ví dụ: Nguyễn Minh An"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Lớp học">
              <input value="Lớp 3 (mặc định)" disabled />
            </Field>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setAdding(false)}
              >
                Để sau
              </Button>
              <Button type="submit" busy={busy}>
                <Plus size={18} />
                Thêm học sinh
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
