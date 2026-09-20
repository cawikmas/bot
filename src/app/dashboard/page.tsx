import { db } from "@/db";
import { groupMembers, botLogs } from "@/db/schema";
import { desc, count, eq, and } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let members: typeof groupMembers.$inferSelect[] = [];
  let logs: typeof botLogs.$inferSelect[] = [];
  let groupStats: Array<{ chatId: number; memberCount: number }> = [];

  try {
    members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.isActive, true))
      .orderBy(desc(groupMembers.updatedAt))
      .limit(50);

    logs = await db
      .select()
      .from(botLogs)
      .orderBy(desc(botLogs.createdAt))
      .limit(30);

    const rawGroupStats = await db
      .select({ chatId: groupMembers.chatId, memberCount: count() })
      .from(groupMembers)
      .where(eq(groupMembers.isActive, true))
      .groupBy(groupMembers.chatId);

    groupStats = rawGroupStats.map((g) => ({
      chatId: g.chatId,
      memberCount: g.memberCount,
    }));
  } catch {
    // DB not ready
  }

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

  const commandColors: Record<string, string> = {
    ping: "bg-green-900/50 text-green-400",
    speedtest: "bg-orange-900/50 text-orange-400",
    tagall: "bg-blue-900/50 text-blue-400",
    tagadmin: "bg-purple-900/50 text-purple-400",
    sticker: "bg-pink-900/50 text-pink-400",
    gift: "bg-yellow-900/50 text-yellow-400",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h1 className="font-bold text-lg">TeleBot Pro Dashboard</h1>
              <p className="text-gray-400 text-sm">Monitor & Manage Bot</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400">Bot Online</span>
            </div>
            <Link
              href="/"
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Member",
              value: members.length,
              icon: "👥",
              sub: "Aktif",
              color: "blue",
            },
            {
              label: "Total Grup",
              value: groupStats.length,
              icon: "💬",
              sub: "Terdaftar",
              color: "purple",
            },
            {
              label: "Total Command",
              value: logs.length,
              icon: "⚡",
              sub: "Dijalankan",
              color: "green",
            },
            {
              label: "Uptime",
              value: "100%",
              icon: "✅",
              sub: "Availability",
              color: "yellow",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            >
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-3xl font-black">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
              <div className="text-gray-600 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Groups */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>💬</span> Grup Terdaftar
            </h2>
            {groupStats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-500 text-sm">
                  Belum ada grup terdaftar
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Tambahkan bot ke grup dan ketik /start
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupStats.map((g) => (
                  <div
                    key={g.chatId}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-xl"
                  >
                    <div>
                      <div className="font-mono text-xs text-gray-400">
                        {g.chatId}
                      </div>
                      <div className="text-sm font-medium mt-0.5">
                        {g.memberCount} member
                      </div>
                    </div>
                    <div className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg text-xs">
                      Aktif
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Members */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>👥</span> Member Terbaru
            </h2>
            {members.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-gray-500 text-sm">
                  Belum ada member tercatat
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Member akan tercatat saat mengirim pesan di grup
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {members.slice(0, 20).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {(m.firstName || m.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.firstName || m.username || `User ${m.userId}`}
                      </div>
                      {m.username && (
                        <div className="text-gray-500 text-xs truncate">
                          @{m.username}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Logs */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>📋</span> Log Aktivitas
            </h2>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 text-sm">Belum ada aktivitas</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-gray-800/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>
                        {commandIcons[log.command] || "🔧"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-mono ${
                          commandColors[log.command] ||
                          "bg-gray-700 text-gray-300"
                        }`}
                      >
                        /{log.command}
                      </span>
                      <span className="text-gray-600 text-xs ml-auto">
                        {new Date(log.createdAt).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                    {log.result && (
                      <p className="text-gray-500 text-xs truncate pl-6">
                        {log.result}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Commands Reference */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📚</span> Referensi Perintah
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                cmd: "/start",
                desc: "Mulai & tampilkan menu bantuan",
                icon: "▶️",
              },
              {
                cmd: "/help",
                desc: "Tampilkan semua perintah",
                icon: "❓",
              },
              {
                cmd: "/ping",
                desc: "Ukur latency bot",
                icon: "🏓",
              },
              {
                cmd: "/speedtest",
                desc: "Tes kecepatan internet server",
                icon: "🚀",
              },
              {
                cmd: "/tagall",
                desc: "Tag semua member (admin only)",
                icon: "👥",
              },
              {
                cmd: "/tagadmin",
                desc: "Tag semua admin grup",
                icon: "👑",
              },
              {
                cmd: "/sticker [teks]",
                desc: "Buat stiker dari teks",
                icon: "🎨",
              },
              {
                cmd: "/gift @user",
                desc: "Kirim gift ke pengguna",
                icon: "🎁",
              },
              {
                cmd: "/info",
                desc: "Info bot dan grup",
                icon: "ℹ️",
              },
            ].map((c) => (
              <div
                key={c.cmd}
                className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl"
              >
                <span className="text-xl w-8 shrink-0">{c.icon}</span>
                <div>
                  <code className="text-blue-400 text-xs font-mono">
                    {c.cmd}
                  </code>
                  <p className="text-gray-400 text-xs mt-0.5">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Setup Card */}
        <div className="mt-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span>🔗</span> Setup Webhook Bot
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Gunakan endpoint berikut untuk menghubungkan bot Telegram dengan
            server ini:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-950 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-2">Webhook Endpoint Bot:</p>
              <code className="text-green-400 text-sm break-all">
                POST /api/bot
              </code>
            </div>
            <div className="bg-gray-950 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-2">Setup Webhook:</p>
              <code className="text-yellow-400 text-sm break-all">
                GET /api/setup-webhook?secret=SETUP_SECRET
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
