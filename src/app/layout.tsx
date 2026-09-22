import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeleBot Pro — Dashboard",
  description: "Bot Telegram Multi-Fitur dengan 100+ Perintah | grammY + Next.js + PostgreSQL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased bg-gray-950">{children}</body>
    </html>
  );
}
