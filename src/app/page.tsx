import { db } from "@/db";
import { groupMembers, botLogs, userWarnings, groupNotes, bannedWords } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [totalMembersResult, totalLogsResult, recentLogs, commandStatsResult] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(groupMembers),
      db.select({ count: sql<number>`count(*)` }).from(botLogs),
      db.select().from(botLogs).orderBy(desc(botLogs.createdAt)).limit(8),
      db
        .select({ command: botLogs.command, count: sql<number>`count(*)` })
        .from(botLogs)
        .groupBy(botLogs.command)
        .orderBy(sql`count(*) desc`)
        .limit(6),
    ]);

  const totalMembers = Number(totalMembersResult[0]?.count ?? 0);
  const totalLogs = Number(totalLogsResult[0]?.count ?? 0);

  const commandStats = commandStatsResult.map((s) => ({
    command: s.command,
    count: Number(s.count),
  }));

  const commandIcons: Record<string, string> = {
    start: "▶️", help: "❓", ping: "🏓", speedtest: "🚀", tagall: "👥",
    tagadmin: "👑", sticker: "🎨", gift: "🎁", info: "ℹ️", stats: "📊",
    warn: "⚠️", kick: "🚫", mute: "🔇", unmute: "🔊", promote: "⭐",
    demote: "👤", addbanned: "🚫", delbanned: "✂️", listbanned: "📋",
    antispam: "🛡️", note: "📌", getnote: "📖", notes: "📚", delnote: "🗑️",
    topactive: "🏆", qr: "🔲", calc: "🧮", currency: "💱", translate: "🌐",
    weather: "🌤️", poll: "📊", setwelcome: "👋", welcome: "🎉",
    setmaxwarn: "⚙️", uptime: "⏱️",
  };

  const allFeatures = [
    { icon: "👥", title: "Tag All Member", cmd: "/tagall", desc: "Tag semua member grup sekaligus, admin only" },
    { icon: "👑", title: "Tag Admin", cmd: "/tagadmin", desc: "Mention semua admin & owner grup" },
    { icon: "⚠️", title: "Sistem Warn", cmd: "/warn", desc: "Beri peringatan + auto kick jika melebihi batas" },
    { icon: "🚫", title: "Kick Member", cmd: "/kick", desc: "Keluarkan member dari grup" },
    { icon: "🔇", title: "Mute/Unmute", cmd: "/mute", desc: "Bungkam member untuk waktu tertentu" },
    { icon: "⭐", title: "Promote/Demote", cmd: "/promote", desc: "Kelola status admin member" },
    { icon: "🛡️", title: "Anti-Spam", cmd: "/antispam", desc: "Filter kata terlarang otomatis" },
    { icon: "📌", title: "Catatan Grup", cmd: "/note", desc: "Simpan & ambil catatan di grup" },
    { icon: "📊", title: "Statistik", cmd: "/stats", desc: "Statistik lengkap grup dan member" },
    { icon: "🏆", title: "Top Aktif", cmd: "/topactive", desc: "Leaderboard member paling aktif" },
    { icon: "🏓", title: "Ping", cmd: "/ping", desc: "Ukur latency bot secara real-time" },
    { icon: "🚀", title: "Speed Test", cmd: "/speedtest", desc: "Tes kecepatan internet server via Cloudflare" },
    { icon: "⏱️", title: "Uptime", cmd: "/uptime", desc: "Lihat uptime dan status server" },
    { icon: "🎨", title: "Buat Stiker", cmd: "/sticker [teks]", desc: "Buat stiker SVG dari teks dengan gradien warna" },
    { icon: "🔲", title: "QR Code", cmd: "/qr [teks]", desc: "Buat QR Code dari teks atau URL" },
    { icon: "🧮", title: "Kalkulator", cmd: "/calc [ekspresi]", desc: "Hitung ekspresi matematika kompleks" },
    { icon: "💱", title: "Konversi Mata Uang", cmd: "/currency", desc: "Konversi mata uang real-time via Frankfurt API" },
    { icon: "🌐", title: "Terjemahan", cmd: "/translate", desc: "Terjemahkan teks ke berbagai bahasa" },
    { icon: "🌤️", title: "Info Cuaca", cmd: "/weather [kota]", desc: "Data cuaca real-time kota manapun" },
    { icon: "📊", title: "Buat Polling", cmd: "/poll", desc: "Buat polling interaktif di grup" },
    { icon: "👋", title: "Pesan Sambutan", cmd: "/setwelcome", desc: "Atur pesan selamat datang otomatis" },
    { icon: "🎁", title: "Kirim Gift", cmd: "/gift @user", desc: "Kirim gift Telegram Stars ke member" },
    { icon: "ℹ️", title: "Info", cmd: "/info", desc: "Info lengkap bot dan grup" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            Bot Aktif & Online
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-5xl font-extrabold text-transparent md:text-7xl">
            🤖 TeleBot Pro
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400">
            Bot Telegram multi-fitur dengan <strong className="text-white">23+ perintah</strong> — manajemen grup, anti-spam, tools keren, dan banyak lagi. Deploy sekali, update via GitHub!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
            >
              📊 Buka Dashboard
            </Link>
            <a
              href="https://github.com/cawikmas/bot"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3 font-semibold text-slate-300 transition hover:bg-slate-700"
            >
              ⭐ GitHub Repo
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total Member", value: totalMembers, icon: "👥", color: "from-blue-500 to-blue-700" },
            { label: "Total Commands", value: totalLogs, icon: "⚡", color: "from-purple-500 to-purple-700" },
            { label: "Fitur Aktif", value: 23, icon: "🔧", color: "from-green-500 to-green-700" },
            { label: "Uptime", value: "99.9%", icon: "✅", color: "from-yellow-500 to-orange-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 text-center backdrop-blur">
              <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-2xl shadow-lg`}>
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-6xl px-6 pb-12">
        <h2 className="mb-2 text-center text-3xl font-bold text-white">✨ Semua Fitur</h2>
        <p className="mb-8 text-center text-slate-400">23+ perintah siap pakai</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {allFeatures.map((f) => (
            <div key={f.cmd} className="group rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 transition hover:border-blue-500/50 hover:bg-slate-800/80">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <div className="mb-1 font-semibold text-white">{f.title}</div>
              <div className="mb-3 text-xs text-slate-400">{f.desc}</div>
              <code className="rounded-lg bg-slate-900/80 px-2 py-1 text-xs font-mono text-blue-300">{f.cmd}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Stats + Activity */}
      <div className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Command Stats */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h3 className="mb-4 text-lg font-bold text-white">📊 Statistik Perintah</h3>
            {commandStats.length === 0 ? (
              <p className="text-slate-500">Belum ada perintah yang digunakan</p>
            ) : (
              <div className="space-y-3">
                {commandStats.map((stat) => {
                  const maxCount = Math.max(...commandStats.map((s) => s.count));
                  const pct = Math.round((stat.count / maxCount) * 100);
                  return (
                    <div key={stat.command}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-300">
                          {commandIcons[stat.command] || "🔧"} /{stat.command}
                        </span>
                        <span className="font-semibold text-white">{stat.count}x</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-700">
                        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h3 className="mb-4 text-lg font-bold text-white">🕐 Aktivitas Terbaru</h3>
            {recentLogs.length === 0 ? (
              <p className="text-slate-500">Belum ada aktivitas</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-xl bg-slate-900/50 p-3">
                    <span className="mt-0.5 text-lg">{commandIcons[log.command] || "🔧"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-blue-300">/{log.command}</span>
                        <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleTimeString("id-ID")}</span>
                      </div>
                      {log.result && <p className="mt-0.5 truncate text-xs text-slate-400">{log.result}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8">
          <h2 className="mb-6 text-2xl font-bold text-white">🚀 Cara Setup Bot</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-4 font-semibold text-blue-300">📋 Langkah-langkah</h3>
              <ol className="space-y-3 text-sm text-slate-300">
                {[
                  "Buat bot di @BotFather → dapatkan TELEGRAM_BOT_TOKEN",
                  "Fork repo GitHub ini ke akun kamu",
                  "Deploy ke Vercel & set environment variables",
                  "Buka /api/setup-webhook?secret=YOUR_SECRET",
                  "Tambahkan bot ke grup sebagai Admin",
                  "Ketik /start di grup — selesai!",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-blue-300">⚙️ Environment Variables</h3>
              <div className="rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-300">
                <p className="text-slate-500"># Wajib diisi di Vercel</p>
                <p className="mt-2 text-green-400">TELEGRAM_BOT_TOKEN</p>
                <p className="text-slate-400">= your_bot_token_here</p>
                <p className="mt-2 text-green-400">DATABASE_URL</p>
                <p className="text-slate-400">= postgresql://...</p>
                <p className="mt-2 text-green-400">SETUP_SECRET</p>
                <p className="text-slate-400">= your_random_secret</p>
                <p className="mt-4 text-slate-500"># Setup Webhook URL:</p>
                <p className="mt-1 text-yellow-400">/api/setup-webhook</p>
                <p className="text-slate-400">?secret=YOUR_SECRET</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>
          🤖 TeleBot Pro — Built with Next.js, grammY, PostgreSQL, Drizzle ORM
        </p>
        <p className="mt-1">
          <Link href="/dashboard" className="text-blue-400 hover:underline">Dashboard</Link>
          {" · "}
          <a href="https://github.com/cawikmas/bot" className="text-blue-400 hover:underline" target="_blank" rel="noreferrer">GitHub</a>
        </p>
      </footer>
    </main>
  );
}
