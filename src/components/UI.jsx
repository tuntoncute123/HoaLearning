import { useEffect, useRef, useState, useId } from "react";
import {
  X,
  LoaderCircle,
  Inbox,
  ChevronRight,
  Maximize2,
  Plus,
  Minus,
} from "lucide-react";
export function Button({
  children,
  variant = "primary",
  className = "",
  busy,
  ...props
}) {
  return (
    <button
      className={`button ${variant} ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy && <LoaderCircle className="spin" size={18} />}
      {children}
    </button>
  );
}
export function Badge({ children, tone = "purple" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({ title = "Chưa có nội dung", text, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef(null),
    previous = useRef(document.activeElement),
    titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
    return () => previous.current?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SectionHeading({ title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
export function TextLink({ children, ...props }) {
  return (
    <button className="text-link" {...props}>
      {children}
      <ChevronRight size={17} />
    </button>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" />
      <span>Đang mở góc học tập…</span>
    </div>
  );
}
export function SourceImage({ source, documentId }) {
  const [expanded, setExpanded] = useState(false),
    [width, setWidth] = useState(900);
  const crops = () =>
    source?.map((s, i) => (
      <div
        key={i}
        className="source-crop"
        style={{ aspectRatio: `${s.width} / ${s.bottom - s.top}` }}
      >
        <img
          src={`/api/documents/${documentId}/${s.page}.png`}
          alt={`Đề gốc, trang ${s.page}`}
          loading="lazy"
          style={{ top: `${(-100 * s.top) / (s.bottom - s.top)}%` }}
        />
      </div>
    ));
  return (
    <>
      <div className="source-images">{crops()}</div>
      <div className="source-expand">
        <button className="text-link" onClick={() => setExpanded(true)}>
          <Maximize2 size={16} />
          Phóng to đề gốc
        </button>
      </div>
      {expanded && (
        <Modal
          wide
          title="Cùng nhìn đề rõ hơn nhé"
          onClose={() => setExpanded(false)}
        >
          <div className="source-zoom-toolbar">
            <span>Kéo ngang để xem trọn hình và các số.</span>
            <Button
              variant="secondary"
              aria-label="Thu nhỏ đề"
              disabled={width <= 500}
              onClick={() => setWidth((w) => w - 200)}
            >
              <Minus size={18} />
            </Button>
            <Button
              variant="secondary"
              aria-label="Phóng lớn đề"
              disabled={width >= 1700}
              onClick={() => setWidth((w) => w + 200)}
            >
              <Plus size={18} />
            </Button>
          </div>
          <div
            className="source-zoom-scroll"
            tabIndex="0"
            aria-label="Ảnh đề gốc phóng to"
          >
            <div className="source-zoom-content" style={{ width }}>
              {crops()}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
