# Mầm Nhỏ 🌱 — Next.js + PostgreSQL

Ứng dụng giao/làm bài tập lớp 3. **Frontend và backend cùng một dự án Next.js, deploy lên Vercel; PostgreSQL chạy trên Coolify.** Không còn máy chủ Express hay SQLite trong runtime. Không cần deploy backend riêng.

## Cấu trúc

```text
app/                       Next.js App Router, metadata và trang chính
app/api/[...path]/route.js  Backend Next.js Route Handlers (Node.js runtime)
src/screens/               Màn giáo viên/học sinh, thư viện, bài tập, kết quả
src/components/            Giao diện và popup hướng dẫn cài ứng dụng
src/lib/                   API, tải PDF từng phần, PWA và Web Push
server/                    Nghiệp vụ API, PostgreSQL, PDF, phân quyền và thông báo
database/schema.sql        Schema PostgreSQL, index, ràng buộc
public/                    Manifest, service worker, biểu tượng PWA/iPhone
scripts/                   Khởi tạo DB, chuyển dữ liệu cũ, kiểm chứng
```

## Chạy trên máy

Yêu cầu Node.js 24 và npm. Mở terminal thứ nhất:

```bash
npm ci
npm run db:local
```

Lệnh này chạy PostgreSQL thật trên `127.0.0.1:54329`, lưu trong `.local-postgres/`; chỉ dành cho phát triển. Mở terminal thứ hai, tạo `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:local-dev-only@localhost:54329/mam_nho
```

Sau đó:

```bash
npm run db:setup:demo
npm run dev
```

Mở **http://localhost:3000**. Dev có dữ liệu minh họa và nút đổi vai. Giáo viên mẫu: `giaovien@mamnho.vn` / `MamNho@2026`; học sinh mẫu: `DEMO0001`. `db:setup:demo` chỉ chạy với DB phát triển. Không trỏ lệnh này vào DB lớp học thật.

Trong workspace hiện tại, dữ liệu SQLite cũ đã được chuyển vào PostgreSQL cục bộ; SQLite và PDF gốc vẫn giữ nguyên. Không cần tạo lại dữ liệu demo.

## Deploy PostgreSQL trên Coolify

1. Tạo resource **PostgreSQL**, chọn phiên bản 18, database và tài khoản riêng, mật khẩu mạnh. Bật persistent storage và lịch backup theo nhu cầu lớp học.
2. Cho phép kết nối từ Vercel qua **địa chỉ/cổng bên ngoài** của PostgreSQL. URL nội bộ Docker như `postgres:5432`, `localhost` hoặc hostname chỉ trong mạng Coolify sẽ không truy cập được từ Vercel.
3. Cấu hình TLS cho kết nối PostgreSQL. Điền URL kết nối ngoài vào `DATABASE_URL`, ví dụ trong `.env.example`. Nếu dùng CA riêng, đặt PEM vào `DATABASE_SSL_CA` và bỏ các tham số `sslmode`/`sslrootcert` khỏi URL để tránh ghi đè cấu hình CA. Ứng dụng không vô hiệu hóa xác minh chứng chỉ.
4. Sao chép `.env.example` thành `.env.local` ở máy quản trị; thay `DATABASE_URL`, `TEACHER_EMAIL`, `TEACHER_NAME`, `TEACHER_PASSWORD` (ít nhất 12 ký tự), `VAPID_SUBJECT` và `APP_ORIGIN` bằng giá trị thật.
5. Chạy **một lần trước khi sử dụng website**:

```bash
npm run db:setup
```

Lệnh chạy transaction có khóa, tạo schema, một giáo viên, nhập bộ Toán mẫu (20 đề/201 câu) và lưu khóa Web Push. Chạy lại không xóa bài làm, không tạo thêm giáo viên và không thay mật khẩu hiện có. Production không tự tạo học sinh/bài nộp demo. Tệp PDF mẫu cần có trong thư mục gốc lúc chạy lệnh; nếu thiếu, thư viện để trống và giáo viên tải lên sau.

Với dữ liệu lớp học cũ cần giữ, dùng bước chuyển SQLite bên dưới **thay cho khởi tạo trước**.

## Deploy ứng dụng lên Vercel

