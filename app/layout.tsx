import type { Metadata } from "next";
import "./globals.css";
import "./topic-learning.css";
import "./builder-output.css";
import "./communication.css";

export const metadata: Metadata = {
  title: "MathSpeak — English for Mathematics",
  description: "Lộ trình học từ vựng tiếng Anh Toán học và thiết kế bài giảng song ngữ.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
