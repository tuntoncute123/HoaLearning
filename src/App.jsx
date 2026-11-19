import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  ArrowRight,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import Shell from "./components/Shell";
import { Loading, Modal, Empty, Button } from "./components/UI";
import Dashboard from "./screens/Dashboard";
import Library, { ImportModal, ExamEditor } from "./screens/Library";
import Assignments, {
  AssignModal,
  AssignmentInfo,
} from "./screens/Assignments";
import Students from "./screens/Students";
import Results, { GradeModal } from "./screens/Results";
import Settings, { Login } from "./screens/Settings";
import Workspace from "./screens/Workspace";
import { api, fullDate } from "./lib/api";
import { disablePush } from "./lib/pwa";
import useInstall from "./lib/useInstall";
import MobileInstall from "./components/MobileInstall";
const blank = {
  assignments: [],
  exams: [],
  students: [],
  attempts: [],
  notifications: [],
};
export default function App() {
  const install = useInstall();
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [data, setData] = useState(blank),
    [page, setPage] = useState(
      new URLSearchParams(location.search).get("page") || "dashboard",
    ),
    [modal, setModal] = useState(null),
    [exam, setExam] = useState(null),
    [grade, setGrade] = useState(null),
    [selected, setSelected] = useState(null),
    [work, setWork] = useState(null),
    [messages, setMessages] = useState([]),
    [offline, setOffline] = useState(!navigator.onLine),
    [fatal, setFatal] = useState("");
  const toastId = useRef(0),
    initial = useRef(true);
  function toast(message, type = "success") {
    const id = ++toastId.current;
    setMessages((m) => [...m, { id, message, type }]);
    setTimeout(() => setMessages((m) => m.filter((t) => t.id !== id)), 6000);
  }
  async function refresh() {
    const r = await api("/data");
    setData(r);
    if (session?.user?.role === "student")
      localStorage.setItem(`mam-data:${session.user.id}`, JSON.stringify(r));
    return r;
  }
  useEffect(() => {
    async function init() {
      try {
        const s = await api("/session");
        setSession(s);
        if (s.user) localStorage.setItem("mam-session", JSON.stringify(s));
      } catch (e) {
        if (!navigator.onLine) {
          const cached = JSON.parse(
            localStorage.getItem("mam-session") || "null",
          );
          if (cached?.user?.role === "student") {
            setSession(cached);
            setData(
              JSON.parse(
                localStorage.getItem(`mam-data:${cached.user.id}`) || "null",
              ) || blank,
            );
          } else setFatal("Kết nối mạng để mở không gian giáo viên.");
        } else setFatal(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
    function online() {
      setOffline(false);
    }
    function off() {
      setOffline(true);
    }
    window.addEventListener("online", online);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (!session?.user) return;
    const requested = new URLSearchParams(location.search).get("assignment");
    if (initial.current && requested && session.user.role === "student")
      setWork(requested);
    initial.current = false;
    refresh().catch((e) => {
      if (navigator.onLine) toast(e.message, "error");
    });
    const timer = setInterval(() => {
      if (navigator.onLine) refresh().catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [session?.user?.id]);
  function navigate(p) {
    if (
      session?.user?.role === "student" &&
      ["students", "library"].includes(p)
    )
      p = "assignments";
    setPage(p);
    setWork(null);
    history.replaceState(null, "", p === "dashboard" ? "/" : `/?page=${p}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function edit(id) {
    try {
      setExam(await api(`/exams/${id}`));
      setModal("editor");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  async function openGrade(id) {
    try {
      setGrade(await api(`/attempts/${id}`));
      setModal("grade");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  function assign(id) {
    setSelected(typeof id === "string" ? id : null);
    setModal("assign");
  }
  function openAssignment(a) {
    if (!a) return;
    if (session.user.role === "student") {
      setWork(a.id);
      history.replaceState(null, "", `/?assignment=${a.id}`);
    } else {
      setSelected(a);
      setModal("assignment-info");
    }
  }
  async function switched() {
    try {
      await disablePush();
      const s = await api("/auth/demo", {
        method: "POST",
        body: { role: session.user.role === "teacher" ? "student" : "teacher" },
      });
      setSession(s);
      localStorage.setItem("mam-session", JSON.stringify(s));
      setData(blank);
      setPage("dashboard");
      setWork(null);
      setModal(null);
      history.replaceState(null, "", "/");
      toast(
        s.user.role === "student"
          ? "Em đang ở góc học tập của học sinh."
          : "Đã trở lại không gian giáo viên.",
      );
    } catch (e) {
      toast(e.message, "error");
    }
  }
  async function logout() {
    try {
      await disablePush();
      await api("/auth/logout", { method: "POST" });
      localStorage.removeItem("mam-session");
      setSession({ user: null, demo: session.demo });
      setData(blank);
      setWork(null);
      setModal(null);
    } catch (e) {
      toast(e.message, "error");
    }
  }
  function loggedIn(s) {
    setSession(s);
    setFatal("");
    localStorage.setItem("mam-session", JSON.stringify(s));
    navigate("dashboard");
  }
  async function completed() {
    setModal(null);
    await refresh().catch((e) => toast(e.message, "error"));
  }
  async function notifications() {
    setModal("notifications");
    try {
      await api("/notifications/read", { method: "POST" });
      await refresh();
    } catch (e) {
      toast(e.message, "error");
    }
  }
  const toastList = (
    <div className="toast-stack" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id} className={`toast ${m.type}`}>
          <span>
            {m.type === "error" ? <WifiOff size={19} /> : <Check size={19} />}
          </span>
          <p>{m.message}</p>
          <button
            aria-label="Đóng thông báo"
            onClick={() => setMessages((s) => s.filter((t) => t.id !== m.id))}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
  if (loading) return <Loading />;
  if (fatal)
    return (
      <>
        <Empty title="Góc học tập đang chờ kết nối" text={fatal}>
          <Button onClick={() => location.reload()}>
            <RefreshCw size={18} />
            Thử lại
          </Button>
        </Empty>
        {toastList}
      </>
    );
  if (!session?.user)
    return (
      <>
        <Login onLogin={loggedIn} demo={session?.demo} install={install} />
        {toastList}
      </>
    );
  if (work)
    return (
      <>
        <Workspace
          key={work}
          assignmentId={work}
          user={session.user}
          onExit={() => {
            setWork(null);
            navigate("assignments");
            refresh().catch(() => {});
          }}
          toast={toast}
        />
        {toastList}
      </>
    );
  const common = {
    user: session.user,
    data,
    navigate,
    onAssign: assign,
    onImport: () => setModal("import"),
    onOpen: openAssignment,
    onEdit: edit,
  };
  return (
    <>
      <Shell
        user={session.user}
        demo={session.demo}
        page={page}
        navigate={navigate}
        data={data}
        onNotify={notifications}
        onSwitch={switched}
        onLogout={logout}
        offline={offline}
      >
        {session.user.role === "student" && page !== "settings" && (
          <MobileInstall install={install} />
        )}
        {page === "dashboard" && <Dashboard {...common} />}
        {page === "library" && session.user.role === "teacher" && (
          <Library {...common} />
        )}
        {page === "assignments" && <Assignments {...common} />}
        {page === "students" && session.user.role === "teacher" && (
          <Students {...common} refresh={refresh} toast={toast} />
        )}
        {page === "results" && <Results {...common} onGrade={openGrade} />}
        {page === "settings" && (
          <Settings
            user={session.user}
            demo={session.demo}
            toast={toast}
            onLogout={logout}
            install={install}
          />
        )}
      </Shell>
      {modal === "import" && (
        <ImportModal
          onClose={() => setModal(null)}
          toast={toast}
          onDone={async (id) => {
            await refresh();
            setModal(null);
            navigate("library");
            if (id) edit(id);
          }}
        />
      )}
      {modal === "editor" && exam && (
        <ExamEditor
          exam={exam}
          onClose={() => setModal(null)}
          onSaved={completed}
          toast={toast}
        />
      )}
      {modal === "assign" && (
        <AssignModal
          exams={data.exams}
          selected={selected}
          toast={toast}
          onClose={() => setModal(null)}
          onDone={async () => {
            await completed();
            navigate("assignments");
          }}
          onLibrary={() => {
            setModal(null);
            navigate("library");
          }}
        />
      )}
      {modal === "assignment-info" && (
        <AssignmentInfo
          assignment={selected}
          data={data}
          onClose={() => setModal(null)}
          onResults={() => {
            setModal(null);
            navigate("results");
          }}
        />
      )}
      {modal === "grade" && grade && (
        <GradeModal
          attempt={grade}
          onClose={() => setModal(null)}
          onDone={completed}
          toast={toast}
        />
      )}
      {modal === "notifications" && (
        <Modal
          title="Những tin nhắn nhỏ"
          subtitle="Tin mới từ lớp học của mình"
          onClose={() => setModal(null)}
        >
          <div className="modal-body notification-list">
            {data.notifications.length ? (
              data.notifications.map((n) => (
                <button
                  key={n.id}
                  className="notification-item"
                  onClick={() => {
                    setModal(null);
                    const url = new URL(n.url, location.origin),
                      assignment = url.searchParams.get("assignment");
                    if (assignment && session.user.role === "student")
                      setWork(assignment);
                    else
                      navigate(url.searchParams.get("page") || "assignments");
                  }}
                >
                  <span className="notification-icon">
                    <Bell size={19} />
                  </span>
                  <span>
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <small>
                      {fullDate(n.created_at.replace(" ", "T") + "Z")}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))
            ) : (
              <Empty
                title="Mọi thứ đang thật yên bình"
                text="Tin về bài tập và kết quả sẽ xuất hiện tại đây."
              />
            )}
          </div>
        </Modal>
      )}
      {toastList}
    </>
  );
}
