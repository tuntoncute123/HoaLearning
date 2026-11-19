import { useState } from "react";
import {
  Sprout,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Users,
  BarChart3,
  Bell,
  Settings,
  ChevronDown,
  Menu,
  X,
  ArrowUpRight,
  GraduationCap,
  LogOut,
  Download,
  WifiOff,
  ChevronRight,
  Heart,
} from "lucide-react";
import { initials } from "../lib/api";
const teacherNav = [
  ["dashboard", "Tổng quan", LayoutDashboard],
  ["assignments", "Bài tập đã giao", ClipboardList],
  ["library", "Thư viện đề", BookOpen],
  ["students", "Học sinh", Users],
  ["results", "Kết quả học tập", BarChart3],
];
const studentNav = [
  ["dashboard", "Góc học tập", LayoutDashboard],
  ["assignments", "Bài tập của em", ClipboardList],
  ["results", "Kết quả của em", BarChart3],
];
export default function Shell({
  user,
  demo,
  page,
  navigate,
  data,
  onNotify,
  onSwitch,
  onLogout,
  offline,
  children,
}) {
  const [open, setOpen] = useState(false);
  const teacher = user.role === "teacher",
    nav = teacher ? teacherNav : studentNav,
    unread = data.notifications.filter((n) => !n.read).length;
  function go(p) {
    navigate(p);
    setOpen(false);
  }
  return (
    <div className="app-shell">
      {open && (
        <button
          aria-label="Đóng menu"
          className="sidebar-scrim"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <a
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go("dashboard");
          }}
        >
          <span className="brand-symbol">
            <Sprout />
          </span>
          <span>
            Mầm Nhỏ<small>CÙNG EM LỚN LÊN MỖI NGÀY</small>
          </span>
        </a>
        <button className="class-selector" onClick={() => go("students")}>
          <span className="class-icon">
            <GraduationCap size={22} />
          </span>
          <span>
            Lớp học của mình
            <strong>
              Lớp 3 <span className="small-dot" />
            </strong>
          </span>
          <ChevronDown size={16} />
        </button>
        <span className="nav-label">
          KHÔNG GIAN {teacher ? "GIÁO VIÊN" : "HỌC SINH"}
        </span>
        <nav aria-label="Điều hướng chính">
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={`nav-item ${page === key ? "active" : ""}`}
              onClick={() => go(key)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {key === "library" && (
                <span className="nav-count">{data.exams.length}</span>
              )}
              {page === key && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="grow-card">
            <div className="grow-icon">
              <Sprout size={26} />
              <span>✦</span>
            </div>
            <h3>Học vui, mỗi ngày!</h3>
            <p>
              Một chút cố gắng hôm nay,
              <br />
              một bước lớn ngày mai.
            </p>
            <button onClick={() => go("settings")}>
              Mang Mầm Nhỏ theo bạn <ArrowUpRight size={16} />
            </button>
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <Settings size={20} />
            <span>Cài đặt & thông báo</span>
          </button>
          <div className="sidebar-footer">
            <Sprout size={14} />
            <span>Được vun trồng bằng yêu thương</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Mở menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
            <span>Không gian {teacher ? "giáo viên" : "học sinh"}</span>
            <ChevronRight size={14} />
            <strong>{nav.find((n) => n[0] === page)?.[1] || "Cài đặt"}</strong>
          </div>
          <div className="topbar-actions">
            {demo && (
              <button className="demo-switch" onClick={onSwitch}>
                <GraduationCap size={17} />
                <span>{teacher ? "Thử vai học sinh" : "Về vai giáo viên"}</span>
              </button>
            )}
            <button
              className="notification-button icon-button"
              aria-label="Thông báo"
              onClick={onNotify}
            >
              <Bell size={21} />
              {unread > 0 && <span />}
            </button>
            <span className="topbar-divider" />
            <button className="profile" onClick={() => go("settings")}>
              <span className="avatar teacher-avatar">
                {initials(user.name)}
              </span>
              <span>
                <strong>{user.name}</strong>
                <small>{teacher ? "Giáo viên" : "Học sinh lớp 3"}</small>
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        {offline && (
          <div className="offline-bar" role="status">
            <WifiOff size={16} />
            Đang ngoại tuyến. Bài đang làm được lưu trên thiết bị; kết nối lại
            để nộp bài.
          </div>
        )}
        <main className="main-content">
          {children}
          <footer className="main-footer">
            <span>
              © {new Date().getFullYear()} Mầm Nhỏ <span>·</span> Mỗi ngày một
              điều hay
            </span>
            <span>
              Lớp 3 <span>·</span>{" "}
              {demo
                ? "Không gian trải nghiệm · Dữ liệu minh họa"
                : "Cùng học, cùng lớn lên"}{" "}
              <Heart size={12} />
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
