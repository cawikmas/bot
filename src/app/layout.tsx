import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🤖 TeleBot Pro — Bot Telegram Multi-Fitur",
  description:
    "Bot Telegram lengkap dengan 23+ fitur: manajemen grup, anti-spam, kalkulator, cuaca, terjemahan, QR code, dan banyak lagi. Deploy ke Vercel via GitHub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
