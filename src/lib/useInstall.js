import { useEffect, useRef, useState } from "react";
import { registerWorker } from "./pwa";
export default function useInstall() {
  const [device, setDevice] = useState({
    phone: false,
    ios: false,
    inApp: false,
    installed: false,
  });
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const deferred = useRef(null);
  useEffect(() => {
    registerWorker();
    const ua = navigator.userAgent;
    const ios = /iPhone|iPod/i.test(ua);
    const tablet =
      /iPad|Tablet/i.test(ua) ||
      (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) ||
      (/Android/i.test(ua) && !/Mobile/i.test(ua));
    const phone =
      !tablet &&
      (ios ||
        /Android.*Mobile|Windows Phone/i.test(ua) ||
        navigator.userAgentData?.mobile === true);
    const inApp = /FBAN|FBAV|Instagram|Line\/|Zalo|; wv\)/i.test(ua);
    const mode = matchMedia("(display-mode: standalone)");
    const update = () =>
      setDevice({
        phone,
        ios,
        inApp,
        installed: mode.matches || navigator.standalone === true,
      });
    update();
    const before = (e) => {
      if (phone) {
        e.preventDefault();
        deferred.current = e;
      }
    };
    const installed = () => {
      deferred.current = null;
      setDevice((d) => ({ ...d, installed: true }));
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", installed);
    mode.addEventListener("change", update);
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", installed);
      mode.removeEventListener("change", update);
    };
  }, []);
  async function install() {
    setMessage("");
    if (device.ios || device.inApp || !deferred.current) {
      setOpen(true);
      return;
    }
    setBusy(true);
    const prompt = deferred.current;
    deferred.current = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        setDevice((d) => ({ ...d, installed: true }));
        setOpen(false);
      } else {
        setMessage("Em chưa cài ứng dụng. Có thể thử lại bất cứ lúc nào.");
        setOpen(true);
      }
    } catch {
      setMessage(
        "Trình duyệt chưa mở được hộp thoại cài. Em làm theo hướng dẫn bên dưới nhé.",
      );
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }
  return {
    ...device,
    visible: device.phone && !device.installed,
    open,
    busy,
    message,
    install,
    close: () => setOpen(false),
  };
}
