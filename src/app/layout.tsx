import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeleBot Pro — Bot Telegram Multi-Fitur",
  description:
    "Bot Telegram lengkap dengan 65+ fitur: moderasi, ekonomi, fun games, tools, statistik, giveaway, dan banyak lagi!",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
