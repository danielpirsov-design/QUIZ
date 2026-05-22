import { AppLayout } from "@/components/layout/AppLayout";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Trophy, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const MEDALS = [
  { bg: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)", border: "rgba(251,191,36,0.4)", glow: "rgba(245,158,11,0.3)", label: "🥇" },
  { bg: "linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)", border: "rgba(203,213,225,0.3)", glow: "rgba(148,163,184,0.2)", label: "🥈" },
  { bg: "linear-gradient(135deg, #b45309 0%, #d97706 100%)", border: "rgba(217,119,6,0.3)",  glow: "rgba(180,83,9,0.2)",   label: "🥉" },
];

export default function LeaderboardPage() {
  const { data: leaders, isLoading } = useGetLeaderboard({ limit: 50 });

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5 text-sm font-bold"
            style={{ background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.25)", color: "#fbbf24" }}>
            <Trophy className="w-4 h-4" /> Global Rankings
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black text-white mb-4">
            Leader<span className="gradient-text-gold">board</span>
          </h1>
          <p className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            Top players ranked by total points earned across all games.
          </p>
        </div>

        {/* Top 3 podium */}
        {!isLoading && leaders && leaders.length >= 3 && (
          <div className="flex items-end justify-center gap-3 mb-8">
            {[1, 0, 2].map((rank) => {
              const user = leaders[rank];
              const m = MEDALS[rank];
              const heights = ["h-24", "h-32", "h-20"];
              return (
                <motion.div key={rank}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rank * 0.1 }}
                  className="flex-1 max-w-[180px] flex flex-col items-center gap-2">
                  <div className="text-3xl">{m.label}</div>
                  <img src={user.avatarUrl || `${import.meta.env.BASE_URL}images/avatar-placeholder.png`} alt={user.displayName}
                    className="w-12 h-12 rounded-2xl object-cover border-2"
                    style={{ borderColor: m.border.replace("0.4", "0.8") }} />
                  <div className="text-xs font-black text-white text-center truncate w-full text-center">{user.displayName?.split(" ")[0]}</div>
                  <div className={`w-full ${heights[rank]} rounded-2xl flex flex-col items-center justify-center border`}
                    style={{ background: m.bg, borderColor: m.border, boxShadow: `0 0 24px ${m.glow}` }}>
                    <div className="text-lg font-display font-black text-white">{user.totalPoints.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-white/70">pts</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="rounded-3xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {leaders?.map((user, i) => {
                const isTop3 = i < 3;
                const m = isTop3 ? MEDALS[i] : null;
                return (
                  <motion.div
                    key={user.userId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 px-5 py-4 transition-all hover:bg-white/[0.03]"
                    style={isTop3 ? { background: `${m!.glow.replace("0.3","0.07")}` } : undefined}
                  >
                    {/* Rank */}
                    <div className="w-8 shrink-0 text-center">
                      {isTop3 ? (
                        <span className="text-xl">{MEDALS[i].label}</span>
                      ) : (
                        <span className="text-sm font-black" style={{ color: "rgba(255,255,255,0.25)" }}>#{i + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <img src={user.avatarUrl || `${import.meta.env.BASE_URL}images/avatar-placeholder.png`}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                      style={isTop3 ? { border: `2px solid ${m!.border.replace("0.4","0.8")}` } : undefined}
                    />

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{user.displayName}</div>
                      <div className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.3)" }}>@{user.username}</div>
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0">
                      <div className="font-display font-black text-lg" style={{ color: isTop3 ? "#fbbf24" : "#a855f7" }}>
                        {user.totalPoints.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>pts</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
