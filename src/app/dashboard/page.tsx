"use client";

import { useEffect, useState } from "react";

interface BotStat {
  date: string;
  totalMessages: number;
  totalCommands: number;
}

interface DashboardData {
  recentStats: BotStat[];
  totalUsers: number;
  totalGroups: number;
  botVersion: string;
  uptime: number;
}

const FEATURES = [
  // Moderation
  { cmd: "/ban", desc: "Ban member dari grup", cat: "🛡️ Moderasi" },
  { cmd: "/unban", desc: "Unban member", cat: "🛡️ Moderasi" },
  { cmd: "/kick", desc: "Kick member dari grup", cat: "🛡️ Moderasi" },
  { cmd: "/mute [durasi]", desc: "Mute member (mis: 1h, 30m)", cat: "🛡️ Moderasi" },
  { cmd: "/unmute", desc: "Unmute member", cat: "🛡️ Moderasi" },
  { cmd: "/warn", desc: "Beri peringatan ke member", cat: "🛡️ Moderasi" },
  { cmd: "/warns", desc: "Lihat daftar peringatan", cat: "🛡️ Moderasi" },
  { cmd: "/unwarn", desc: "Hapus 1 peringatan", cat: "🛡️ Moderasi" },
  { cmd: "/purge", desc: "Hapus pesan massal", cat: "🛡️ Moderasi" },
  { cmd: "/pin", desc: "Pin pesan", cat: "🛡️ Moderasi" },
  { cmd: "/unpin", desc: "Unpin semua pesan", cat: "🛡️ Moderasi" },
  { cmd: "/promote", desc: "Jadikan member sebagai admin", cat: "🛡️ Moderasi" },
  { cmd: "/demote", desc: "Turunkan admin", cat: "🛡️ Moderasi" },
  { cmd: "/slowmode", desc: "Atur slow mode grup", cat: "🛡️ Moderasi" },
  { cmd: "/silence", desc: "Silence member (hapus pesan otomatis)", cat: "🛡️ Moderasi" },
  { cmd: "/unsilence", desc: "Buka silence member", cat: "🛡️ Moderasi" },
  { cmd: "/settitle", desc: "Atur custom title admin", cat: "🛡️ Moderasi" },
  // Group
  { cmd: "/tagall", desc: "Tag semua member aktif", cat: "👥 Grup" },
  { cmd: "/tagadmin", desc: "Tag semua admin grup", cat: "👥 Grup" },
  { cmd: "/setwelcome", desc: "Atur pesan selamat datang", cat: "👥 Grup" },
  { cmd: "/setgoodbye", desc: "Atur pesan perpisahan", cat: "👥 Grup" },
  { cmd: "/setrules", desc: "Atur peraturan grup", cat: "👥 Grup" },
  { cmd: "/rules", desc: "Tampilkan peraturan grup", cat: "👥 Grup" },
  { cmd: "/settings", desc: "Lihat semua pengaturan grup", cat: "👥 Grup" },
  { cmd: "/antilink", desc: "Toggle anti-link otomatis", cat: "👥 Grup" },
  { cmd: "/antispam", desc: "Toggle anti-spam", cat: "👥 Grup" },
  { cmd: "/antiflood", desc: "Toggle anti-flood", cat: "👥 Grup" },
  { cmd: "/setlang", desc: "Ubah bahasa bot", cat: "👥 Grup" },
  { cmd: "/addcmd", desc: "Tambah custom command", cat: "👥 Grup" },
  { cmd: "/delcmd", desc: "Hapus custom command", cat: "👥 Grup" },
  { cmd: "/listcmds", desc: "Lihat semua custom command", cat: "👥 Grup" },
  { cmd: "/addfilter", desc: "Tambah filter auto-reply", cat: "👥 Grup" },
  { cmd: "/delfilter", desc: "Hapus filter", cat: "👥 Grup" },
  { cmd: "/listfilters", desc: "Lihat semua filter", cat: "👥 Grup" },
  { cmd: "/giveaway", desc: "Buat giveaway hadiah", cat: "👥 Grup" },
  { cmd: "/joingiveaway", desc: "Ikut giveaway", cat: "👥 Grup" },
  { cmd: "/endgiveaway", desc: "Akhiri & undi pemenang", cat: "👥 Grup" },
  { cmd: "/raffle", desc: "Undi pemenang raffle", cat: "👥 Grup" },
  { cmd: "/joinraffle", desc: "Ikut raffle", cat: "👥 Grup" },
  { cmd: "/poll", desc: "Buat polling Telegram", cat: "👥 Grup" },
  { cmd: "/sticker", desc: "Buat stiker SVG dari teks", cat: "👥 Grup" },
  { cmd: "/broadcast", desc: "Broadcast pesan ke grup", cat: "👥 Grup" },
  // Info
  { cmd: "/start", desc: "Mulai bot", cat: "ℹ️ Info" },
  { cmd: "/help", desc: "Bantuan & daftar perintah (4 halaman)", cat: "ℹ️ Info" },
  { cmd: "/info", desc: "Info bot dan grup", cat: "ℹ️ Info" },
  { cmd: "/id", desc: "Lihat ID chat/user", cat: "ℹ️ Info" },
  { cmd: "/whois", desc: "Info lengkap member", cat: "ℹ️ Info" },
  { cmd: "/profile", desc: "Lihat profil sendiri", cat: "ℹ️ Info" },
  { cmd: "/rank", desc: "Lihat peringkat XP", cat: "ℹ️ Info" },
  { cmd: "/leaderboard", desc: "Top 10 member aktif", cat: "ℹ️ Info" },
  { cmd: "/stats", desc: "Statistik penggunaan bot", cat: "ℹ️ Info" },
  { cmd: "/setbirthday", desc: "Daftarkan ulang tahun", cat: "ℹ️ Info" },
  { cmd: "/birthday", desc: "Cek ulang tahun hari ini", cat: "ℹ️ Info" },
  { cmd: "/zodiac", desc: "Cek zodiak berdasar tanggal lahir", cat: "ℹ️ Info" },
  // Economy
  { cmd: "/daily", desc: "Klaim koin harian + streak bonus", cat: "💰 Ekonomi" },
  { cmd: "/balance", desc: "Cek saldo koin & bank", cat: "💰 Ekonomi" },
  { cmd: "/transfer", desc: "Transfer koin ke member", cat: "💰 Ekonomi" },
  { cmd: "/give", desc: "Beri koin ke member", cat: "💰 Ekonomi" },
  { cmd: "/richlist", desc: "Top 10 koin terkaya", cat: "💰 Ekonomi" },
  { cmd: "/gamble", desc: "Judi koin dengan dadu", cat: "💰 Ekonomi" },
  { cmd: "/work", desc: "Kerja untuk dapat koin", cat: "💰 Ekonomi" },
  { cmd: "/deposit", desc: "Simpan koin ke bank", cat: "💰 Ekonomi" },
  { cmd: "/withdraw", desc: "Ambil koin dari bank", cat: "💰 Ekonomi" },
  { cmd: "/invest", desc: "Investasikan koin (10-50% return)", cat: "💰 Ekonomi" },
  { cmd: "/claiminvest", desc: "Claim hasil investasi", cat: "💰 Ekonomi" },
  { cmd: "/rep", desc: "Beri reputasi ke member", cat: "💰 Ekonomi" },
  { cmd: "/topreputation", desc: "Top reputasi grup", cat: "💰 Ekonomi" },
  // Fun
  { cmd: "/dice", desc: "Lempar dadu", cat: "🎮 Fun" },
  { cmd: "/flip", desc: "Lempar koin (heads/tails)", cat: "🎮 Fun" },
  { cmd: "/8ball", desc: "Magic 8-ball jawab pertanyaan", cat: "🎮 Fun" },
  { cmd: "/rps", desc: "Suit (batu kertas gunting)", cat: "🎮 Fun" },
  { cmd: "/slots", desc: "Mesin slot kasino", cat: "🎮 Fun" },
  { cmd: "/gamestats", desc: "Statistik game member", cat: "🎮 Fun" },
  { cmd: "/marry", desc: "Menikah dengan member", cat: "🎮 Fun" },
  { cmd: "/divorce", desc: "Cerai dari pasangan", cat: "🎮 Fun" },
  { cmd: "/partner", desc: "Lihat pasangan saat ini", cat: "🎮 Fun" },
  { cmd: "/wordchain", desc: "Mulai permainan word chain", cat: "🎮 Fun" },
  { cmd: "/stopwordchain", desc: "Hentikan word chain", cat: "🎮 Fun" },
  { cmd: "/fortune", desc: "Ramalan nasib hari ini", cat: "🎮 Fun" },
  { cmd: "/tebak", desc: "Tebak angka (1-100)", cat: "🎮 Fun" },
  { cmd: "/joke", desc: "Humor acak", cat: "🎮 Fun" },
  { cmd: "/quote", desc: "Quote inspirasi", cat: "🎮 Fun" },
  { cmd: "/savequote", desc: "Simpan quote member", cat: "🎮 Fun" },
  { cmd: "/randomquote", desc: "Quote tersimpan acak", cat: "🎮 Fun" },
  { cmd: "/trivia", desc: "Pertanyaan trivia", cat: "🎮 Fun" },
  { cmd: "/math", desc: "Soal matematika acak", cat: "🎮 Fun" },
  { cmd: "/choose", desc: "Pilih acak dari daftar", cat: "🎮 Fun" },
  { cmd: "/reverse", desc: "Balik teks", cat: "🎮 Fun" },
  { cmd: "/mock", desc: "Teks mocking SpongeBob", cat: "🎮 Fun" },
  { cmd: "/aesthetic", desc: "Teks estetik spasi", cat: "🎮 Fun" },
  { cmd: "/encode", desc: "Encode teks ke Base64", cat: "🎮 Fun" },
  { cmd: "/decode", desc: "Decode Base64 ke teks", cat: "🎮 Fun" },
  // Tools
  { cmd: "/calc", desc: "Kalkulator ekspresi matematika", cat: "🔧 Tools" },
  { cmd: "/convert", desc: "Konversi satuan (panjang, berat, suhu)", cat: "🔧 Tools" },
  { cmd: "/tinyurl", desc: "Persingkat URL", cat: "🔧 Tools" },
  { cmd: "/weather", desc: "Cuaca kota manapun di dunia", cat: "🔧 Tools" },
  { cmd: "/translate", desc: "Terjemahkan teks ke bahasa lain", cat: "🔧 Tools" },
  { cmd: "/qr", desc: "Buat QR code dari teks/URL", cat: "🔧 Tools" },
  { cmd: "/define", desc: "Definisi kata bahasa Inggris", cat: "🔧 Tools" },
  { cmd: "/ascii", desc: "Teks ASCII spasi lebar", cat: "🔧 Tools" },
  { cmd: "/note", desc: "Simpan catatan dengan kata kunci", cat: "🔧 Tools" },
  { cmd: "/notes", desc: "Lihat semua catatan", cat: "🔧 Tools" },
  { cmd: "/getnote", desc: "Ambil catatan by kata kunci", cat: "🔧 Tools" },
  { cmd: "/delnote", desc: "Hapus catatan", cat: "🔧 Tools" },
  { cmd: "/afk", desc: "Set status AFK", cat: "🔧 Tools" },
  { cmd: "/ping", desc: "Tes latency bot", cat: "🔧 Tools" },
  { cmd: "/speedtest", desc: "Tes kecepatan server", cat: "🔧 Tools" },
  { cmd: "/timestamp", desc: "Lihat timestamp server", cat: "🔧 Tools" },
  { cmd: "/color", desc: "Info warna dari HEX atau acak", cat: "🔧 Tools" },
  { cmd: "/randomcolor", desc: "Warna acak", cat: "🔧 Tools" },
  { cmd: "/password", desc: "Generate password aman", cat: "🔧 Tools" },
  { cmd: "/ipsum", desc: "Generate Lorem Ipsum", cat: "🔧 Tools" },
];

