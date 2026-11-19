import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "../src/styles.css";
export const metadata = {
  title: "Mầm Nhỏ – Góc học tập lớp 3",
  description: "Giao bài nhẹ nhàng, học tập hứng khởi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Mầm Nhỏ", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7354cb",
  viewportFit: "cover",
};
export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
