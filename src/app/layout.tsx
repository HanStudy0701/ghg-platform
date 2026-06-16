import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "信義房屋溫室氣體盤查系統",
  description: "符合 ISO 14064-1:2018 的數位化溫室氣體盤查解決方案",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">{children}</body>
    </html>
  );
}
