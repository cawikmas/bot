import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeleBot Pro — Bot Telegram Multi-Fitur",
  description:
    "Bot Telegram multi-fitur: Tag All Member, Ping Tool, Speed Test, Stiker Otomatis & Gift. Deploy di Vercel & GitHub.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
