"use client";

import { useEffect, useState, useCallback } from "react";

interface Member {
  id: number;
  chatId: string;
  userId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  messageCount: number | null;
  xpPoints: number | null;
  level: number | null;
  coins: number | null;
  warnings: number | null;
  isBanned: boolean | null;
  lastSeenAt: string | null;
}

interface StatDay {
  date: string;
  totalMessages: number | null;
  totalCommands: number | null;
}

interface DashboardData {
  recentStats: StatDay[];
  totalUsers: number;
  totalGroups: number;
  topMembers: Member[];
  topCoins: Member[];
}

const COMMANDS = [
  // Moderasi
  { cmd: "/ban", desc: "Ban member", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/unban", desc: "Unban member", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/kick", desc: "Kick member", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/mute [waktu]", desc: "Mute member (1m/1h/1d)", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/unmute", desc: "Unmute member", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/warn", desc: "Beri peringatan", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/unwarn", desc: "Hapus peringatan terbaru", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/warns", desc: "Lihat daftar peringatan", cat: "🛡️ Moderasi", adminOnly: false },
  { cmd: "/purge", desc: "Hapus pesan massal", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/pin", desc: "Pin pesan", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/unpin", desc: "Unpin semua pesan", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/promote", desc: "Jadikan admin", cat: "🛡️ Moderasi", adminOnly: true },
  { cmd: "/demote", desc: "Turunkan admin", cat: "🛡️ Moderasi", adminOnly: true },
  // Grup
  { cmd: "/tagall", desc: "Tag semua member aktif", cat: "👥 Grup", adminOnly: true },
  { cmd: "/tagadmin", desc: "Tag semua admin", cat: "👥 Grup", adminOnly: false },
  { cmd: "/ping", desc: "Cek latency bot", cat: "👥 Grup", adminOnly: false },
  { cmd: "/speedtest", desc: "Tes kecepatan server", cat: "👥 Grup", adminOnly: false },
  { cmd: "/welcome", desc: "Lihat pesan welcome", cat: "👥 Grup", adminOnly: false },
  { cmd: "/setwelcome [pesan]", desc: "Atur pesan welcome", cat: "👥 Grup", adminOnly: true },
  { cmd: "/setgoodbye [pesan]", desc: "Atur pesan goodbye", cat: "👥 Grup", adminOnly: true },
  { cmd: "/rules", desc: "Tampilkan peraturan grup", cat: "👥 Grup", adminOnly: false },
  { cmd: "/antilink", desc: "Toggle anti-link", cat: "👥 Grup", adminOnly: true },
  { cmd: "/antispam", desc: "Toggle anti-spam", cat: "👥 Grup", adminOnly: true },
  { cmd: "/settings", desc: "Lihat pengaturan grup", cat: "👥 Grup", adminOnly: true },
  { cmd: "/poll Q | A | B", desc: "Buat polling", cat: "👥 Grup", adminOnly: false },
  { cmd: "/giveaway H|M|N", desc: "Buat giveaway", cat: "👥 Grup", adminOnly: true },
  { cmd: "/joingiveaway [ID]", desc: "Ikut giveaway", cat: "👥 Grup", adminOnly: false },
  { cmd: "/endgiveaway [ID]", desc: "Akhiri giveaway", cat: "👥 Grup", adminOnly: true },
  { cmd: "/sticker [teks]", desc: "Buat stiker SVG", cat: "👥 Grup", adminOnly: false },
  { cmd: "/broadcast [pesan]", desc: "Broadcast ke grup", cat: "👥 Grup", adminOnly: true },
  // Info
  { cmd: "/start", desc: "Mulai bot", cat: "ℹ️ Info", adminOnly: false },
  { cmd: "/help", desc: "Daftar semua perintah", cat: "ℹ️ Info", adminOnly: false },
  { cmd: "/info", desc: "Info bot & grup", cat: "ℹ️ Info", adminOnly: false },
  { cmd: "/id", desc: "Tampilkan ID", cat: "ℹ️ Info", adminOnly: false },
  { cmd: "/whois", desc: "Info detail member", cat: "ℹ️ Info", adminOnly: false },
  { cmd: "/profile", desc: "Profil kamu", cat: "ℹ️ Info", adminOnly: false },
  { cmd: "/rank", desc: "Rank XP kamu", cat: "ℹ️ Info", adminOnly: false },
  { cmd: "/leaderboard", desc: "Top 10 member aktif", cat: "ℹ️ Info", adminOnly: false },
  { cmd: "/stats", desc: "Statistik bot", cat: "ℹ️ Info", adminOnly: false },
  // Fun
  { cmd: "/dice", desc: "Lempar dadu 🎲", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/flip", desc: "Lempar koin 🪙", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/8ball [pertanyaan]", desc: "Magic 8-ball 🎱", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/rps [batu|kertas|gunting]", desc: "Suit", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/joke", desc: "Humor acak 😄", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/quote", desc: "Quote inspirasi", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/savequote", desc: "Simpan quote member", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/randomquote", desc: "Quote random tersimpan", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/trivia", desc: "Pertanyaan trivia", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/math", desc: "Soal matematika", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/choose A, B, C", desc: "Pilihan acak", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/reverse [teks]", desc: "Balik teks", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/mock [teks]", desc: "Mock teks", cat: "🎮 Fun", adminOnly: false },
  { cmd: "/aesthetic [teks]", desc: "Teks estetik", cat: "🎮 Fun", adminOnly: false },
  // Ekonomi
  { cmd: "/daily", desc: "Klaim hadiah harian 🎁", cat: "💰 Ekonomi", adminOnly: false },
  { cmd: "/balance", desc: "Cek saldo koin", cat: "💰 Ekonomi", adminOnly: false },
  { cmd: "/transfer [jml]", desc: "Transfer koin ke member", cat: "💰 Ekonomi", adminOnly: false },
  { cmd: "/give [jml]", desc: "Beri koin ke member", cat: "💰 Ekonomi", adminOnly: false },
  { cmd: "/richlist", desc: "Top 10 terkaya", cat: "💰 Ekonomi", adminOnly: false },
  { cmd: "/gamble [jml]", desc: "Judi koin 🎰", cat: "💰 Ekonomi", adminOnly: false },
  // Tools
  { cmd: "/calc [ekspresi]", desc: "Kalkulator", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/convert [val] [dari] [ke]", desc: "Konversi satuan", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/note [kunci] [isi]", desc: "Simpan catatan", cat: "🔧 Tools", adminOnly: true },
  { cmd: "/notes", desc: "Lihat semua catatan", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/getnote [kunci]", desc: "Ambil catatan", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/delnote [kunci]", desc: "Hapus catatan", cat: "🔧 Tools", adminOnly: true },
  { cmd: "#kunci", desc: "Tampilkan catatan otomatis", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/weather [kota]", desc: "Cuaca real-time", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/translate [lang] [teks]", desc: "Terjemah teks", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/qr [teks/url]", desc: "Buat QR code", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/tinyurl [url]", desc: "Persingkat URL", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/define [kata]", desc: "Definisi kata (EN)", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/afk [alasan]", desc: "Set status AFK", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/ascii [teks]", desc: "Teks ASCII", cat: "🔧 Tools", adminOnly: false },
  { cmd: "/feedback [pesan]", desc: "Kirim feedback", cat: "🔧 Tools", adminOnly: false },
];

const CATEGORIES = [...new Set(COMMANDS.map((c) => c.cat))];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "commands" | "members">("overview");
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (json.ok) setData(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd.split(" ")[0]);
    setCopied(cmd);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredCommands = COMMANDS.filter((c) => {
    const matchCat = selectedCat === "all" || c.cat === selectedCat;
    const matchSearch = !search || c.cmd.toLowerCase().includes(search.toLowerCase()) ||
      c.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalMessages = data?.recentStats.reduce((s, d) => s + (d.totalMessages ?? 0), 0) ?? 0;
  const totalCommands = data?.recentStats.reduce((s, d) => s + (d.totalCommands ?? 0), 0) ?? 0;
  const todayMessages = data?.recentStats[0]?.totalMessages ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50 bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">TeleBot Pro</h1>
              <p className="text-xs text-slate-400">Dashboard Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm text-green-400">Online</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 p-8">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">🤖 TeleBot Pro v2.0</h2>
            <p className="text-blue-200 mb-4">Bot Telegram lengkap dengan 65+ fitur canggih</p>
            <div className="flex flex-wrap gap-2">
              {["✅ Moderasi", "💰 Ekonomi", "🎮 Fun Games", "🔧 Tools", "📊 Statistik", "🎁 Giveaway"].map((tag) => (
                <span key={tag} className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">{tag}</span>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 text-9xl">🤖</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "commands", label: "⌨️ Commands" },
            { id: "members", label: "👥 Members" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/10 text-slate-300 hover:bg-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: "👥", label: "Total Users", value: (data?.totalUsers ?? 0).toLocaleString(), color: "from-blue-500 to-cyan-500" },
                { icon: "💬", label: "Pesan Hari Ini", value: todayMessages.toLocaleString(), color: "from-green-500 to-emerald-500" },
                { icon: "🏠", label: "Grup Aktif", value: (data?.totalGroups ?? 0).toLocaleString(), color: "from-purple-500 to-pink-500" },
                { icon: "⚡", label: "Total Commands", value: totalCommands.toLocaleString(), color: "from-orange-500 to-yellow-500" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-lg mb-3`}>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold">{loading ? "..." : stat.value}</p>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Activity Chart */}
            {data?.recentStats && data.recentStats.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <h3 className="font-semibold mb-4 text-slate-200">📈 Aktivitas 7 Hari Terakhir</h3>
                <div className="flex items-end gap-2 h-32">
                  {[...data.recentStats].reverse().map((stat, i) => {
                    const max = Math.max(...data.recentStats.map((s) => s.totalMessages ?? 0), 1);
                    const height = ((stat.totalMessages ?? 0) / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500 min-h-1"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${stat.totalMessages ?? 0} pesan`}
                        ></div>
                        <span className="text-xs text-slate-500 truncate w-full text-center">
                          {stat.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Members */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-4 text-slate-200">🏆 Top Member (XP)</h3>
                <div className="space-y-3">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                    ))
                  ) : data?.topMembers.slice(0, 5).map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <span className="text-lg">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {m.username ? `@${m.username}` : (m.firstName ?? "Unknown")}
                        </p>
                        <p className="text-xs text-slate-400">Level {m.level} • {(m.xpPoints ?? 0).toLocaleString()} XP</p>
                      </div>
                      <span className="text-blue-400 text-sm font-mono">{m.messageCount ?? 0} msg</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup Guide */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-4 text-slate-200">🚀 Setup Bot</h3>
                <ol className="space-y-3 text-sm">
                  {[
                    { step: "1", title: "Fork/Clone repo ini ke GitHub", desc: "Pastikan kode sudah ada di GitHub kamu" },
                    { step: "2", title: "Buat bot di @BotFather", desc: "Dapatkan TELEGRAM_BOT_TOKEN" },
                    { step: "3", title: "Deploy ke Vercel", desc: "Import repo dari GitHub, set env vars" },
                    { step: "4", title: "Setup webhook", desc: "GET /api/setup-webhook?secret=YOUR_SECRET" },
                    { step: "5", title: "Tambah bot ke grup", desc: "Jadikan bot sebagai admin grup" },
                    { step: "6", title: "Update via GitHub", desc: "Push kode baru → Vercel auto-deploy" },
                  ].map((item) => (
                    <li key={item.step} className="flex gap-3">
                      <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {item.step}
                      </span>
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-slate-400 text-xs">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Feature Count Banner */}
            <div className="mt-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">📋 Fitur Lengkap (65+ Perintah)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { icon: "🛡️", label: "Moderasi", count: 13 },
                  { icon: "👥", label: "Grup", count: 16 },
                  { icon: "ℹ️", label: "Info", count: 9 },
                  { icon: "🎮", label: "Fun", count: 12 },
                  { icon: "💰", label: "Ekonomi", count: 6 },
                  { icon: "🔧", label: "Tools", count: 12 },
                ].map((cat) => (
                  <div key={cat.label} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <p className="font-bold text-lg">{cat.count}+</p>
                    <p className="text-xs text-slate-400">{cat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── COMMANDS TAB ─────────────────────────────────────── */}
        {activeTab === "commands" && (
          <div>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="🔍 Cari perintah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all" className="bg-slate-800">Semua Kategori</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                ))}
              </select>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              Menampilkan {filteredCommands.length} dari {COMMANDS.length} perintah
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              {filteredCommands.map((cmd) => (
                <div
                  key={cmd.cmd}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded text-sm font-mono">
                          {cmd.cmd}
                        </code>
                        {cmd.adminOnly && (
                          <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
                            👑 Admin
                          </span>
                        )}
                        <span className="text-xs text-slate-500">{cmd.cat}</span>
                      </div>
                      <p className="text-slate-300 text-sm mt-1">{cmd.desc}</p>
                    </div>
                    <button
                      onClick={() => copyCmd(cmd.cmd)}
                      className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-white bg-white/10 rounded-lg p-1.5 flex-shrink-0"
                      title="Copy"
                    >
                      {copied === cmd.cmd ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MEMBERS TAB ──────────────────────────────────────── */}
        {activeTab === "members" && (
          <div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold">👥 Daftar Member</h3>
                <p className="text-slate-400 text-sm">Data member berdasarkan XP tertinggi</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-left px-4 py-3">Member</th>
                      <th className="text-left px-4 py-3">Level</th>
                      <th className="text-left px-4 py-3">XP</th>
                      <th className="text-left px-4 py-3">Koin</th>
                      <th className="text-left px-4 py-3">Pesan</th>
                      <th className="text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="px-4 py-3" colSpan={6}>
                            <div className="h-8 bg-white/5 rounded animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : data?.topMembers.map((m) => (
                      <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{m.firstName ?? "Unknown"} {m.lastName ?? ""}</p>
                            <p className="text-slate-500 text-xs">
                              {m.username ? `@${m.username}` : `ID: ${m.userId}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-xs">
                            Lvl {m.level ?? 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-blue-300">
                          {(m.xpPoints ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-yellow-300">
                          🪙 {(m.coins ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {(m.messageCount ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {m.isBanned ? (
                            <span className="text-red-400 text-xs">🚫 Banned</span>
                          ) : m.warnings && m.warnings > 0 ? (
                            <span className="text-yellow-400 text-xs">⚠️ {m.warnings} warn</span>
                          ) : (
                            <span className="text-green-400 text-xs">✅ Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-600 text-sm">
          <p>🤖 TeleBot Pro v2.0 • Built with Next.js + grammY + PostgreSQL</p>
          <p className="mt-1">
            <a href="https://github.com/cawikmas/bot" className="text-blue-600 hover:text-blue-400 transition">
              GitHub Repository
            </a>
            {" "} • Update via GitHub Push → Auto Deploy di Vercel
          </p>
        </footer>
      </div>
    </div>
  );
}
