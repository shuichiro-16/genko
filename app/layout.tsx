import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "String Keeper",
  description: "ギターごとの弦交換時期と通知タイミングを1ページで管理するSPAモック",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
