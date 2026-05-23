import { useRoute, useLocation } from "wouter";
import { useGetGame, useListParticipants, useStartGame, useEndGame } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Play, Square, Trophy, ChevronRight, Zap, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { getGameShape } from "@/lib/utils";
import { useSound } from "@/contexts/SoundContext";
import { useFullscreen } from "@/lib/use-fullscreen";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const BLOCK_COLORS = ["#e21b3c", "#1368ce", "#26890c", "#d89e00"];
const BAR_COLORS   = ["bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-yellow-400"];
const MEDAL = ["🥇", "🥈", "🥉"];
const RING_R = 38;
const RING_CIRC = 2 * Math.PI * RING_R;

function TimerRing({ value, max, showAnswers }: { value: number; max: number; showAnswers: boolean }) {
  const pct = max > 0 ? value / max : 0;
  const danger = pct < 0.25;
  const offset = RING_CIRC * (1 - pct);
  const color = pct > 0.5 ? "#52c41a" : pct > 0.25 ? "#faad14" : "#ff4d4f";
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={RING_R} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="44" cy="44" r={RING_R} fill="none"
            stroke={showAnswers ? "rgba(255,255,255,0.2)" : color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={RING_CIRC} strokeDashoffset={showAnswers ? RING_CIRC : offset}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-display font-black text-4xl tabular-nums ${danger && !showAnswers ? "text-red-400 animate-pulse" : "text-white"}`}>
            {showAnswers ? "✓" : value}
          </span>
        </div>
      </div>
      <span className="text-white/40 text-sm font-bold">sec</span>
    </div>
  );
}

function useGameByToken(token: string) {
  return useQuery({
    queryKey: [`/api/games/host-session/${token}`],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/games/host-session/${token}`, { credentials: "include" });
      if (res.status === 403) throw Object.assign(new Error("Forbidden"), { status: 403 });
      if (res.status === 404) throw Object.assign(new Error("Not found"), { status: 404 });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<any>;
    },
    refetchInterval: 1500,
    retry: false,
  });
}

export default function HostGamePage() {
  const { isFullscreen, toggle } = useFullscreen();
  return (
    <ProtectedRoute>
      <HostGameInner />
      <button
        onClick={toggle}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 9999,
          background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 10, padding: "7px 9px", cursor: "pointer", color: "#fff",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
        }}
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
    </ProtectedRoute>
  );
}

function HostGameInner() {
  const [, params] = useRoute("/host/:token");
  const token = params?.token || "";
  const [, setLocation] = useLocation();

  const { data: game, isLoading, error } = useGameByToken(token);

  if (!token) return <div className="min-h-screen flex items-center justify-center text-white" style={{ background: "#0d0d1a" }}>Invalid link</div>;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0d1a" }}>
      <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
    </div>
  );

  if ((error as any)?.status === 403) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white p-8 text-center" style={{ background: "#0d0d1a" }}>
      <div className="text-7xl mb-2">🔒</div>
      <h1 className="text-3xl font-display font-black">Access Denied</h1>
      <p className="text-white/50 font-medium max-w-xs">This host session belongs to another account. Only the game creator can manage it.</p>
      <Button onClick={() => setLocation("/dashboard")} className="mt-4 rounded-2xl px-8 h-12 font-black">Go to Dashboard</Button>
    </div>
  );

  if ((error as any)?.status === 404 || (game?.status === "ended" && !game?.startedAt)) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white p-8 text-center" style={{ background: "#0d0d1a" }}>
      <div className="text-7xl mb-2">⏰</div>
      <h1 className="text-3xl font-display font-black">Game Expired</h1>
      <p className="text-white/50 font-medium max-w-xs">No players joined within 5 minutes, so this session was automatically closed.</p>
      <Button onClick={() => setLocation("/dashboard")} className="mt-4 rounded-2xl px-8 h-12 font-black">Go to Dashboard</Button>
    </div>
  );

  if (!game) return null;

  return <HostView id={game.id} />;
}