1. Import repository, chọn thư mục **`hoa`** nếu repo chứa nhiều dự án; nếu repo bắt đầu ngay ở thư mục này thì Root Directory là `.`.
2. Framework: **Next.js**; Node.js: **24.x**; Install: `npm ci`; Build: **`npm run build`**; Output Directory: để mặc định. Không đổi Build thành chỉ `next build`: bước sau build tạo cache PWA theo phiên bản.
3. Thêm biến môi trường:
   - `DATABASE_URL`: URL PostgreSQL trên Coolify có thể truy cập từ bên ngoài.
   - `DATABASE_POOL_MAX=3`: tối đa 3 kết nối cho mỗi instance; cân đối với giới hạn kết nối DB.
   - `APP_ORIGIN`: origin HTTPS chính xác của website, không có dấu `/` cuối, ví dụ `https://lop3.example.com`.
   - `VAPID_SUBJECT`: email liên hệ dạng `mailto:...`.
   - `DATABASE_SSL_CA`: chỉ khi dùng CA riêng.
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: chỉ khi muốn dùng cặp khóa riêng; mặc định đọc khóa bền vững đã tạo trong DB.
4. Deploy theo thao tác của bạn. Sau deploy, `/api/health` phải trả `{"ok":true,"database":"postgresql"}`; đăng nhập bằng giáo viên đã tạo.

`TEACHER_PASSWORD` chỉ cần ở máy chạy `db:setup`, không cần đưa lên Vercel nếu tài khoản đã có. Không đặt bất kỳ biến DB/mật khẩu nào với tiền tố `NEXT_PUBLIC_`. Preview deployment nên dùng DB riêng và `APP_ORIGIN` tương ứng; không tự trỏ preview vào dữ liệu lớp thật.

Build không cần kết nối DB và không chạy migration. Backend không ghi dữ liệu vào ổ đĩa Vercel. Session, bài tập, đáp án, bài nộp, PDF gốc, ảnh trang PDF, khóa/subscription Web Push đều nằm trong PostgreSQL. Vì có PDF/ảnh, bản backup DB bao gồm cả tài liệu và sẽ tăng theo số tài liệu. Service worker không cache API hoặc ảnh PDF có xác thực.

## Chuyển dữ liệu từ SQLite cũ

Trỏ `DATABASE_URL` tới **database PostgreSQL trống** rồi chạy:

```bash
npm run db:migrate:sqlite -- data/mam-nho.sqlite
npm run db:setup
```

Script đọc SQLite ở chế độ read-only, chuyển các bảng và PDF trong thư mục `uploads/` cạnh file SQLite, giữ ID/tài khoản/bài làm. Toàn bộ chuyển đổi nằm trong transaction; từ chối DB đích đã có dữ liệu hoặc PDF nguồn bị thiếu. File SQLite cũ không bị xóa hoặc sửa. Không dùng DB demo cũ làm production nếu muốn bắt đầu một lớp học sạch.

## Cài ứng dụng trên điện thoại

- **Nút “Cài Mầm Nhỏ”** hiện ở màn đăng nhập học sinh, góc học tập và trang cài đặt trên điện thoại. Không hiện trên máy tính kể cả thu hẹp cửa sổ; không hiện trên tablet. Màn làm bài giữ nguyên không gian làm bài.
- **Android:** khi trình duyệt phát `beforeinstallprompt`, nút mở hộp thoại cài thật. Nếu chưa hỗ trợ, mở popup hướng dẫn Chrome → menu ⋮ → Cài đặt ứng dụng/Thêm vào màn hình chính. Hủy cài không được báo thành công; có thể thử lại.
- **iPhone:** popup hướng dẫn 5 bước trong Safari, nhận diện biểu tượng Chia sẻ, tìm “Thêm vào Màn hình chính”, “Sửa tác vụ” khi mục bị ẩn, bật “Mở dưới dạng ứng dụng web” nếu có, xác nhận “Thêm” và mở từ biểu tượng. Khi ở trình duyệt trong Zalo/Facebook hoặc trình duyệt khác, có hướng dẫn mở Safari và sao chép địa chỉ.
- Khi mở dưới chế độ standalone hoặc nhận `appinstalled`, nút tự ẩn. Trong tab trình duyệt thông thường, iOS không cung cấp API tin cậy để biết ứng dụng đã được thêm trước đó; nút vẫn có thể hiện ở tab đó.
- Manifest có biểu tượng thường/maskable 192/512, Apple touch icon 180px, `display: standalone`. Production phải có HTTPS; localhost dùng để kiểm thử. Service worker/cache chỉ bật ở bản `npm run build` + `npm start`, không bật trong `npm run dev` để tránh cache cản trở cập nhật mã.
- Bài đã mở lưu nháp trên thiết bị và phục hồi ngoại tuyến; kết nối lại để đồng bộ/nộp. Ảnh PDF yêu cầu mạng. Chỉ đăng nhập/khôi phục tài khoản học sinh đã mở trên thiết bị khi ngoại tuyến.
- Web Push trên iPhone cần iOS 16.4+ và mở từ biểu tượng trên màn hình chính. Người dùng vẫn cần tự cấp quyền thông báo.

