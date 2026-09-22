import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="text-7xl mb-6">🤖</div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          TeleBot Pro
        </h1>
        <p className="text-gray-400 text-lg mb-2">
          Bot Telegram Multi-Fitur dengan 100+ Perintah
        </p>
        <p className="text-gray-500 text-sm mb-10">
          Powered by grammY + Next.js + PostgreSQL + Drizzle ORM
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10 text-sm">
          {[
            "🛡️ Moderasi Lengkap",
            "👥 Manajemen Grup",
            "💰 Sistem Ekonomi",
            "🎮 Mini Games",
            "🔧 Tools Serba Bisa",
            "ℹ️ Info & Statistik",
            "🎁 Giveaway & Raffle",
            "🎂 Birthday System",
            "📈 XP & Leveling",
            "⭐ Reputation System",
            "🏦 Bank & Investasi",
            "💍 Marriage System",
          ].map((f, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-gray-300">
              {f}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            📊 Buka Dashboard
          </Link>
          <a
            href="https://github.com/cawikmas/bot"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-xl transition-colors border border-gray-700"
          >
            ⭐ GitHub Repository
          </a>
        </div>

        <div className="mt-10 text-xs text-gray-600">
          <p>Webhook: <code className="text-gray-500">/api/telegram</code></p>
          <p>Setup: <code className="text-gray-500">/api/setup-webhook?secret=YOUR_SECRET</code></p>
          <p>Health: <code className="text-gray-500">/api/health</code></p>
        </div>
      </div>
    </div>
  );
}