function useAnswerStats(gameId: number, enabled: boolean) {
  return useQuery({
    queryKey: [`/api/games/${gameId}/answer-stats`],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/games/${gameId}/answer-stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        questionId: number; questionText: string; questionType: string; options: string[];
        correctAnswer: string; timeLimit: number; points: number;
        answered: number; total: number;
        distribution: Record<string, number>;
        textAnswers: { answer: string; isCorrect: number; participantId: number }[] | null;
        questionIndex: number; totalQuestions: number;
        allAnswered: boolean; imageUrl: string | null; audioUrl: string | null;
        gameMode: string; relayTeams: any[] | null;
      }>;
    },
    refetchInterval: 800,
    enabled,
  });
}

function useReveal(gameId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/games/${gameId}/reveal`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/games/${gameId}`] }),
  });
}

function useShowLeaderboard(gameId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/games/${gameId}/show-leaderboard`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/games/${gameId}`] }),
  });
}

function useNextQuestion(gameId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/games/${gameId}/next-question`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/games/${gameId}`] });
      qc.invalidateQueries({ queryKey: [`/api/games/${gameId}/answer-stats`] });
    },
  });
}

function HostView({ id }: { id: number }) {
  const { data: game, isLoading } = useGetGame(id, { query: { refetchInterval: 1000 } });
  const { data: participants = [] } = useListParticipants(id, { query: { refetchInterval: 1200 } });
  const { data: stats, isLoading: statsLoading } = useAnswerStats(id, game?.status === "active");

  const startMut        = useStartGame();
  const endMut          = useEndGame();
  const revealMut       = useReveal(id);
  const leaderboardMut  = useShowLeaderboard(id);
  const nextMut         = useNextQuestion(id);
  const [, setLocation] = useLocation();
  const { playTick, playCountdownEnd, startGameMusic, stopGameMusic } = useSound();

  const [showAnswers, setShowAnswers] = useState(false);
  const [timer, setTimer]             = useState(0);
  const [expiryLeft, setExpiryLeft]   = useState(300);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevQRef    = useRef<number | null>(null);

  useEffect(() => {
    if (game?.status !== "waiting" || !game?.createdAt) return;
    const EXPIRY_MS = 5 * 60 * 1000;
    const tick = () => {
      const left = Math.max(0, (new Date(game.createdAt).getTime() + EXPIRY_MS - Date.now()) / 1000);
      setExpiryLeft(Math.round(left));
    };
    tick();
    expiryRef.current = setInterval(tick, 1000);
    return () => { if (expiryRef.current) clearInterval(expiryRef.current); };
  }, [game?.status, game?.createdAt]);

  // Sync local showAnswers with game phase from server
  const phase = (game as any)?.questionPhase ?? "question";
  useEffect(() => {
    if (phase === "revealing" || phase === "leaderboard") setShowAnswers(true);
    if (phase === "question") setShowAnswers(false);
  }, [phase]);

  useEffect(() => {
    if (game?.status === "active") startGameMusic();
    if (game?.status === "ended") { stopGameMusic(); }
  }, [game?.status]);

  useEffect(() => {
    if (stats && stats.questionIndex !== prevQRef.current) {
      prevQRef.current = stats.questionIndex;
      setShowAnswers(false);
      setTimer(stats.timeLimit);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            playCountdownEnd();
            handleReveal();
            return 0;
          }
          if (t <= 10) playTick();
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stats?.questionIndex, stats?.timeLimit]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#46178f" }}><Loader2 className="w-12 h-12 animate-spin text-white" /></div>;
  if (!game) return <div>Game not found</div>;

  const handleStart   = () => startMut.mutate({ id });
  const handleEnd     = async () => { if (!confirm("End game for everyone?")) return; await endMut.mutateAsync({ id }); setLocation(`/results/${id}`); };
  const handleReveal  = async () => { setShowAnswers(true); if (timerRef.current) clearInterval(timerRef.current); setTimer(0); await revealMut.mutateAsync(); };
  const handleShowLeaderboard = async () => { await leaderboardMut.mutateAsync(); };
  const handleNext    = async () => { const r = await nextMut.mutateAsync(); if (r.ended || r.status === "ended") setLocation(`/results/${id}`); };

  const sorted         = [...participants].sort((a, b) => b.score - a.score);
  const isLastQuestion = stats && stats.questionIndex >= stats.totalQuestions;

  // ── ACTIVE: Leaderboard Phase ─────────────────────────────────────────
  if (game.status === "active" && phase === "leaderboard") {
    const isBombMode = (game as any).gameMode === "bomb";
    const podiumBg = (i: number) =>
      i === 0 ? "rgba(255,204,2,0.18)"
      : i === 1 ? "rgba(192,192,192,0.13)"
      : i === 2 ? "rgba(205,127,50,0.16)"
      : "rgba(255,255,255,0.06)";
    const podiumBorder = (i: number) =>
      i === 0 ? "#ffcc02" : i === 1 ? "#bbb" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.1)";
    const podiumScore = (i: number) =>
      i === 0 ? "#ffcc02" : i === 1 ? "#d0d0d0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.8)";
    const aliveSorted = isBombMode ? sorted.filter((p: any) => !p.eliminated) : sorted;
    const eliminatedSorted = isBombMode ? sorted.filter((p: any) => p.eliminated) : [];

    return (
      <div className="min-h-screen flex flex-col text-white" style={{ background: "linear-gradient(160deg,#1a0050 0%,#46178f 60%,#2c0b72 100%)" }}>
        <TopBar game={game} participants={participants} onEnd={handleEnd} stats={stats} />
        {isBombMode && (
          <div className="flex items-center justify-center gap-6 py-3 shrink-0"
            style={{ background: "rgba(0,0,0,0.3)" }}>
            <div className="flex items-center gap-2 font-black text-sm" style={{ color: "#86efac" }}>
              💚 {aliveSorted.length} Surviving
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2 font-black text-sm" style={{ color: "#fca5a5" }}>
              💥 {eliminatedSorted.length} Eliminated
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8">

          {/* Title */}
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-4">
            {isBombMode ? (
              <>
                <span className="text-5xl leading-none drop-shadow-lg">💣</span>
                <div>
                  <h2 className="text-5xl md:text-6xl font-display font-black tracking-tight leading-none">Bomb Board</h2>
                  {isLastQuestion && aliveSorted.length > 0 && (
                    <p className="text-green-300 font-black text-xl mt-1">🎉 {aliveSorted.length} survivor{aliveSorted.length !== 1 ? "s" : ""} won!</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <Trophy className="w-12 h-12 text-yellow-400 drop-shadow-lg shrink-0" />
                <h2 className="text-5xl md:text-6xl font-display font-black tracking-tight">Leaderboard</h2>
              </>
            )}
          </motion.div>

          {/* Podium top-3 */}
          {sorted.length >= 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex items-end justify-center gap-6 w-full max-w-5xl">
              {/* 2nd */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="text-4xl font-black text-white/60">{MEDAL[1]}</div>
                <div className="w-full rounded-2xl px-6 py-6 text-center" style={{ background: podiumBg(1), border: `2px solid ${podiumBorder(1)}`, minHeight: "130px" }}>
                  <div className="font-black text-xl truncate">{sorted[1]?.nickname}</div>
                  <div className="text-3xl font-black mt-2" style={{ color: podiumScore(1) }}>{sorted[1]?.score.toLocaleString()}</div>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  className="text-5xl font-black">{MEDAL[0]}</motion.div>
                <div className="w-full rounded-2xl px-6 py-8 text-center" style={{ background: podiumBg(0), border: `3px solid ${podiumBorder(0)}`, boxShadow: "0 0 40px rgba(255,204,2,0.3)", minHeight: "155px" }}>
                  <div className="font-black text-2xl truncate">{sorted[0]?.nickname}</div>
                  <div className="text-4xl font-black mt-2" style={{ color: podiumScore(0) }}>{sorted[0]?.score.toLocaleString()}</div>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="text-4xl font-black text-white/60">{MEDAL[2]}</div>
                <div className="w-full rounded-2xl px-6 py-5 text-center" style={{ background: podiumBg(2), border: `2px solid ${podiumBorder(2)}`, minHeight: "115px" }}>
                  <div className="font-black text-xl truncate">{sorted[2]?.nickname}</div>
                  <div className="text-3xl font-black mt-2" style={{ color: podiumScore(2) }}>{sorted[2]?.score.toLocaleString()}</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Rest of the board */}
          <div className="w-full max-w-5xl space-y-3">
            {(isBombMode ? [...aliveSorted, ...eliminatedSorted] : sorted).slice(isBombMode ? 0 : (sorted.length >= 3 ? 3 : 0), 8).map((p: any, idx) => {
              const isOut = isBombMode && !!p.eliminated;
              const i = idx + ((!isBombMode && sorted.length >= 3) ? 3 : 0);
              return (
                <motion.div key={p.id}
                  initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.35 + idx * 0.07, type: "spring", stiffness: 260, damping: 22 }}
                  className="flex items-center gap-4 rounded-2xl px-6 py-4"
                  style={{
                    background: isOut ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.06)",
                    border: isOut ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.1)",
                    opacity: isOut ? 0.6 : 1,
                  }}>
                  <span className="text-2xl w-10 text-center font-black text-white/50">#{i + 1}</span>
                  <span className="flex-1 font-black text-xl truncate">{p.nickname}</span>
                  {isBombMode && (
                    <span className="text-xs font-black px-2 py-0.5 rounded-full shrink-0"
                      style={isOut
                        ? { background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)" }
                        : { background: "rgba(34,197,94,0.2)", color: "#86efac", border: "1px solid rgba(34,197,94,0.4)" }}>
                      {isOut ? "💥 out" : "💚 alive"}
                    </span>
                  )}
                  {!isOut && (p as any).streak > 1 && (
                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(251,146,60,0.2)", color: "#fdba74", border: "1px solid rgba(251,146,60,0.35)" }}>
                      <Zap className="w-3 h-3" />{(p as any).streak}
                    </span>
                  )}
                  <span className="font-black text-xl tabular-nums" style={{ color: "rgba(255,255,255,0.8)" }}>{p.score.toLocaleString()}</span>
                </motion.div>
              );
            })}
            {sorted.length === 0 && <p className="text-white/30 text-center text-xl py-4">No scores yet</p>}
          </div>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }} className="flex gap-4">
            <Button onClick={handleEnd} variant="outline" size="lg"
              className="rounded-2xl font-bold border-white/30 text-white hover:bg-white/10 h-14 px-8">
              <Square className="w-5 h-5 mr-2 fill-current" /> End Game
            </Button>
            <Button onClick={handleNext} disabled={nextMut.isPending} size="lg"
              className="h-14 px-12 rounded-2xl font-black text-xl"
              style={{ background: isLastQuestion ? "#e53e3e" : "#ffcc02", color: "#111" }}>
              {nextMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : isLastQuestion ? "🏁 Finish!" : <>Next <ChevronRight className="w-5 h-5" /></>}
            </Button>
          </motion.div>

        </div>
      </div>
    );
  }

  // ── ACTIVE: Question Phase ────────────────────────────────────────────
  if (game.status === "active") {
    const isBombActive = (game as any).gameMode === "bomb";
    const isVolcanoActive = (game as any).gameMode === "volcano";
    const isClassicPlusActive = (game as any).gameMode === "classic_plus";
    const isRelayActive = (game as any).gameMode === "relay";
    const isShortAnswerQ = stats?.questionType === "short_answer";
    const isAudioQ = stats?.questionType === "audio";
    const maxCount = stats ? Math.max(1, ...Object.values(stats.distribution)) : 1;
    const allAnswered = stats?.allAnswered && !showAnswers;
    const bg = isBombActive
      ? "linear-gradient(135deg, #1a0a00 0%, #431407 50%, #1a0a00 100%)"
      : isVolcanoActive
      ? "linear-gradient(135deg, #1c0a00 0%, #7c1d09 50%, #1c0a00 100%)"
      : "linear-gradient(135deg, #46178f 0%, #7b2ff7 100%)";

    return (
      <div className="min-h-screen flex flex-col text-white" style={{ background: bg }}>
        <TopBar game={game} participants={participants} onEnd={handleEnd} stats={stats} />
        {isBombActive && stats && (
          <div className="flex items-center justify-center gap-3 py-2 shrink-0"
            style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(251,146,60,0.2)" }}>
            <div className="flex items-center gap-2 text-xs font-black" style={{ color: "#86efac" }}>
              💚 {(stats as any).aliveCount ?? 0} alive
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-2 text-xs font-black" style={{ color: "#fca5a5" }}>
              💥 {(stats as any).eliminatedCount ?? 0} eliminated
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="text-xs font-black text-orange-300">
              ⏱ This round: {stats.timeLimit}s
            </div>
          </div>
        )}
        {isVolcanoActive && (
          <div className="flex items-center justify-center gap-2 py-2 shrink-0 text-xs font-black text-red-300"
            style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(220,38,38,0.25)" }}>
            🌋 Volcano Mode — question shown on players' phones
          </div>
        )}
        {isClassicPlusActive && (
          <div className="flex items-center justify-center gap-2 py-2 shrink-0 text-xs font-black text-sky-300"
            style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(56,189,248,0.2)" }}>
            📱 Classic+ — question shown on players' phones
          </div>
        )}
        {isRelayActive && stats?.relayTeams && (
          <div className="flex items-center justify-center gap-6 py-2 shrink-0 text-xs font-black"
            style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            {stats.relayTeams.map((team: any) => (
              <div key={team.teamId} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: team.color }} />
                <span style={{ color: team.color }}>{team.name}</span>
                <span className="text-white/50">· Active: </span>
                <span className="text-white font-black">{team.activePlayer?.nickname ?? "—"}</span>
                <span className="text-white/30">({team.score?.toLocaleString()} pts)</span>
              </div>
            ))}
          </div>
        )}

        {statsLoading || !stats ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white/50" /></div>
        ) : (
          <div className="flex-1 flex flex-col p-3 gap-3 w-full">

            {/* Question + Timer ring */}
            <div className="flex items-stretch gap-4">
              <AnimatePresence mode="wait">
                <motion.div key={stats.questionIndex}
                  initial={{ y: -24, opacity: 0, scale: 0.97 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220 }}
                  className="flex-1 bg-white text-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                  {stats.imageUrl && (
                    <img src={stats.imageUrl} alt="" className="w-full max-h-64 object-cover" />
                  )}
                  {isAudioQ && stats.audioUrl && (
                    <div className="px-6 pt-4 flex flex-col items-center gap-2">
                      <div className="text-xs font-black uppercase tracking-widest text-gray-400">🎵 Audio Question — plays automatically</div>
                      <audio controls autoPlay src={stats.audioUrl} key={stats.questionId} className="w-full max-w-md" />
                    </div>
                  )}
                  <div className="flex-1 px-10 py-6 flex items-center justify-center">
                    <h2 className="text-4xl md:text-6xl font-display font-black leading-tight text-center">
                      {stats.questionText}
                    </h2>
                  </div>
                </motion.div>
              </AnimatePresence>
              <TimerRing value={timer} max={stats.timeLimit} showAnswers={showAnswers} />
            </div>

            {/* All-answered nudge */}
            <AnimatePresence>
              {allAnswered && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-center text-sm font-bold text-yellow-300 animate-pulse">
                  ✅ Everyone answered! Ready to reveal.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Answer blocks / text answer display */}
            {isShortAnswerQ ? (
              <div className="rounded-2xl p-5 border border-white/15" style={{ background: "rgba(0,0,0,0.35)" }}>
                <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">
                  ✎ Player Answers {showAnswers && <span className="text-purple-400 ml-2">— Correct: <span className="text-white">{stats.correctAnswer}</span></span>}
                </div>
                {stats.textAnswers && stats.textAnswers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.textAnswers.map((ta, i) => (
                      <motion.div key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.06, type: "spring", stiffness: 300 }}
                        className="px-4 py-2 rounded-xl font-bold text-sm"
                        style={{
                          background: showAnswers
                            ? ta.isCorrect ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.15)"
                            : "rgba(255,255,255,0.12)",
                          border: showAnswers
                            ? ta.isCorrect ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(239,68,68,0.3)"
                            : "1px solid rgba(255,255,255,0.15)",
                          color: showAnswers
                            ? ta.isCorrect ? "#86efac" : "#fca5a5"
                            : "#fff",
                        }}>
                        {showAnswers && (ta.isCorrect ? "✓ " : "✗ ")}{ta.answer}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-white/30 font-bold text-sm">Waiting for answers…</div>
                )}
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4 flex-1">
              {stats.options.map((opt, i) => {
                const count   = stats.distribution[opt] || 0;
                const pct     = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const barW    = stats.total > 0 ? (count / maxCount) * 100 : 0;
                const correct = opt === stats.correctAnswer;
                const isLastOdd = stats.options.length === 3 && i === 2;

                return (
                  <div key={i} className={`rounded-2xl overflow-hidden transition-all duration-300 flex flex-col${isLastOdd ? " col-span-2" : ""} ${showAnswers ? correct ? "ring-4 ring-white shadow-2xl" : "opacity-40" : ""}`}>
                    <div className="flex items-center gap-4 px-7 py-6 flex-1" style={{ background: BLOCK_COLORS[i] }}>
                      <span className="text-4xl text-white/90 shrink-0">{getGameShape(i)}</span>
                      <span className="font-display font-black text-2xl md:text-3xl flex-1 text-white drop-shadow leading-tight">{opt}</span>
                      {showAnswers && (
                        <div className="flex items-center gap-2 shrink-0 text-white">
                          <span className="font-black text-3xl">{count}</span>
                          <span className="text-white/70 text-base">({pct}%)</span>
                          {correct && <span className="text-3xl">✓</span>}
                        </div>
                      )}
                    </div>
                    {showAnswers && (
                      <motion.div className={`h-4 ${BAR_COLORS[i]}`}
                        initial={{ width: 0 }} animate={{ width: `${barW}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1 }} />
                    )}
                  </div>
                );
              })}
            </div>
            )}

            {/* Answer progress + Controls */}
            <div className="flex items-center justify-between gap-4 rounded-2xl p-4 border border-white/15" style={{ background: "rgba(0,0,0,0.35)" }}>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl font-black tabular-nums">{stats.answered}<span className="text-white/40 text-lg">/{stats.total}</span></span>
                <div className="flex-1 rounded-full h-3 overflow-hidden bg-white/10">
                  <motion.div className="h-full rounded-full" style={{ background: "#ffcc02" }}
                    animate={{ width: stats.total > 0 ? `${(stats.answered / stats.total) * 100}%` : "0%" }}
                    transition={{ duration: 0.4 }} />
                </div>
                <span className="text-white/50 text-sm font-bold">answered</span>
              </div>
              <div className="flex gap-3 shrink-0">
                {!showAnswers ? (
                  <Button onClick={handleReveal} disabled={revealMut.isPending} variant="outline" className="rounded-xl font-bold border-white/20 text-white hover:bg-white/10">
                    {revealMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Show Answers"}
                  </Button>
                ) : (
                  <Button onClick={handleShowLeaderboard} disabled={leaderboardMut.isPending} size="lg"
                    className="rounded-xl font-black px-8 text-black" style={{ background: "#ffcc02" }}>
                    {leaderboardMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trophy className="w-5 h-5 mr-2" /> Leaderboard</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── WAITING ROOM ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden text-white"
      style={{ background: "linear-gradient(135deg, #46178f 0%, #7b2ff7 100%)" }}>

      <div className="py-10 px-4 flex flex-col items-center z-10"
        style={{ background: "rgba(0,0,0,0.35)", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        {(game as any).gameMode === "bomb" && (
          <div className="mb-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-5 py-2 rounded-2xl font-black text-base"
              style={{ background: "rgba(251,146,60,0.2)", border: "1px solid rgba(251,146,60,0.5)", color: "#fdba74" }}>
              💣 BOMB MODE — Last Man Standing
            </div>
            <p className="text-white/40 text-sm font-medium text-center max-w-xs">
              Timer: 30s → 20s → 15s → 10s → 5s. Wrong answer = eliminated. Survivors win together!
            </p>
          </div>
        )}
        {(game as any).gameMode === "volcano" && (
          <div className="mb-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-5 py-2 rounded-2xl font-black text-base"
              style={{ background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.5)", color: "#fca5a5" }}>
              🌋 VOLCANO MODE
            </div>
            <p className="text-white/40 text-sm font-medium text-center max-w-xs">
              Question shown on players' phones. Race to the top!
            </p>
          </div>
        )}
        {(game as any).gameMode === "classic_plus" && (
          <div className="mb-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-5 py-2 rounded-2xl font-black text-base"
              style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.4)", color: "#7dd3fc" }}>
              📱 CLASSIC+ MODE
            </div>
            <p className="text-white/40 text-sm font-medium text-center max-w-xs">
              Question shown on everyone's phone — great for remote play.
            </p>
          </div>
        )}
        {(game as any).gameMode === "relay" && (
          <div className="mb-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-5 py-2 rounded-2xl font-black text-base"
              style={{ background: "rgba(22,163,74,0.2)", border: "1px solid rgba(22,163,74,0.5)", color: "#86efac" }}>
              🏁 RELAY RACE MODE
            </div>
            <p className="text-white/40 text-sm font-medium text-center max-w-xs">
              Players auto-split into Team Red & Team Blue. Each question, one player per team answers in turn.
            </p>
          </div>
        )}
        <p className="text-white/60 font-black text-lg uppercase tracking-widest mb-3">Game PIN</p>
        <div className="font-display font-black tracking-[0.15em] text-white drop-shadow-2xl"
          style={{ fontSize: "clamp(4rem, 15vw, 8rem)" }}>
          {game.pin}
        </div>
        <p className="mt-3 text-white/50 font-medium">Join at <span className="text-white font-bold">qwizds.com</span></p>
        {participants.length === 0 && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background: expiryLeft < 60 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
              color: expiryLeft < 60 ? "#fca5a5" : "rgba(255,255,255,0.45)",
              border: expiryLeft < 60 ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)",
            }}>
            ⏳ Auto-closes if no one joins in {Math.floor(expiryLeft / 60)}:{String(expiryLeft % 60).padStart(2, "0")}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center px-6 md:px-16 py-5 z-10">
        <div className="px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-3 font-bold text-xl"
          style={{ background: "rgba(255,255,255,0.1)" }}>
          <Users className="w-6 h-6" style={{ color: "#ffcc02" }} /> {participants.length} Players
        </div>
        <Button size="lg" onClick={handleStart} disabled={participants.length === 0 || startMut.isPending}
          className="h-16 px-14 text-2xl font-black rounded-2xl shadow-xl"
          style={{ background: participants.length > 0 ? "#ffcc02" : "rgba(255,255,255,0.2)", color: "#111" }}>
          {startMut.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Play className="w-6 h-6 mr-2 fill-current" /> Start!</>}
        </Button>
      </div>

      <div className="flex-1 px-6 md:px-16 overflow-y-auto z-10">
        <div className="flex flex-wrap gap-3 justify-center">
          <AnimatePresence>
            {participants.map(p => (
              <motion.div key={p.id}
                initial={{ opacity: 0, scale: 0.4, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.4 }}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border border-white/20"
                style={{ background: "rgba(255,255,255,0.12)", minWidth: "80px" }}>
                <span className="text-3xl leading-none select-none">{p.avatar || "🐶"}</span>
                <span className="font-black text-sm text-white leading-tight text-center max-w-[80px] truncate">{p.nickname}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {participants.length === 0 && (
            <div className="text-2xl font-bold text-white/30 mt-20 text-center w-full animate-pulse">
              Waiting for players to join...
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ background: "#ffcc02" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "#e21b3c" }} />
      </div>
    </div>
  );
}

function TopBar({ game, participants, onEnd, stats }: { game: any; participants: any[]; onEnd: () => void; stats: any }) {
  const isBomb = game.gameMode === "bomb";
  return (
    <div className="px-5 py-3 flex justify-between items-center shrink-0 z-10"
      style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <div>
        <div className="flex items-center gap-2">
          {isBomb && <span className="text-lg leading-none">💣</span>}
          <h1 className="text-lg font-display font-black">{game.quizTitle}</h1>
        </div>
        <div className="text-sm font-semibold text-white/50">
          PIN: <span className="text-white font-black tracking-widest">{game.pin}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isBomb && stats ? (
          <>
            <div className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5"
              style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#86efac" }}>
              💚 {stats.aliveCount ?? game.aliveCount ?? 0} alive
            </div>
            <div className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5"
              style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5" }}>
              💥 {stats.eliminatedCount ?? game.eliminatedCount ?? 0} out
            </div>
          </>
        ) : (
          <div className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2" style={{ background: "rgba(255,255,255,0.1)" }}>
            <Users className="w-4 h-4" /> {participants.length}
          </div>
        )}
        {stats && (
          <div className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: "rgba(255,204,2,0.2)", border: "1px solid rgba(255,204,2,0.4)", color: "#ffcc02" }}>
            Q {stats.questionIndex}/{stats.totalQuestions}
          </div>
        )}
        <Button variant="destructive" onClick={onEnd} size="sm" className="rounded-xl font-bold">
          <Square className="w-4 h-4 mr-1 fill-current" /> End
        </Button>
      </div>
    </div>
  );
}
