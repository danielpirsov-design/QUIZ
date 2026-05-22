import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Trophy, Home, Loader2, Zap, RotateCcw } from "lucide-react";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useSound } from "@/contexts/SoundContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS = [
  { bg: "#ffd700", glow: "rgba(255,215,0,0.55)", height: 224, border: "#f5c400" },
  { bg: "#c0c0c0", glow: "rgba(192,192,192,0.4)",  height: 160, border: "#b0b0b0" },
  { bg: "#cd7f32", glow: "rgba(205,127,50,0.4)",   height: 128, border: "#b87333" },
];
// visual order: 2nd (left), 1st (center), 3rd (right)
// reveal order: 3rd → 2nd → 1st
const VISUAL_ORDER = [1, 0, 2]; // visual slot → sorted rank index

function useWindowSize() {
  const [size, setSize] = useState({ width: 1000, height: 800 });
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSize({ width: window.innerWidth, height: window.innerHeight });
    const h = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return size;
}

export default function ResultsPage() {
  const [, params] = useRoute("/results/:id");
  const id = parseInt(params?.id || "0");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const participantId = typeof window !== "undefined"
    ? parseInt(sessionStorage.getItem(`game_${id}_participant`) || "0")
    : 0;

  const { data: results, isLoading } = useQuery<any>({
    queryKey: [`/api/games/${id}/results`, participantId],
    queryFn: async () => {
      const url = participantId
        ? `${BASE}/api/games/${id}/results?pid=${participantId}`
        : `${BASE}/api/games/${id}/results`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
  });

  const { width, height } = useWindowSize();
  const { playPodium } = useSound();

  // How many podium places revealed (0..3, reveals 3rd→2nd→1st)
  const [revealed, setRevealed] = useState(0);
  const [showRest, setShowRest] = useState(false);

  useEffect(() => {
    if (!results) return;
    // 3rd at t=0.8s, 2nd at t=2.3s, 1st at t=3.8s
    const delays = [800, 2300, 3800];
    const places: Array<1 | 2 | 3> = [3, 2, 1];
    const timers = delays.map((d, i) =>
      setTimeout(() => {
        setRevealed(r => r + 1);
        playPodium(places[i]);
      }, d)
    );
    const restTimer = setTimeout(() => setShowRest(true), 5400);
    return () => { timers.forEach(clearTimeout); clearTimeout(restTimer); };
  }, [results]);

  // Guard: must be a participant or authenticated (host)
  if (!authLoading && !participantId && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white"
        style={{ background: "linear-gradient(135deg,#1a0050 0%,#46178f 100%)" }}>
        <div className="text-6xl font-display font-black text-white/20">404</div>
        <p className="text-xl font-bold text-white/60">Game not found</p>
        <a href="/" className="mt-2 text-sm font-bold text-white/40 hover:text-white/70 underline underline-offset-4">Go home</a>
      </div>
    );
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#46178f" }}>
        <Loader2 className="w-12 h-12 animate-spin text-white/40" />
      </div>
    );
  }
  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#46178f" }}>
        <p className="text-white font-bold text-xl">Results not found</p>
      </div>
    );
  }

  const sorted = [...results.participants].sort((a, b) => b.score - a.score);
  const rest = sorted.slice(3);

  // Which rank indices are now visible (reveal order: rank 2 first, then rank 1, then rank 0)
  const revealRankOrder = [2, 1, 0]; // sorted index revealed in step 1, 2, 3
  const visibleRanks = new Set(revealRankOrder.slice(0, revealed));

  return (
    <div className="min-h-screen relative overflow-hidden text-white"
      style={{ background: "linear-gradient(160deg, #1a0533 0%, #46178f 45%, #7b2ff7 100%)" }}>
      <Confetti width={width} height={height} recycle={false} numberOfPieces={500}
        colors={["#ffcc02", "#fff", "#e21b3c", "#1368ce", "#26890c", "#a855f7"]} />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-25 blur-3xl" style={{ background: "#ffcc02" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: "#e21b3c" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-16">

        {/* Header */}
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="pt-10 pb-8 text-center">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-5xl md:text-7xl font-display font-black mb-2"
            style={{ background: "linear-gradient(90deg, #ffcc02, #fff, #ffcc02)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Game Over!
          </h1>
          <p className="text-xl text-white/60 font-bold">{results.quizTitle}</p>
          <p className="text-sm text-white/40 font-semibold mt-1">{results.totalParticipants} players</p>
        </motion.div>

        {/* Podium — visual order: [2nd, 1st, 3rd] */}
        <div className="flex justify-center items-end gap-2 md:gap-4 mb-12 px-2" style={{ minHeight: 320 }}>
          {VISUAL_ORDER.map((rankIdx, visSlot) => {
            const player = sorted[rankIdx];
            const cfg = PODIUM_COLORS[rankIdx];
            const isVisible = visibleRanks.has(rankIdx);
            const isFirst = rankIdx === 0;

            if (!player) return <div key={visSlot} className="w-1/3 max-w-[140px]" />;

            return (
              <div key={visSlot}
                className={`flex flex-col items-center ${isFirst ? "w-2/5 max-w-[170px]" : "w-1/3 max-w-[130px]"}`}
                style={{ zIndex: isFirst ? 10 : 5 }}>

                <AnimatePresence>
                  {isVisible && (
                    <>
                      {/* Name + score above podium */}
                      <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.7 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="text-center mb-2">
                        <div className="text-4xl mb-1">{MEDAL[rankIdx]}</div>
                        <div className={`font-black truncate w-full text-center ${isFirst ? "text-lg" : "text-base"}`}>{player.nickname}</div>
                        <div className="font-black text-yellow-300 text-sm mt-0.5">{player.score.toLocaleString()} pts</div>
                        {(player as any).streak > 1 && (
                          <div className="flex items-center justify-center gap-1 text-orange-300 text-xs font-bold mt-0.5">
                            <Zap className="w-3 h-3" />{(player as any).streak}🔥
                          </div>
                        )}
                      </motion.div>

                      {/* Podium block */}
                      <motion.div
                        initial={{ height: 0, opacity: 0, scaleX: 0.6 }}
                        animate={{ height: cfg.height, opacity: 1, scaleX: 1 }}
                        transition={{ type: "spring", stiffness: 180, damping: 20, delay: 0.15 }}
                        className="w-full rounded-t-2xl flex flex-col items-center justify-start pt-4 shadow-2xl border-t-4"
                        style={{
                          background: cfg.bg,
                          borderColor: cfg.border,
                          boxShadow: `0 0 50px ${cfg.glow}, 0 0 20px ${cfg.glow}`,
                        }}>
                        <span className="font-display font-black text-black/40"
                          style={{ fontSize: isFirst ? "4.5rem" : "3.5rem", lineHeight: 1 }}>
                          {rankIdx + 1}
                        </span>
                      </motion.div>

                      {/* Gold spotlight for 1st */}
                      {isFirst && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                          className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none"
                          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%)", filter: "blur(12px)" }} />
                      )}
                    </>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Rest of players */}
        <AnimatePresence>
          {showRest && rest.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="rounded-3xl overflow-hidden mb-8"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-black text-white/70 uppercase tracking-wider">Runner Ups</h3>
              </div>
              <div className="divide-y divide-white/5">
                {rest.map((p, i) => (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-4 px-6 py-4">
                    <span className="text-white/40 font-black w-8 text-center text-lg">#{i + 4}</span>
                    <span className="flex-1 font-black text-lg">{p.nickname}</span>
                    {(p as any).streak > 1 && (
                      <div className="flex items-center gap-1 text-orange-300 text-sm font-bold">
                        <Zap className="w-3.5 h-3.5" />{(p as any).streak}
                      </div>
                    )}
                    <div className="text-right">
                      <div className="font-black text-yellow-300 text-lg">{p.score.toLocaleString()}</div>
                      <div className="text-xs text-white/30 font-bold">{p.correctAnswers}/{p.totalAnswers} ✓</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.2 }}
          className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-8 text-lg font-black rounded-2xl w-full sm:w-auto"
              style={{ background: "#ffcc02", color: "#111" }}>
              <Home className="w-5 h-5 mr-2" /> Dashboard
            </Button>
          </Link>
          <Link href="/discover">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-black rounded-2xl w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
              <RotateCcw className="w-5 h-5 mr-2" /> Play Again
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
