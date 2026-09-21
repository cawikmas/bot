import { db } from "@/db";
import {
  groupMembers,
  botLogs,
  userWarnings,
  bannedWords,
  groupNotes,
  userStats,
  groupSettings,
} from "@/db/schema";
import { sql, desc, eq, and } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    members,
    logs,
    warnings,
    banned,
    notes,
    groupSettingsList,
    commandStatsResult,
    groupStatsResult,
    topActiveUsers,
  ] = await Promise.all([
    db.select().from(groupMembers).orderBy(desc(groupMembers.updatedAt)).limit(30),
    db.select().from(botLogs).orderBy(desc(botLogs.createdAt)).limit(50),
    db.select().from(userWarnings).orderBy(desc(userWarnings.createdAt)).limit(20),
    db.select().from(bannedWords),
    db.select().from(groupNotes),
    db.select().from(groupSettings),
    db
      .select({ command: botLogs.command, count: sql<number>`count(*)` })
      .from(botLogs)
      .groupBy(botLogs.command)
      .orderBy(sql`count(*) desc`),
    db
      .select({ chatId: groupMembers.chatId, memberCount: sql<number>`count(*)` })
      .from(groupMembers)
      .where(eq(groupMembers.isActive, true))
      .groupBy(groupMembers.chatId),
    db.select().from(userStats).orderBy(desc(userStats.messageCount)).limit(10),
  ]);

  const commandStats = commandStatsResult.map((s) => ({
    command: s.command,
    count: Number(s.count),
  }));

  const groupStats = groupStatsResult.map((g) => ({
    chatId: g.chatId,
    memberCount: Number(g.memberCount),
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

  // Build member map for user stats
  const memberMap: Record<number, { firstName?: string | null; username?: string | null }> = {};
  for (const m of members) memberMap[m.userId] = { firstName: m.firstName, username: m.username };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h1 className="font-bold text-white">TeleBot Pro Dashboard</h1>
              <p className="text-xs text-slate-400">Monitoring & Manajemen Bot</p>
            </div>
          </div>
          <Link href="/" className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700">
            ← Beranda
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Member", value: members.filter((m) => m.isActive).length, icon: "👥", color: "from-blue-500 to-blue-700" },
            { label: "Grup", value: groupStats.length, icon: "💬", color: "from-purple-500 to-purple-700" },
            { label: "Commands", value: logs.length, icon: "⚡", color: "from-green-500 to-green-700" },
            { label: "Peringatan", value: warnings.length, icon: "⚠️", color: "from-yellow-500 to-orange-600" },
            { label: "Kata Banned", value: banned.length, icon: "🚫", color: "from-red-500 to-red-700" },
            { label: "Catatan", value: notes.length, icon: "📌", color: "from-pink-500 to-rose-600" },
            { label: "Pengaturan Grup", value: groupSettingsList.length, icon: "⚙️", color: "from-teal-500 to-cyan-600" },
            { label: "Uptime", value: "100%", icon: "✅", color: "from-emerald-500 to-green-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 text-center">
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-xl shadow`}>
                {s.icon}
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Grup Terdaftar */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>💬</span> Grup Terdaftar
            </h2>
            {groupStats.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                <p className="text-3xl">💬</p>
                <p className="mt-2 text-sm">Belum ada grup</p>
                <p className="text-xs text-slate-600">Tambahkan bot ke grup & ketik /start</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groupStats.map((g) => {
                  const settings = groupSettingsList.find((s) => s.chatId === g.chatId);
                  return (
                    <div key={g.chatId} className="flex items-center justify-between rounded-xl bg-slate-900/50 p-3">
                      <div>
                        <p className="font-mono text-xs text-slate-400">ID: {g.chatId}</p>
                        <div className="mt-1 flex gap-1">
                          {settings?.antiSpamEnabled && (
                            <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-300">🛡️ Anti-spam</span>
                          )}
                          {settings?.welcomeEnabled !== false && (
                            <span className="rounded bg-green-900/50 px-1.5 py-0.5 text-xs text-green-300">👋 Welcome</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-white">{g.memberCount}</span>
                        <p className="text-xs text-slate-400">member</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member Terbaru */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>👥</span> Member Terbaru
            </h2>
            {members.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                <p className="text-3xl">👥</p>
                <p className="mt-2 text-sm">Belum ada member tercatat</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.slice(0, 10).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl bg-slate-900/50 p-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                      {(m.firstName || m.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {m.firstName || m.username || `User ${m.userId}`}
                      </p>
                      {m.username && <p className="text-xs text-slate-400">@{m.username}</p>}
                    </div>
                    <span className={`h-2 w-2 rounded-full ${m.isActive ? "bg-green-400" : "bg-slate-600"}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log Aktivitas Terbaru */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>📋</span> Log Aktivitas
            </h2>
            {logs.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                <p className="text-3xl">📋</p>
                <p className="mt-2 text-sm">Belum ada aktivitas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="rounded-xl bg-slate-900/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-300">
                        <span>{commandIcons[log.command] || "🔧"}</span>
                        /{log.command}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                    {log.result && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{log.result}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Second Row */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Command Stats */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>📊</span> Statistik Perintah
            </h2>
            {commandStats.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada perintah digunakan</p>
            ) : (
              <div className="space-y-3">
                {commandStats.slice(0, 8).map((stat) => {
                  const maxCount = Math.max(...commandStats.map((s) => s.count));
                  const pct = Math.round((stat.count / maxCount) * 100);
                  return (
                    <div key={stat.command}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-300">{commandIcons[stat.command] || "🔧"} /{stat.command}</span>
                        <span className="font-semibold text-white">{stat.count}x</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-700">
                        <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Aktif */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>🏆</span> Top Member Aktif
            </h2>
            {topActiveUsers.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada data</p>
            ) : (
              <div className="space-y-2">
                {topActiveUsers.map((u, i) => {
                  const info = memberMap[u.userId];
                  const name = info?.firstName || info?.username || `User ${u.userId}`;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={u.id} className="flex items-center justify-between rounded-xl bg-slate-900/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{medals[i] || `${i + 1}.`}</span>
                        <span className="text-sm text-white truncate max-w-[120px]">{name}</span>
                      </div>
                      <span className="text-xs font-semibold text-blue-300">{u.messageCount} pesan</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Peringatan Terbaru */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>⚠️</span> Peringatan Terbaru
            </h2>
            {warnings.length === 0 ? (
              <div className="py-4 text-center text-slate-500">
                <p className="text-2xl">✅</p>
                <p className="mt-1 text-sm">Tidak ada peringatan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {warnings.slice(0, 8).map((w) => (
                  <div key={w.id} className="rounded-xl bg-slate-900/50 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-orange-300">User {w.userId}</span>
                      <span className="text-xs text-slate-500">{new Date(w.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>
                    {w.reason && <p className="mt-0.5 truncate text-xs text-slate-400">{w.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Third Row */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Kata Terlarang */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>🚫</span> Kata Terlarang
            </h2>
            {banned.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada kata terlarang. Gunakan /addbanned di grup.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {banned.map((b) => (
                  <span key={b.id} className="rounded-full border border-red-800/50 bg-red-900/30 px-3 py-1 text-xs text-red-300">
                    {b.word}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Catatan Grup */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>📌</span> Catatan Grup
            </h2>
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada catatan. Gunakan /note [kunci] [isi] di grup.</p>
            ) : (
              <div className="space-y-2">
                {notes.slice(0, 6).map((n) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-xl bg-slate-900/50 p-3">
                    <span className="rounded bg-blue-900/50 px-2 py-0.5 text-xs font-mono font-semibold text-blue-300">{n.key}</span>
                    <p className="text-xs text-slate-400 line-clamp-1">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pengaturan Grup */}
        {groupSettingsList.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
              <span>⚙️</span> Pengaturan Grup
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupSettingsList.map((s) => (
                <div key={s.id} className="rounded-xl bg-slate-900/50 p-4">
                  <p className="mb-2 font-mono text-xs text-slate-400">Chat ID: {s.chatId}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Anti-Spam</span>
                      <span className={s.antiSpamEnabled ? "text-green-400" : "text-red-400"}>{s.antiSpamEnabled ? "✅ Aktif" : "❌ Nonaktif"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pesan Sambutan</span>
                      <span className={s.welcomeEnabled ? "text-green-400" : "text-red-400"}>{s.welcomeEnabled ? "✅ Aktif" : "❌ Nonaktif"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Maks Peringatan</span>
                      <span className="text-yellow-400">{s.maxWarnings}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commands Reference */}
        <div className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
            <span>📚</span> Referensi Semua Perintah
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { cmd: "/start", desc: "Mulai & tampilkan menu bantuan", icon: "▶️" },
              { cmd: "/help", desc: "Tampilkan semua perintah", icon: "❓" },
              { cmd: "/ping", desc: "Ukur latency bot", icon: "🏓" },
              { cmd: "/uptime", desc: "Uptime server & memory", icon: "⏱️" },
              { cmd: "/speedtest", desc: "Tes kecepatan internet server", icon: "🚀" },
              { cmd: "/tagall [pesan]", desc: "Tag semua member (admin)", icon: "👥" },
              { cmd: "/tagadmin", desc: "Tag semua admin grup", icon: "👑" },
              { cmd: "/warn [alasan]", desc: "Beri peringatan (reply pesan)", icon: "⚠️" },
              { cmd: "/warnings", desc: "Lihat peringatan user (reply)", icon: "📋" },
              { cmd: "/kick", desc: "Kick member (reply pesan)", icon: "🚫" },
              { cmd: "/mute [menit]", desc: "Mute member (reply pesan)", icon: "🔇" },
              { cmd: "/unmute", desc: "Unmute member (reply pesan)", icon: "🔊" },
              { cmd: "/promote", desc: "Jadikan admin (reply pesan)", icon: "⭐" },
              { cmd: "/demote", desc: "Cabut status admin (reply pesan)", icon: "👤" },
              { cmd: "/addbanned [kata]", desc: "Tambah kata terlarang", icon: "🚫" },
              { cmd: "/delbanned [kata]", desc: "Hapus kata terlarang", icon: "✂️" },
              { cmd: "/listbanned", desc: "Lihat daftar kata terlarang", icon: "📋" },
              { cmd: "/antispam on|off", desc: "Toggle filter kata terlarang", icon: "🛡️" },
              { cmd: "/note [kunci] [isi]", desc: "Simpan catatan grup", icon: "📌" },
              { cmd: "/getnote [kunci]", desc: "Ambil catatan grup", icon: "📖" },
              { cmd: "/notes", desc: "Lihat semua catatan", icon: "📚" },
              { cmd: "/delnote [kunci]", desc: "Hapus catatan grup", icon: "🗑️" },
              { cmd: "/stats", desc: "Statistik grup lengkap", icon: "📊" },
              { cmd: "/topactive", desc: "Top 10 member paling aktif", icon: "🏆" },
              { cmd: "/info", desc: "Info bot dan grup", icon: "ℹ️" },
              { cmd: "/sticker [teks]", desc: "Buat stiker SVG dari teks", icon: "🎨" },
              { cmd: "/qr [teks/URL]", desc: "Buat QR Code", icon: "🔲" },
              { cmd: "/calc [ekspresi]", desc: "Kalkulator matematika", icon: "🧮" },
              { cmd: "/currency [jml] [dari] [ke]", desc: "Konversi mata uang", icon: "💱" },
              { cmd: "/translate [lang] [teks]", desc: "Terjemahkan teks", icon: "🌐" },
              { cmd: "/weather [kota]", desc: "Info cuaca real-time", icon: "🌤️" },
              { cmd: "/poll [Q]|[A]|[B]", desc: "Buat polling interaktif", icon: "📊" },
              { cmd: "/setwelcome [pesan]", desc: "Atur pesan sambutan", icon: "👋" },
              { cmd: "/welcome on|off", desc: "Toggle pesan sambutan", icon: "🎉" },
              { cmd: "/setmaxwarn [1-10]", desc: "Atur maks peringatan", icon: "⚙️" },
              { cmd: "/gift @user", desc: "Kirim gift Telegram Stars", icon: "🎁" },
            ].map((c) => (
              <div key={c.cmd} className="flex items-start gap-2 rounded-xl bg-slate-900/50 p-3">
                <span className="text-sm">{c.icon}</span>
                <div>
                  <code className="text-xs font-mono font-semibold text-blue-300">{c.cmd}</code>
                  <p className="text-xs text-slate-400">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Setup */}
        <div className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
            <span>🔗</span> Setup Webhook
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm text-slate-300">Jalankan setup webhook untuk menghubungkan bot ke server ini:</p>
              <div className="rounded-xl bg-slate-900 p-4 font-mono text-sm text-slate-300">
                <p className="text-slate-500"># Via browser:</p>
                <p className="mt-1 text-green-400">GET /api/setup-webhook</p>
                <p className="text-slate-400">?secret=YOUR_SETUP_SECRET</p>
                <p className="mt-3 text-slate-500"># Via curl:</p>
                <p className="mt-1 text-yellow-400">curl https://your-app.vercel.app</p>
                <p className="text-yellow-400">/api/setup-webhook?secret=xxx</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-300">Endpoints bot:</p>
              <div className="space-y-2 rounded-xl bg-slate-900 p-4">
                {[
                  { method: "POST", path: "/api/bot", desc: "Webhook Telegram" },
                  { method: "GET", path: "/api/setup-webhook", desc: "Setup webhook" },
                  { method: "GET", path: "/api/health", desc: "Health check" },
                  { method: "GET", path: "/dashboard", desc: "Dashboard monitoring" },
                ].map((e) => (
                  <div key={e.path} className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-mono font-bold ${e.method === "POST" ? "bg-blue-900/50 text-blue-300" : "bg-green-900/50 text-green-300"}`}>
                      {e.method}
                    </span>
                    <code className="text-slate-300">{e.path}</code>
                    <span className="text-slate-500">— {e.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
