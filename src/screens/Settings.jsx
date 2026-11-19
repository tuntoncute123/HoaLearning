import { useEffect, useState } from "react";
import {
  Bell,
  Download,
  Smartphone,
  Send,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight,
  Monitor,
  Info,
  Sprout,
} from "lucide-react";
import { PageHeading, Button, Field, Badge } from "../components/UI";
import { enablePush, disablePush } from "../lib/pwa";
import MobileInstall from "../components/MobileInstall";
import { api } from "../lib/api";
export default function Settings({ user, demo, toast, onLogout, install }) {
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window)
      navigator.serviceWorker
        .getRegistration()
        .then((r) => (r?.active ? r.pushManager.getSubscription() : null))
        .then((s) => setEnabled(!!s));
  }, []);
  async function push() {
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        toast("Đã tắt thông báo trên thiết bị này.");
      } else {
        await enablePush();
        setEnabled(true);
        toast("Đã bật thông báo trên thiết bị này.");
      }
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    try {
      const r = await api("/push/test", { method: "POST" });
      toast(
        r.sent
          ? "Đã gửi thông báo thử đến thiết bị của bạn."
          : "Đã thêm thông báo trong ứng dụng. Chưa gửi được tới thiết bị; hãy kiểm tra đăng ký và kết nối.",
      );
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Mầm Nhỏ, theo cách của bạn"
        description="Cài đặt ứng dụng và giữ kết nối với những bài học mỗi ngày."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <span className="settings-icon purple">
            <Bell size={27} />
          </span>
          <h2>Không bỏ lỡ điều hay</h2>
          <p>
            Nhận thông báo khi có bài tập mới, bài đã nộp hoặc nhận xét từ giáo
            viên — ngay cả khi ứng dụng đang đóng.
          </p>
          <div className="setting-row">
            <div>
              <strong>Thông báo trên thiết bị này</strong>
              <small>
                {enabled ? "Đã đăng ký nhận thông báo" : "Chưa bật thông báo"}
              </small>
            </div>
            <Button
              variant={enabled ? "secondary" : "primary"}
              busy={busy}
              onClick={push}
            >
              {enabled ? "Tắt thông báo" : "Bật thông báo"}
            </Button>
          </div>
          {enabled && (
            <Button variant="secondary" busy={busy} onClick={test}>
              <Send size={16} />
              Gửi thông báo thử
            </Button>
          )}
          <div className="notice">
            <Info size={19} />
            <p>
              Trên iPhone/iPad (iOS 16.4+), thêm ứng dụng vào Màn hình chính rồi
              mở từ biểu tượng để bật thông báo. Khi dùng trên điện thoại,
              website cần HTTPS.
            </p>
          </div>
        </section>
        <MobileInstall install={install} card />
        <section className="panel settings-card account-card">
          <span className="settings-icon blue">
            <ShieldCheck size={27} />
          </span>
          <div>
            <h2>Tài khoản của bạn</h2>
            <p>
              {user.name} · {user.role === "teacher" ? "Giáo viên" : "Học sinh"}{" "}
              · Lớp 3
            </p>
            {demo && (
              <Badge tone="orange">
                Chế độ trải nghiệm trên máy phát triển
              </Badge>
            )}
          </div>
          <Button variant="secondary" onClick={onLogout}>
            <LogOut size={17} />
            Đăng xuất
          </Button>
        </section>
      </div>
    </>
  );
}
export function Login({ onLogin, demo, install }) {
  const [role, setRole] = useState("student"),
    [code, setCode] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(
        await api("/auth/login", {
          method: "POST",
          body: role === "student" ? { code } : { email, password },
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <a className="brand" href="/">
        <span className="brand-symbol">
          <Sprout />
        </span>
        <span>
          Mầm Nhỏ<small>CÙNG EM LỚN LÊN MỖI NGÀY</small>
        </span>
      </a>
      {role === "student" && <MobileInstall install={install} />}
      <form className="login-card panel" onSubmit={submit}>
        <span className="login-spark">✦</span>
        <h1>Chào mừng bạn về lớp!</h1>
        <p>Một góc nhỏ, thật nhiều điều hay đang chờ.</p>
        <div className="tabs">
          <button
            type="button"
            className={role === "student" ? "selected" : ""}
            onClick={() => setRole("student")}
          >
            Em là học sinh
          </button>
          <button
            type="button"
            className={role === "teacher" ? "selected" : ""}
            onClick={() => setRole("teacher")}
          >
            Tôi là giáo viên
          </button>
        </div>
        {role === "student" ? (
          <Field
            label="Mã đăng nhập của em"
            hint="Mã riêng do giáo viên gửi cho em hoặc phụ huynh."
          >
            <input
              autoComplete="username"
              required
              placeholder="Nhập mã của em…"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>
        ) : (
          <>
            <Field label="Email">
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Mật khẩu">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <Button busy={busy} className="full-width" type="submit">
          Vào lớp thôi
          <ArrowUpRight size={19} />
        </Button>
        {demo && (
          <p className="small-text">Tài khoản trải nghiệm học sinh: DEMO0001</p>
        )}
      </form>
      <p className="login-footer">Gieo một bài học, ươm ngàn điều hay. 🌱</p>
    </div>
  );
}
