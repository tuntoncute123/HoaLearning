"use client";
import dynamic from "next/dynamic";
const App = dynamic(() => import("../src/App"), {
  ssr: false,
  loading: () => <div className="loading">Đang mở góc học tập…</div>,
});
export default function ClientApp() {
  return <App />;
}
