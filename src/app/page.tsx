import { db } from "@/db";
import { groupMembers, botLogs } from "@/db/schema";
import { desc, count, eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let totalMembers = 0;
  let totalLogs = 0;
  let recentLogs: Array<{
    id: number;
    command: string;
    chatId: number;
    userId: number | null;
    result: string | null;
    createdAt: Date;
  }> = [];
  let commandStats: Array<{ command: string; count: number }> = [];

  try {
    const [membersResult] = await db.select({ count: count() }).from(groupMembers);
    const [logsResult] = await db.select({ count: count() }).from(botLogs);
    totalMembers = membersResult?.count ?? 0;
    totalLogs = logsResult?.count ?? 0;

    recentLogs = await db
      .select()
      .from(botLogs)
      .orderBy(desc(botLogs.createdAt))
      .limit(10);

    // Command statistics
    const rawStats = await db
      .select({ command: botLogs.command, count: count() })
      .from(botLogs)
      .groupBy(botLogs.command)
      .orderBy(desc(count()));

    commandStats = rawStats.map((s) => ({ command: s.command, count: s.count }));
  } catch {
    // DB not ready yet
  }

  const features = [
    {
      icon: "👥",
      title: "Tag All Member",
      desc: "Tag semua member aktif di grup dengan satu perintah /tagall",
      cmd: "/tagall",
      color: "from-blue-500 to-blue-700",
    },
    {
      icon: "👑",
      title: "Tag Admin",
      desc: "Mention semua admin & owner grup dengan /tagadmin",
      cmd: "/tagadmin",
      color: "from-purple-500 to-purple-700",
    },
    {
      icon: "🏓",
      title: "Ping Tool",
      desc: "Ukur latency bot secara real-time dengan perintah /ping",
      cmd: "/ping",
      color: "from-green-500 to-green-700",
    },
    {
      icon: "🚀",
      title: "Speed Test",
      desc: "Tes kecepatan internet server bot via Cloudflare dengan /speedtest",
      cmd: "/speedtest",
      color: "from-orange-500 to-orange-700",
    },
    {
      icon: "🎨",
      title: "Buat Stiker",
      desc: "Buat stiker unik dari teks dengan gradien warna otomatis",
      cmd: "/sticker [teks]",
      color: "from-pink-500 to-pink-700",
    },
    {
      icon: "🎁",
      title: "Kirim Gift",
      desc: "Kirim gift Telegram ke member grup secara otomatis",
      cmd: "/gift @username",
      color: "from-yellow-500 to-yellow-700",
    },
  ];

  const commandIcons: Record<string, string> = {
    ping: "🏓",
    speedtest: "🚀",
    tagall: "👥",
    tagadmin: "👑",
    sticker: "🎨",
    gift: "🎁",
    start: "▶️",
    help: "❓",
    info: "ℹ️",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div
        className="relative overflow-hidden py-20 px-6"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-6 border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Bot Aktif & Online
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🤖 TeleBot Pro
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Bot Telegram multi-fitur: Tag All, Ping, Speed Test, Stiker Otomatis & Gift — siap deploy di Vercel & GitHub
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href={`https://t.me/${process.env.BOT_USERNAME || "your_bot"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              🚀 Buka di Telegram
            </a>
            <Link
              href="/dashboard"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 px-8 py-3 rounded-xl font-bold text-lg transition-all hover:scale-105"
            >
              📊 Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-5xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Member", value: totalMembers, icon: "👥" },
            { label: "Total Commands", value: totalLogs, icon: "⚡" },
            { label: "Fitur Aktif", value: 6, icon: "🔧" },
            { label: "Uptime", value: "99.9%", icon: "✅" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center hover:border-gray-700 transition-colors"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">✨ Fitur Bot</h2>
        <p className="text-gray-400 text-center mb-10">
          Semua perintah yang tersedia di bot ini
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-600 transition-all hover:scale-105"
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${f.color} text-2xl mb-4 shadow-lg`}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{f.desc}</p>
              <code className="bg-gray-800 text-blue-400 px-3 py-1 rounded-lg text-sm font-mono">
                {f.cmd}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Command Stats + Recent Logs */}
      <div className="max-w-5xl mx-auto px-6 pb-16 grid md:grid-cols-2 gap-6">
        {/* Command Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>📊</span> Statistik Perintah
          </h3>
          {commandStats.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Belum ada perintah yang digunakan
            </p>
          ) : (
            <div className="space-y-3">
              {commandStats.slice(0, 6).map((stat) => (
                <div key={stat.command} className="flex items-center gap-3">
                  <span className="text-xl w-8">
                    {commandIcons[stat.command] || "🔧"}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">/{stat.command}</span>
                      <span className="text-sm text-gray-400">
                        {stat.count}x
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (stat.count / (commandStats[0]?.count || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>🕐</span> Aktivitas Terbaru
          </h3>
          {recentLogs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Belum ada aktivitas tercatat
            </p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl"
                >
                  <span className="text-lg">
                    {commandIcons[log.command] || "🔧"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-blue-400 text-xs font-mono">
                        /{log.command}
                      </code>
                      <span className="text-gray-500 text-xs shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                    {log.result && (
                      <p className="text-gray-400 text-xs mt-1 truncate">
                        {log.result}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            🚀 Cara Setup Bot
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-blue-400">📋 Konfigurasi</h3>
              <ol className="space-y-3 text-sm text-gray-300">
                <li className="flex gap-3">
                  <span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Buat bot di @BotFather dan dapatkan <code className="bg-gray-800 px-1 rounded text-yellow-400">TELEGRAM_BOT_TOKEN</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Deploy ke Vercel dan set environment variable <code className="bg-gray-800 px-1 rounded text-yellow-400">TELEGRAM_BOT_TOKEN</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Tambahkan <code className="bg-gray-800 px-1 rounded text-yellow-400">BOT_USERNAME</code> dan <code className="bg-gray-800 px-1 rounded text-yellow-400">SETUP_SECRET</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span>Jalankan setup webhook untuk menghubungkan bot ke Vercel</span>
                </li>
              </ol>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-green-400">⚙️ Setup Webhook</h3>
              <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs space-y-2">
                <p className="text-gray-500"># Setup webhook via browser:</p>
                <p className="text-green-400 break-all">
                  GET /api/setup-webhook?secret=YOUR_SETUP_SECRET
                </p>
                <p className="text-gray-500 mt-3"># Atau via curl:</p>
                <p className="text-yellow-400 break-all">
                  curl https://your-app.vercel.app/api/setup-webhook?secret=setup123
                </p>
              </div>
              <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs">
                <p className="text-gray-500"># Environment Variables:</p>
                <p className="text-blue-400">TELEGRAM_BOT_TOKEN=xxx</p>
                <p className="text-blue-400">BOT_USERNAME=your_bot</p>
                <p className="text-blue-400">DATABASE_URL=postgresql://...</p>
                <p className="text-blue-400">SETUP_SECRET=setup123</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
        <p>🤖 TeleBot Pro — Built with Next.js, grammY & PostgreSQL</p>
        <p className="mt-2">
          Deploy di{" "}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            Vercel
          </a>{" "}
          &amp;{" "}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