const CATEGORIES = Array.from(new Set(FEATURES.map(f => f.cat)));

const CAT_COLORS: Record<string, string> = {
  "🛡️ Moderasi": "bg-red-500/20 border-red-500/30 text-red-300",
  "👥 Grup": "bg-blue-500/20 border-blue-500/30 text-blue-300",
  "ℹ️ Info": "bg-purple-500/20 border-purple-500/30 text-purple-300",
  "💰 Ekonomi": "bg-yellow-500/20 border-yellow-500/30 text-yellow-300",
  "🎮 Fun": "bg-green-500/20 border-green-500/30 text-green-300",
  "🔧 Tools": "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [activecat, setActivecat] = useState("Semua");

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredFeatures = FEATURES.filter(f => {
    const matchSearch = f.cmd.toLowerCase().includes(search.toLowerCase()) ||
      f.desc.toLowerCase().includes(search.toLowerCase());
    const matchCat = activecat === "Semua" || f.cat === activecat;
    return matchSearch && matchCat;
  });

  const uptime = data ? Math.floor(data.uptime) : 0;
  const uptimeStr = `${Math.floor(uptime / 3600)}j ${Math.floor((uptime % 3600) / 60)}m`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🤖</div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                TeleBot Pro
              </h1>
              <p className="text-xs text-gray-400">Dashboard Admin v3.0.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm text-green-400">Online</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-800">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "features", label: "⚡ Fitur" },
            { id: "setup", label: "🔧 Setup" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Fitur", value: FEATURES.length + "+", icon: "⚡", color: "text-blue-400" },
                { label: "Total User", value: loading ? "..." : (data?.totalUsers ?? 0).toLocaleString(), icon: "👤", color: "text-purple-400" },
                { label: "Grup Aktif", value: loading ? "..." : (data?.totalGroups ?? 0).toString(), icon: "👥", color: "text-green-400" },
                { label: "Uptime", value: loading ? "..." : uptimeStr, icon: "⏱️", color: "text-yellow-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Stats Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">📈 Statistik 7 Hari Terakhir</h2>
              {loading ? (
                <div className="text-center text-gray-500 py-8">Loading...</div>
              ) : !data?.recentStats?.length ? (
                <div className="text-center text-gray-500 py-8">Belum ada data statistik</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-2 text-gray-400">Tanggal</th>
                        <th className="text-right py-2 text-gray-400">Pesan</th>
                        <th className="text-right py-2 text-gray-400">Perintah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentStats.map((s) => (
                        <tr key={s.date} className="border-b border-gray-800/50">
                          <td className="py-2 text-gray-300">{s.date}</td>
                          <td className="py-2 text-right text-blue-400">{(s.totalMessages ?? 0).toLocaleString()}</td>
                          <td className="py-2 text-right text-purple-400">{(s.totalCommands ?? 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Category Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CATEGORIES.map(cat => {
                const catFeatures = FEATURES.filter(f => f.cat === cat);
                const colorClass = CAT_COLORS[cat] || "bg-gray-700/20 border-gray-700 text-gray-300";
                return (
                  <div key={cat} className={`border rounded-xl p-4 ${colorClass}`}>
                    <div className="text-lg font-semibold mb-1">{cat}</div>
                    <div className="text-3xl font-bold">{catFeatures.length}</div>
                    <div className="text-xs opacity-70 mt-1">perintah tersedia</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FEATURES TAB */}
        {activeTab === "features" && (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="🔍 Cari perintah atau deskripsi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActivecat("Semua")}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    activecat === "Semua"
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Semua ({FEATURES.length})
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActivecat(cat)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      activecat === cat
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    {cat.split(" ").slice(0, 2).join(" ")} ({FEATURES.filter(f => f.cat === cat).length})
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-500 mb-4">
              Menampilkan {filteredFeatures.length} dari {FEATURES.length} fitur
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFeatures.map((f, i) => {
                const colorClass = CAT_COLORS[f.cat] || "bg-gray-700/20 border-gray-700 text-gray-300";
                return (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <code className="text-blue-400 font-mono text-sm font-medium">{f.cmd}</code>
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${colorClass}`}>
                        {f.cat.split(" ")[0]}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SETUP TAB */}
        {activeTab === "setup" && (
          <div className="max-w-3xl">
            <div className="space-y-6">
              {/* Quick Setup */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">🚀 Quick Setup</h2>
                <div className="space-y-4">
                  {[
                    {
                      step: "1",
                      title: "Buat Bot di BotFather",
                      desc: "Chat ke @BotFather → /newbot → ikuti instruksi → salin token",
                      code: null,
                    },
                    {
                      step: "2",
                      title: "Set Environment Variables",
                      desc: "Tambahkan di .env atau platform deployment:",
                      code: "TELEGRAM_BOT_TOKEN=your_token_here\nSETUP_SECRET=random_secret_string\nDATABASE_URL=postgresql://...\nBOT_USERNAME=your_bot_username",
                    },
                    {
                      step: "3",
                      title: "Push ke GitHub & Deploy ke Vercel",
                      desc: "Fork → Push ke GitHub → Import di Vercel → Tambah env vars → Deploy",
                      code: null,
                    },
                    {
                      step: "4",
                      title: "Setup Database",
                      desc: "Jalankan migrasi database:",
                      code: "npx drizzle-kit push",
                    },
                    {
                      step: "5",
                      title: "Setup Webhook",
                      desc: "Setelah deploy, panggil endpoint ini:",
                      code: "curl https://your-app.vercel.app/api/setup-webhook?secret=your_secret",
                    },
                    {
                      step: "6",
                      title: "Tambahkan Bot ke Grup",
                      desc: "Bot → Settings → Add to Group → Pilih grup → Berikan permission Admin (Delete messages, Restrict members, Invite users)",
                      code: null,
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">{item.title}</h3>
                        <p className="text-gray-400 text-sm mb-2">{item.desc}</p>
                        {item.code && (
                          <pre className="bg-gray-800 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto">
                            {item.code}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GitHub Actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">⚙️ GitHub Actions Auto Deploy</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Tambahkan secrets ini di GitHub repo → Settings → Secrets → Actions:
                </p>
                <div className="space-y-2">
                  {[
                    { key: "VERCEL_TOKEN", desc: "Token dari Vercel Settings → Tokens" },
                    { key: "VERCEL_ORG_ID", desc: "Organization ID dari vercel.json" },
                    { key: "VERCEL_PROJECT_ID", desc: "Project ID dari vercel.json" },
                    { key: "TELEGRAM_BOT_TOKEN", desc: "Token bot dari BotFather" },
                    { key: "DATABASE_URL", desc: "Connection string PostgreSQL" },
                    { key: "SETUP_SECRET", desc: "Secret untuk setup webhook" },
                  ].map(s => (
                    <div key={s.key} className="flex gap-3 items-start">
                      <code className="bg-gray-800 px-2 py-1 rounded text-xs text-yellow-400 font-mono shrink-0">{s.key}</code>
                      <span className="text-gray-400 text-xs pt-1">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Guide */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">📝 Cara Update Fitur via GitHub</h2>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>✅ <strong className="text-white">Semudah edit file di GitHub!</strong></p>
                  <p>Untuk menambah atau mengubah fitur:</p>
                  <ol className="space-y-2 list-decimal list-inside ml-2">
                    <li>Buka file di <code className="bg-gray-800 px-1 rounded text-yellow-400">src/lib/bot/features/</code></li>
                    <li>Edit perintah yang ada atau tambah yang baru</li>
                    <li>Commit dan push ke GitHub</li>
                    <li>Vercel akan otomatis redeploy (jika sudah setup)</li>
                    <li>Selesai! Bot langsung update</li>
                  </ol>
                  <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-300 font-medium mb-2">📁 Struktur File Fitur:</p>
                    <pre className="text-xs text-gray-400 font-mono">
{`src/lib/bot/features/
├── moderation.ts  → /ban, /mute, /warn, dll
├── group.ts       → /tagall, /giveaway, dll
├── info.ts        → /help, /profile, dll
├── economy.ts     → /daily, /gamble, dll
├── fun.ts         → /dice, /slots, dll
└── tools.ts       → /weather, /calc, dll`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