Tài liệu: [Apple: thêm website thành ứng dụng](https://support.apple.com/en-az/guide/iphone/iphea86e5236/26/ios/26), [WebKit: Web Push trên iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## PDF và nghiệp vụ giữ lại

Giáo viên tìm/duyệt/sửa đề, giao bài với bản chụp đề, tạo mã học sinh, chấm điểm/nhận xét và xuất CSV. Học sinh làm bài, lưu nháp, nộp và xem kết quả. Phân quyền phía backend; không trả đáp án đúng cho học sinh. Autosave đồng thời không được ghi đè bài đã nộp.

PDF tối đa **20 MB / 150 trang**. Trình duyệt gửi từng phần 1 MiB, máy chủ ghép và xử lý sau khi đủ phần. Cách này giữ mỗi request dưới [giới hạn payload của Vercel Functions](https://vercel.com/docs/functions/limitations). Upload thuộc tài khoản giáo viên, có giới hạn kích thước và hết hạn sau 15 phút; dữ liệu tải dở hết hạn được dọn khi mở lượt tải mới hoặc chạy `db:setup`. Phần bị gửi lại không nhân đôi dữ liệu. Next Route Handler có thời gian tối đa 60 giây; tệp phức tạp có thể cần chia nhỏ.

Bộ Toán có cấu trúc Đề số → Câu/Bài đã kiểm tra 20 đề/201 câu. PDF scan cần OCR trước; bộ Tiếng Việt hiện có chưa hỗ trợ đầy đủ. Không tự suy đoán đáp án tệp tải mới. Đây là ứng dụng một giáo viên/một lớp, chưa có nhiều trường hoặc đăng ký giáo viên công khai. Web Push gửi best effort, chưa có hàng đợi retry.

## Kiểm chứng

```bash
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

API và browser test dùng PostgreSQL thật trong thư mục tạm, không dùng DB lớp học. Test tự khởi tạo schema, seed production và chạy Next.js production. Linux cần thư viện hệ thống cho Chromium (`npx playwright install-deps chromium` nếu có quyền cài).

Kiểm thử bao gồm đăng nhập/phân quyền, bảo vệ đáp án, bản chụp đề, nộp/chấm, autosave đồng thời, PDF hơn 4.5 MB qua nhiều phần, PNG từ DB, CSRF origin, service worker, khôi phục ngoại tuyến và các trạng thái cài PWA. Prompt Android được mô phỏng bằng sự kiện trình duyệt; hướng dẫn iPhone được kiểm tra bằng giả lập thiết bị. Chưa xác minh cài thực tế lên màn hình chính hoặc giao nhận Web Push trên điện thoại thật; cần website HTTPS và thiết bị thật sau deploy.

Các ảnh và số đo typography nằm trong `artifacts/` (không đưa vào git). Đã kiểm tra trên Chromium ở 360, 390, 768, 1366, 1920, 2560 CSS px và zoom trình duyệt thật 200%. Body ở 1366 → 1920 → 2560 là 16.27 → 18 → 20px; menu/nút là 14.27 → 16 → 18px; tiêu đề là 26.93 → 31.36 → 36.48px.

Dự án chưa được push, deploy hoặc publish trong lần thay đổi này.
