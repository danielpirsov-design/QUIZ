import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, BrainCircuit, Gamepad2, Trophy, Users, Star, Play, ArrowRight, Zap, Languages, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion } from "framer-motion";

const STAT_CARDS = [
  {
    key: "totalQuizzes",
    title: "Quizzes",
    icon: <Star className="w-5 h-5" />,
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
    glow: "rgba(124,58,237,0.4)",
    border: "rgba(168,85,247,0.3)",
  },
  {
    key: "totalGamesHosted",
    title: "Games Hosted",
    icon: <Gamepad2 className="w-5 h-5" />,
    gradient: "linear-gradient(135deg, #db2777 0%, #ec4899 100%)",
    glow: "rgba(219,39,119,0.4)",
    border: "rgba(236,72,153,0.3)",
  },
  {
    key: "totalParticipants",
    title: "Players Reached",
    icon: <Users className="w-5 h-5" />,
    gradient: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
    glow: "rgba(8,145,178,0.4)",
    border: "rgba(6,182,212,0.3)",
  },
  {
    key: "totalPointsEarned",
    title: "Points Earned",
    icon: <Trophy className="w-5 h-5" />,
    gradient: "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
    glow: "rgba(217,119,6,0.4)",
    border: "rgba(251,191,36,0.3)",
  },
];

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <DashboardContent />
      </AppLayout>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-1">
            Hey, {user?.displayName?.split(" ")[0]}! 👋
          </h1>
          <p className="font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            You've earned{" "}
            <span className="font-black" style={{ color: "#fbbf24" }}>{user?.totalPoints?.toLocaleString() || 0}</span>
            {" "}points{" "}
            {(user as any)?.coins > 0 && (
              <>• <span className="text-yellow-300 font-black">🪙 {(user as any).coins.toLocaleString()} coins</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/ai-generate">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all hover:scale-105"
              style={{ background: "rgba(236,72,153,0.1)", borderColor: "rgba(236,72,153,0.3)", color: "#ec4899" }}>
              <BrainCircuit className="w-4 h-4" /> AI Generate
            </button>
          </Link>
          <Link href="/my-quizzes">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-black transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)", boxShadow: "0 0 20px rgba(255,204,2,0.3)" }}>
              <Plus className="w-4 h-4" /> New Quiz
            </button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STAT_CARDS.map((card, i) => {
          const value = (stats as any)?.[card.key] ?? 0;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative rounded-3xl p-5 overflow-hidden border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: card.border }}
            >
              {/* Gradient orb */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-30 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${card.glow.replace("0.4", "0.7")} 0%, transparent 70%)` }} />

              {isLoading ? (
                <Skeleton className="h-16 w-full rounded-2xl" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4"
                    style={{ background: card.gradient, boxShadow: `0 4px 16px ${card.glow}` }}>
                    {card.icon}
                  </div>
                  <div className="text-3xl font-display font-black text-white mb-0.5">{value.toLocaleString()}</div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{card.title}</div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { href: "/join", icon: <Zap className="w-5 h-5" />, label: "Join a Game", desc: "Enter a PIN", bg: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)", tc: "#111" },
          { href: "/ai-generate", icon: <BrainCircuit className="w-5 h-5" />, label: "AI Quiz", desc: "Generate in seconds", bg: "linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(168,85,247,0.1) 100%)", tc: "#ec4899", border: "rgba(236,72,153,0.25)" },
          { href: "/language", icon: <Languages className="w-5 h-5" />, label: "Languages", desc: "Flashcards & vocab games", bg: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.1) 100%)", tc: "#22c55e", border: "rgba(34,197,94,0.25)" },
          ...(user?.role === "teacher" ? [
            { href: "/worksheet", icon: <FileText className="w-5 h-5" />, label: "Worksheets", desc: "Create printable PDFs", bg: "linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(8,145,178,0.1) 100%)", tc: "#06b6d4", border: "rgba(6,182,212,0.25)" },
          ] : [
            { href: "/discover", icon: <Star className="w-5 h-5" />, label: "Discover", desc: "Browse public quizzes", bg: "linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(59,130,246,0.1) 100%)", tc: "#06b6d4", border: "rgba(6,182,212,0.25)" },
          ]),
        ].map((q, i) => (
          <Link key={i} href={q.href}>
            <div className="flex items-center gap-4 p-5 rounded-2xl border cursor-pointer hover:-translate-y-0.5 hover:brightness-110 transition-all"
              style={{ background: q.bg, borderColor: q.border || "transparent" }}>
              <div className="shrink-0" style={{ color: q.tc }}>{q.icon}</div>
              <div>
                <div className="font-black text-sm" style={{ color: q.tc }}>{q.label}</div>
                <div className="text-xs font-medium" style={{ color: q.tc === "#111" ? "#333" : "rgba(255,255,255,0.4)" }}>{q.desc}</div>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto shrink-0" style={{ color: q.tc }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent quizzes & games */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your quizzes */}
        <div className="rounded-3xl border p-6 md:p-7"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-black text-white">Your Quizzes</h2>
            <Link href="/my-quizzes" className="text-sm font-bold flex items-center gap-1 hover:text-white transition-colors" style={{ color: "#a855f7" }}>
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />) :
            stats?.recentQuizzes && stats.recentQuizzes.length > 0 ? (
              stats.recentQuizzes.map((quiz, idx) => (
                <Link key={quiz.id} href={`/quizzes/${quiz.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-2xl border cursor-pointer hover:scale-[1.01] transition-all group"
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                      style={{ background: ["#7c3aed","#db2777","#0891b2","#d97706","#059669"][idx % 5] }}>
                      {quiz.questionCount}Q
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{quiz.title}</div>
                      <div className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {format(new Date(quiz.updatedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#a855f7" }} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-10" style={{ color: "rgba(255,255,255,0.25)" }}>
                <p className="text-sm font-medium mb-3">No quizzes yet</p>
                <Link href="/my-quizzes">
                  <button className="text-sm font-bold px-4 py-2 rounded-xl" style={{ color: "#a855f7", background: "rgba(168,85,247,0.1)" }}>
                    Create your first quiz
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent games */}
        <div className="rounded-3xl border p-6 md:p-7"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-black text-white">Recent Games</h2>
          </div>

          <div className="space-y-3">
            {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />) :
            stats?.recentGames && stats.recentGames.length > 0 ? (
              stats.recentGames.map(game => (
                <Link key={game.id} href={game.status === "active" ? `/host/${game.id}` : `/results/${game.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-2xl border cursor-pointer hover:scale-[1.01] transition-all"
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${game.status === "active" ? "animate-pulse" : ""}`}
                      style={{ background: game.status === "active" ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)", color: game.status === "active" ? "#4ade80" : "rgba(255,255,255,0.35)" }}>
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{game.quizTitle}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <span className="capitalize px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.07)" }}>{game.gameMode}</span>
                        <span>{game.participantCount} players</span>
                      </div>
                    </div>
                    <button className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl"
                      style={game.status === "active"
                        ? { background: "rgba(74,222,128,0.2)", color: "#4ade80" }
                        : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                      {game.status === "active" ? "Live" : "Results"}
                    </button>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-10" style={{ color: "rgba(255,255,255,0.25)" }}>
                <p className="text-sm font-medium mb-3">No games yet</p>
                <Link href="/discover">
                  <button className="text-sm font-bold px-4 py-2 rounded-xl" style={{ color: "#06b6d4", background: "rgba(6,182,212,0.1)" }}>
                    Find a game to play
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
