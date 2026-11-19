import { useState } from "react";
import {
  Download,
  Share,
  PlusSquare,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { Button, Modal } from "./UI";
export default function MobileInstall({ install, card = false }) {
  const [copied, setCopied] = useState(false);
  if (!install.visible) return null;
  const url = location.origin + "/";
  const safari =
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent) &&
    !install.inApp;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <>
      <section
        className={`mobile-install ${card ? "panel install-card" : ""}`}
        aria-label="Cài ứng dụng trên điện thoại"
      >
        <img src="/icon-192.png" alt="" width="48" height="48" />
        <div className="mobile-install-copy">
          <strong>Mang lớp học lên màn hình chính</strong>
          <p>Mở Mầm Nhỏ như một ứng dụng, chỉ bằng một chạm.</p>
        </div>
        <Button type="button" busy={install.busy} onClick={install.install}>
          <Download size={18} />
          Cài Mầm Nhỏ
        </Button>
      </section>
      {install.open && (
        <Modal
          title={
            install.ios
              ? "Cài Mầm Nhỏ trên iPhone"
              : "Cài Mầm Nhỏ trên điện thoại"
          }
          subtitle="Miễn phí · Không cần tải từ cửa hàng ứng dụng"
          onClose={install.close}
        >
          <div className="modal-body install-guide">
            {install.message && <p role="status">{install.message}</p>}
            {!window.isSecureContext && (
              <p className="notice">
                Em cần mở địa chỉ HTTPS của lớp để cài ứng dụng.
              </p>
            )}
            {(install.inApp || (install.ios && !safari)) && (
              <div className="install-browser-note">
                <strong>
                  Mở bằng {install.ios ? "Safari" : "Chrome"} trước nhé
                </strong>
                <p>
                  Nếu đang xem trong Zalo, Facebook hoặc trình duyệt khác, hãy
                  sao chép địa chỉ bên dưới, mở{" "}
                  {install.ios ? "Safari" : "Chrome"} rồi dán vào thanh địa chỉ.
                </p>
                <label>
                  Địa chỉ lớp học
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <Button type="button" variant="secondary" onClick={copy}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}{" "}
                  {copied ? "Đã sao chép" : "Sao chép địa chỉ"}
                </Button>
              </div>
            )}
            {install.ios ? (
              <ol className="install-steps">
                <li>
                  <span>
                    <Smartphone aria-hidden="true" />
                  </span>
                  <div>
                    <strong>1. Mở trang này trong Safari</strong>
                    <p>
                      Dùng Safari (biểu tượng la bàn) trên iPhone. Nếu đang ở
                      Safari rồi, em chuyển sang bước 2.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <Share aria-hidden="true" />
                  </span>
                  <div>
                    <strong>2. Nhấn nút Chia sẻ</strong>
                    <p>
                      Tìm biểu tượng hình vuông có mũi tên hướng lên ở thanh
                      công cụ. Nếu đang ẩn, chạm thanh địa chỉ hoặc mở nút “…”
                      rồi chọn “Chia sẻ”.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <PlusSquare aria-hidden="true" />
                  </span>
                  <div>
                    <strong>3. Chọn “Thêm vào Màn hình chính”</strong>
                    <p>
                      Cuộn xuống danh sách hành động trong bảng Chia sẻ. Nếu
                      chưa thấy, kéo xuống cuối, chọn “Sửa tác vụ” (Edit
                      Actions), tìm rồi thêm “Thêm vào Màn hình chính” (Add to
                      Home Screen).
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <PlusSquare aria-hidden="true" />
                  </span>
                  <div>
                    <strong>4. Xác nhận thêm ứng dụng</strong>
                    <p>
                      Giữ tên “Mầm Nhỏ”. Nếu có tùy chọn “Mở dưới dạng ứng dụng
                      web” (Open as Web App), hãy bật lên. Nhấn “Thêm” (Add) ở
                      góc trên.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <img src="/icon-192.png" alt="" />
                  </span>
                  <div>
                    <strong>5. Mở Mầm Nhỏ từ màn hình chính</strong>
                    <p>
                      Trở về màn hình chính iPhone, chạm biểu tượng Mầm Nhỏ rồi
                      đăng nhập bằng mã cô gửi. Từ lần sau, em chỉ cần chạm biểu
                      tượng để vào lớp.
                    </p>
                  </div>
                </li>
              </ol>
            ) : (
              <ol className="install-steps">
                <li>
                  <span>
                    <Smartphone aria-hidden="true" />
                  </span>
                  <div>
                    <strong>1. Mở bằng Chrome</strong>
                    <p>
                      Mở địa chỉ lớp bằng Chrome trên điện thoại Android. Nếu
                      đang ở trong Zalo hoặc Facebook, hãy mở bằng trình duyệt
                      ngoài.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <PlusSquare aria-hidden="true" />
                  </span>
                  <div>
                    <strong>2. Mở menu ⋮ của trình duyệt</strong>
                    <p>
                      Chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.
                      Tên mục có thể khác tùy trình duyệt.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <Download aria-hidden="true" />
                  </span>
                  <div>
                    <strong>3. Nhấn “Cài đặt” hoặc “Thêm”</strong>
                    <p>
                      Xác nhận trong hộp thoại của điện thoại. Sau đó mở biểu
                      tượng Mầm Nhỏ trên màn hình chính để vào lớp.
                    </p>
                  </div>
                </li>
              </ol>
            )}
            <p className="install-footnote">
              {install.ios
                ? "iPhone không cho website tự thêm biểu tượng; em cần làm các bước trên. Thông báo cần iOS 16.4 trở lên và mở từ biểu tượng đã thêm."
                : "Nếu chưa có mục cài đặt, hãy cập nhật Chrome và thử lại; em vẫn có thể học ngay trên website."}
            </p>
            <Button
              type="button"
              className="full-width"
              onClick={install.close}
            >
              Em đã hiểu
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
