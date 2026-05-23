import { useRoute, useLocation } from "wouter";
import { useGetGame, useSubmitAnswer } from "@workspace/api-client-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Trophy, Zap, Shield, Scissors, Flame, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import Confetti from "react-confetti";
import { useSound } from "@/contexts/SoundContext";
import { useFullscreen } from "@/lib/use-fullscreen";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const BLOCKS = [
  { bg: "#e21b3c", shape: "▲", shadow: "#9e0e25" },
  { bg: "#1368ce", shape: "♦", shadow: "#0b4a94" },
  { bg: "#26890c", shape: "■", shadow: "#165c07" },
  { bg: "#d89e00", shape: "●", shadow: "#a07500" },
];

const TF_BLOCKS = [
  { bg: "#26890c", shape: "✓", shadow: "#165c07", label: "TRUE" },
  { bg: "#e21b3c", shape: "✗", shadow: "#9e0e25", label: "FALSE" },
];

const MEDAL = ["🥇", "🥈", "🥉"];

function useQuizQ(quizId: number, gameId: number) {
  return useQuery({
    queryKey: [`/api/quizzes/${quizId}`, gameId],
    queryFn: async () => {
      const params = gameId ? `?gameId=${gameId}` : "";
      const res = await fetch(`${BASE}/api/quizzes/${quizId}${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<{ questions: { id: number; orderIndex: number; timeLimit: number; options: string[]; questionType?: string; audioUrl?: string | null }[] }>;
    },
    enabled: !!quizId,
  });
}

function useLeaderboard(gameId: number, enabled: boolean) {
  return useQuery({
    queryKey: [`/api/games/${gameId}/participants`],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/games/${gameId}/participants`, { credentials: "include" });
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<{ id: number; nickname: string; score: number; streak: number }[]>;
    },
    refetchInterval: enabled ? 1500 : false,
    enabled,
  });
}

export default function PlayGamePage() {
  const [, params] = useRoute("/play/:id");
  const id = parseInt(params?.id || "0");
  const participantId = typeof window !== "undefined" ? parseInt(sessionStorage.getItem(`game_${id}_participant`) || "0") : 0;
  const nickname = typeof window !== "undefined" ? sessionStorage.getItem(`game_${id}_nickname`) || "Player" : "Player";
  const avatar = typeof window !== "undefined" ? sessionStorage.getItem(`game_${id}_avatar`) || "🐶" : "🐶";
  const { isFullscreen, toggle } = useFullscreen();
  if (!id || !participantId) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white"
      style={{ background: "linear-gradient(135deg,#1a0050 0%,#46178f 100%)" }}>
      <div className="text-6xl font-display font-black text-white/20">404</div>
      <p className="text-xl font-bold text-white/60">Game not found</p>
      <a href="/" className="mt-2 text-sm font-bold text-white/40 hover:text-white/70 underline underline-offset-4">Go home</a>
    </div>
  );
  return (
    <>
      <PlayerView gameId={id} participantId={participantId} nickname={nickname} avatar={avatar} />
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
    </>
  );
}

// Bomb mode timer sequence
const BOMB_TIMERS = [30, 20, 15, 10, 5];
function getBombTimeLimit(questionIndex: number): number {
  return BOMB_TIMERS[Math.min(questionIndex - 1, BOMB_TIMERS.length - 1)];
}

function PlayerView({ gameId, participantId, nickname, avatar }: { gameId: number; participantId: number; nickname: string; avatar: string }) {
  const [, setLocation] = useLocation();
  const { data: game } = useGetGame(gameId, { query: { refetchInterval: 1000 } });
  const { data: quiz } = useQuizQ(game?.quizId || 0, gameId);
  const submitMut = useSubmitAnswer();
  const { playTick, playCorrect, playWrong } = useSound();

  const [answered, setAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [timer, setTimer] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [phase, setPhase] = useState<"waiting" | "countdown" | "answering" | "done">("waiting");
  const [selfEliminated, setSelfEliminated] = useState(false);
  const [textInput, setTextInput] = useState("");

  // Power-ups
  const [powerups, setPowerups] = useState({ shield: 1, fifty: 1, double: 1 });
  const [boostActive, setBoostActive] = useState({ shield: false, double: false });
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);

  const powerupMut = useMutation({
    mutationFn: async (type: "shield" | "fifty" | "double") => {
      const r = await fetch(`${BASE}/api/games/${gameId}/powerup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ participantId, type }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data) => {
      if (data.type === "shield") {
        setPowerups(p => ({ ...p, shield: p.shield - 1 }));
        setBoostActive(b => ({ ...b, shield: true }));
      } else if (data.type === "double") {
        setPowerups(p => ({ ...p, double: p.double - 1 }));
        setBoostActive(b => ({ ...b, double: true }));
      } else if (data.type === "fifty") {
        setPowerups(p => ({ ...p, fifty: p.fifty - 1 }));
        setEliminatedIndices(data.eliminateIndices ?? []);
      }
    },
  });

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevQ = useRef<number | null>(null);

  const sortedQs = quiz?.questions ? [...quiz.questions].sort((a, b) => a.orderIndex - b.orderIndex) : undefined;
  const currentQ = sortedQs && game?.currentQuestion != null ? sortedQs[(game.currentQuestion) - 1] : undefined;
  const gamePhase = (game as any)?.questionPhase ?? "question";

  const isLeaderboardPhase = useLeaderboard(gameId, gamePhase === "leaderboard" && game?.status === "active");

  useEffect(() => {
    const qIdx = game?.currentQuestion ?? null;
    if (qIdx !== null && qIdx !== prevQ.current && currentQ && game?.status === "active") {
      prevQ.current = qIdx;
      setAnswerResult(null);
      setBoostActive({ shield: false, double: false });
      setEliminatedIndices([]);

      if (countRef.current) clearInterval(countRef.current);
      if (timerRef.current) clearInterval(timerRef.current);

      // Eliminated players in bomb mode just spectate — no countdown/answering
      if (selfEliminated) {
        setPhase("done");
        setAnswered(true);
        return;
      }

      setAnswered(false);
      setTextInput("");
      setPhase("countdown");
      setCountdown(3);

      let c = 3;
      const isBomb = (game as any)?.gameMode === "bomb";
      const timeLimit = isBomb ? getBombTimeLimit(qIdx) : currentQ.timeLimit;
      countRef.current = setInterval(() => {
        c--;
        if (c <= 0) {
          clearInterval(countRef.current!);
          setCountdown(null);
          setPhase("answering");
          setTimer(timeLimit);
          startTimeRef.current = Date.now();
          timerRef.current = setInterval(() => {
            setTimer(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } if (t <= 10) playTick(); return t - 1; });
          }, 1000);
        } else {
          setCountdown(c);
        }
      }, 900);
    }
  }, [game?.currentQuestion, game?.status, currentQ, selfEliminated]);

  useEffect(() => {
    if (game?.status === "ended") setLocation(`/results/${gameId}`);
  }, [game?.status, gameId, setLocation]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countRef.current) clearInterval(countRef.current);
  }, []);

  const handleAnswer = useCallback(async (answer: string, idx: number) => {
    if (answered || phase !== "answering" || !currentQ) return;
    setAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const timeSpentMs = Date.now() - startTimeRef.current;
    try {
      const res = await submitMut.mutateAsync({ id: gameId, data: { questionId: currentQ.id, answer, participantId, timeSpent: timeSpentMs } });
      setAnswerResult(res);
      if (res?.correct) playCorrect(); else playWrong();
      if (res?.eliminated) setSelfEliminated(true);
    } catch { /* already answered */ }
  }, [answered, phase, currentQ, gameId, participantId, submitMut]);

  // ── WAITING FOR GAME ─────────────────────────────────────────────────
  if (game?.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white text-center"
        style={{ background: "linear-gradient(135deg, #46178f 0%, #7b2ff7 100%)" }}>
        {/* Avatar */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 6, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="mb-4 select-none"
          style={{ fontSize: "clamp(5rem, 20vw, 8rem)", lineHeight: 1, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))" }}
        >
          {avatar}
        </motion.div>

        {/* Name badge */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 20 }}
          className="px-8 py-3 rounded-2xl mb-2 font-display font-black text-3xl"
          style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)" }}
        >
          {nickname}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-2xl font-black mb-4 text-yellow-300"
        >
          You&apos;re in!
        </motion.h1>

        {(game as any)?.gameMode === "bomb" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="mb-6 px-5 py-3 rounded-2xl text-center max-w-xs"
            style={{ background: "rgba(251,146,60,0.2)", border: "1px solid rgba(251,146,60,0.4)" }}>
            <div className="text-3xl mb-1">💣</div>
            <p className="font-black text-orange-300 text-sm">Bomb Mode!</p>
            <p className="text-white/50 text-xs mt-1 font-medium">Wrong answer = out. Timer shrinks each round. Survivors win!</p>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
          className="text-base font-bold text-white/60"
        >
          Waiting for host to start...
        </motion.p>
      </div>
    );
  }

  if (!game || !currentQ) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "#46178f" }}><Loader2 className="w-12 h-12 animate-spin text-white/40" /></div>;
  }

  // ── LEADERBOARD PHASE (host showing leaderboard) ──────────────────────
  if (gamePhase === "leaderboard" && game.status === "active") {
    const board = isLeaderboardPhase.data ?? [];
    const myRank = board.findIndex(p => p.id === participantId) + 1;
    const me = board.find(p => p.id === participantId);
    const isBombLB = (game as any)?.gameMode === "bomb";
    const iAmEliminated = selfEliminated || !!(me as any)?.eliminated;

    const podiumColor = (i: number) =>
      i === 0 ? { bg: "rgba(255,204,2,0.22)", border: "rgba(255,204,2,0.7)", score: "#ffcc02" }
      : i === 1 ? { bg: "rgba(192,192,192,0.18)", border: "rgba(192,192,192,0.5)", score: "#d0d0d0" }
      : i === 2 ? { bg: "rgba(205,127,50,0.2)", border: "rgba(205,127,50,0.55)", score: "#cd7f32" }
      : { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)", score: "rgba(255,255,255,0.75)" };

    return (
      <div className="min-h-screen flex flex-col text-white"
        style={{ background: isBombLB && iAmEliminated
          ? "linear-gradient(160deg,#1a0000 0%,#3b0000 55%,#1a0000 100%)"
          : "linear-gradient(160deg,#1a0050 0%,#46178f 55%,#2c0b72 100%)" }}>

        {/* Header */}
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="pt-7 pb-2 text-center shrink-0">
          {isBombLB ? (
            <>
              <span className="text-4xl leading-none">💣</span>
              <h1 className="text-3xl font-display font-black tracking-tight mt-1">
                {iAmEliminated ? "You're Out" : "Still Alive!"}
              </h1>
            </>
          ) : (
            <>
              <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-1 drop-shadow-lg" />
              <h1 className="text-3xl font-display font-black tracking-tight">Leaderboard</h1>
            </>
          )}
        </motion.div>

        {/* My rank hero card */}
        {me && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 320, damping: 22 }}
            className="mx-4 mt-3 rounded-3xl p-4 text-center shrink-0"
            style={{ background: "rgba(255,204,2,0.16)", border: "2px solid rgba(255,204,2,0.55)", boxShadow: "0 0 32px rgba(255,204,2,0.18)" }}>
            <div className="text-6xl font-display font-black leading-none" style={{ color: "#ffcc02" }}>#{myRank}</div>
            <div className="text-white/55 font-bold text-xs uppercase tracking-widest mt-1">Your position</div>
            <div className="text-2xl font-black mt-2">{me.score.toLocaleString()} <span className="text-base font-bold text-white/40">pts</span></div>
            {me.streak > 1 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring" }}
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-black"
                style={{ background: "rgba(251,146,60,0.25)", color: "#fdba74", border: "1px solid rgba(251,146,60,0.4)" }}>
                <Zap className="w-3.5 h-3.5" /> {me.streak} streak!
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Player list */}
        <div className="flex-1 px-4 mt-3 space-y-2 overflow-y-auto pb-4 min-h-0">
          {board.slice(0, 8).map((p: any, i) => {
            const isMe = p.id === participantId;
            const isOut = isBombLB && !!p.eliminated;
            const c = podiumColor(i);
            return (
              <motion.div key={p.id}
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.28 + i * 0.09, type: "spring", stiffness: 280, damping: 24 }}
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{
                  background: isOut ? "rgba(239,68,68,0.08)" : isMe ? "rgba(255,204,2,0.17)" : c.bg,
                  border: `${isMe ? "2px" : "1px"} solid ${isOut ? "rgba(239,68,68,0.3)" : isMe ? "rgba(255,204,2,0.65)" : c.border}`,
                  boxShadow: isMe && !isOut ? "0 0 18px rgba(255,204,2,0.2)" : undefined,
                  opacity: isOut ? 0.65 : 1,
                }}>
                <span className="text-2xl w-9 text-center font-black shrink-0">{MEDAL[i] ?? `${i + 1}`}</span>
                <span className="text-xl w-8 text-center shrink-0 leading-none">{(p as any).avatar || "🐶"}</span>
                <span className="flex-1 font-black text-base truncate" style={{ color: isOut ? "#fca5a5" : isMe ? "#ffcc02" : "#fff" }}>
                  {p.nickname}{isMe ? " ★" : ""}
                </span>
                {isBombLB && (
                  <span className="text-xs font-black px-1.5 py-0.5 rounded-full shrink-0"
                    style={isOut
                      ? { color: "#fca5a5" }
                      : { color: "#86efac" }}>
                    {isOut ? "💥" : "💚"}
                  </span>
                )}
                {!isOut && p.streak > 1 && <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                <span className="font-black text-lg tabular-nums shrink-0" style={{ color: isOut ? "#fca5a5" : c.score }}>
                  {p.score.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
          {board.length === 0 && (
            <div className="text-center text-white/30 font-bold py-8">No scores yet</div>
          )}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="py-4 text-center shrink-0">
          <p className="text-white/35 font-bold text-sm animate-pulse">⏳ Waiting for next question…</p>
        </motion.div>
      </div>
    );
  }

  // ── GET READY COUNTDOWN ──────────────────────────────────────────────
  if (phase === "countdown" && countdown !== null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white"
        style={{ background: "linear-gradient(135deg, #46178f 0%, #7b2ff7 100%)" }}>
        <p className="text-white/70 font-black text-2xl uppercase tracking-widest mb-6">Get Ready!</p>
        <AnimatePresence mode="wait">
          <motion.div key={countdown}
            initial={{ scale: 2.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="font-display font-black leading-none drop-shadow-2xl"
            style={{ fontSize: "14rem", color: "#ffcc02", textShadow: "0 0 60px rgba(255,204,2,0.6)" }}>
            {countdown}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── AFTER ANSWERING ──────────────────────────────────────────────────
  if (answered) {
    const correct = answerResult?.correct;
    const isBombGame = (game as any)?.gameMode === "bomb";
    const justEliminated = answerResult?.eliminated === true;

    // Bomb mode: spectating view for eliminated players on subsequent questions
    if (selfEliminated && !justEliminated) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white text-center"
          style={{ background: "linear-gradient(135deg, #1a0a00 0%, #431407 50%, #1a0a00 100%)" }}>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="flex flex-col items-center">
            <div style={{ fontSize: "6rem", lineHeight: 1 }} className="mb-4">💣</div>
            <h1 className="text-4xl font-display font-black mb-2" style={{ color: "#fca5a5" }}>You're Out!</h1>
            <p className="text-white/50 font-bold text-lg mb-8">You're spectating the remaining players</p>
            <div className="w-px h-10 bg-white/20 mb-6 animate-pulse" />
            <div className="text-6xl mb-3 animate-bounce">👀</div>
            <p className="text-white/40 font-black uppercase tracking-widest text-sm">Spectating</p>
            <p className="text-white/40 font-bold text-sm mt-2 animate-pulse">Waiting for next question...</p>
          </motion.div>
        </div>
      );
    }

    // Bomb mode: freshly eliminated on this answer
    if (isBombGame && justEliminated) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white text-center"
          style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #450a0a 100%)" }}>
          <Confetti recycle={false} numberOfPieces={80}
            colors={["#ef4444", "#b91c1c", "#fca5a5", "#ffffff"]} />
          <AnimatePresence mode="wait">
            {!answerResult ? (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <Loader2 className="w-20 h-20 animate-spin mb-6 text-white/60" />
                <h2 className="text-3xl font-black">Answer locked in!</h2>
              </motion.div>
            ) : (
              <motion.div key="elim"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 16 }}>
                <motion.div
                  animate={{ rotate: [0, -8, 8, -8, 8, 0], y: [0, -10, 0] }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  style={{ fontSize: "7rem", lineHeight: 1 }} className="mb-4">💥</motion.div>
                <h1 className="text-6xl font-display font-black mb-3" style={{ color: "#fca5a5" }}>Eliminated!</h1>
                <p className="text-white/70 font-bold text-xl mb-4">
                  Correct answer: <span className="text-white font-black">{answerResult.correctAnswer}</span>
                </p>
                {answerResult.streakProtected && (
                  <div className="flex items-center justify-center gap-2 rounded-full px-5 py-2 mb-4 mx-auto w-fit"
                    style={{ background: "rgba(59,130,246,0.25)", border: "1px solid rgba(59,130,246,0.5)", color: "#93c5fd" }}>
                    <Shield className="w-4 h-4" />
                    <span className="font-black text-base">Shield saved your streak — but not you!</span>
                  </div>
                )}
                <div className="bg-black/30 backdrop-blur rounded-3xl p-6 mt-2 space-y-2">
                  <div className="text-2xl font-black">{answerResult.totalScore.toLocaleString()} pts</div>
                  <div className="text-white/40 text-sm font-bold">Final score</div>
                </div>
                <p className="mt-6 text-white/40 font-bold animate-pulse">You can watch the remaining players...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white text-center"
        style={{ background: correct === true ? "#28a745" : correct === false ? "#c00" : "#46178f" }}>
        {correct && <Confetti recycle={false} numberOfPieces={220} colors={["#ffcc02", "#fff", "#46178f", "#e21b3c", "#1368ce"]} />}
        <AnimatePresence mode="wait">
          {!answerResult ? (
            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
              <Loader2 className="w-20 h-20 animate-spin mb-6 text-white/60" />
              <h2 className="text-3xl font-black">Answer locked in!</h2>
              <p className="text-white/60 mt-2 text-lg font-bold">Waiting for others...</p>
            </motion.div>
          ) : (
            <motion.div key="res"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 16 }}
              className="w-full max-w-xs">
              <div className="text-8xl mb-4">{correct ? "✅" : "❌"}</div>
              <h1 className="text-6xl font-display font-black mb-2">
                {correct ? "Correct!" : isBombGame ? "Wrong!" : "Wrong!"}
              </h1>
              {!correct && (
                <p className="text-white/80 font-semibold mb-4 text-lg">
                  Answer: <span className="font-black text-white">{answerResult.correctAnswer}</span>
                </p>
              )}
              {isBombGame && correct && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                  className="flex items-center justify-center gap-2 rounded-full px-5 py-2 mb-3 mx-auto w-fit"
                  style={{ background: "rgba(34,197,94,0.3)", border: "1px solid rgba(34,197,94,0.5)", color: "#86efac" }}>
                  <span className="text-lg">💚</span>
                  <span className="font-black text-base">Still alive!</span>
                </motion.div>
              )}
              {/* Power-up result badges */}
              {answerResult.streakProtected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                  className="flex items-center justify-center gap-2 rounded-full px-5 py-2 mb-3 mx-auto w-fit"
                  style={{ background: "rgba(59,130,246,0.25)", border: "1px solid rgba(59,130,246,0.5)", color: "#93c5fd" }}>
                  <Shield className="w-4 h-4" />
                  <span className="font-black text-base">Shield saved your streak!</span>
                </motion.div>
              )}
              {answerResult.doubleUsed && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                  className="flex items-center justify-center gap-2 rounded-full px-5 py-2 mb-3 mx-auto w-fit"
                  style={{ background: "rgba(234,179,8,0.25)", border: "1px solid rgba(234,179,8,0.5)", color: "#fde047" }}>
                  <Flame className="w-4 h-4" />
                  <span className="font-black text-base">2× Points!</span>
                </motion.div>
              )}
              {/* Streak badge */}
              {answerResult.streak > 1 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
                  className="flex items-center justify-center gap-2 bg-orange-500/25 border border-orange-400/50 rounded-full px-5 py-2 mb-4 mx-auto w-fit">
                  <Zap className="w-5 h-5 text-orange-300" />
                  <span className="text-orange-200 font-black text-lg">{answerResult.streak} in a row!</span>
                </motion.div>
              )}
              <div className="bg-black/25 backdrop-blur rounded-3xl p-6 mt-2 space-y-4">
                <div>
                  <span className="text-5xl font-display font-black text-yellow-300">+{answerResult.pointsEarned}</span>
                  <div className="text-white/60 text-sm font-bold uppercase tracking-wider mt-1">points this round</div>
                </div>
                {(answerResult as any).coinsEarned > 0 && (
                  <motion.div initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.2, type: "spring" }}
                    className="flex items-center justify-center gap-2 rounded-2xl px-4 py-2"
                    style={{ background: "rgba(255,204,2,0.2)", border: "1px solid rgba(255,204,2,0.5)" }}>
                    <span className="text-2xl">🪙</span>
                    <span className="text-yellow-300 font-black text-xl">+{(answerResult as any).coinsEarned} coins</span>
                  </motion.div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/15 rounded-2xl p-4">
                    <div className="text-3xl font-black">{answerResult.totalScore}</div>
                    <div className="text-white/50 text-xs font-bold uppercase flex items-center gap-1 mt-1 justify-center"><Trophy className="w-3 h-3" /> total</div>
                  </div>
                  <div className="bg-white/15 rounded-2xl p-4">
                    <div className="text-3xl font-black">#{answerResult.rank}</div>
                    <div className="text-white/50 text-xs font-bold uppercase mt-1">of {answerResult.totalPlayers}</div>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-white/60 font-bold animate-pulse">Next question coming...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── QUESTION: ADAPTIVE ANSWER BLOCKS ───────────────────────────────
  const gameMode = (game as any)?.gameMode as string | undefined;
  const isBombQ = gameMode === "bomb";
  const isClassicPlus = gameMode === "classic_plus";
  const isVolcanoMode = gameMode === "volcano";
  const isRelayMode = gameMode === "relay";
  const showQuestionOnPhone = isClassicPlus || isVolcanoMode || isRelayMode;
  const effectiveTimeLimit = isBombQ
    ? getBombTimeLimit(game?.currentQuestion ?? 1)
    : currentQ.timeLimit;
  const timerPct = effectiveTimeLimit > 0 ? (timer / effectiveTimeLimit) * 100 : 0;
  const opts = currentQ.options || [];
  const isTrueFalse = opts.length === 2 && opts[0]?.toLowerCase() === "true" && opts[1]?.toLowerCase() === "false";
  const is3 = opts.length === 3;
  const isShortAnswer = currentQ.questionType === "short_answer";
  const isAudioQ = currentQ.questionType === "audio";
  const questionAudioUrl = (currentQ as any).audioUrl as string | null | undefined;

  // Relay: is it my turn?
  const relayInfo = (game as any)?.relayInfo;
  const isMyRelayTurn = !isRelayMode || (relayInfo?.activeParticipantIds?.includes(participantId) ?? true);
  // Find my team and teammate info
  const myTeam = isRelayMode ? relayInfo?.teams?.find((t: any) => t.members?.some((m: any) => m.id === participantId)) : null;
  const myTeamActivePlayer = myTeam?.activePlayer;
  const isMyTeamActivePlayer = myTeamActivePlayer?.id === participantId;

  const isEliminated = (i: number) => eliminatedIndices.includes(i);

  const POWERUP_DEFS = [
    { key: "fifty" as const,  icon: <Scissors className="w-5 h-5" />, label: "50/50", color: "#f97316", count: powerups.fifty,  active: false },
    { key: "shield" as const, icon: <Shield  className="w-5 h-5" />, label: "Shield", color: "#3b82f6", count: powerups.shield,  active: boostActive.shield },
    { key: "double" as const, icon: <Flame   className="w-5 h-5" />, label: "2×",     color: "#eab308", count: powerups.double,  active: boostActive.double },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: isVolcanoMode ? "linear-gradient(180deg,#1a0600 0%,#3b0f07 40%,#1a0600 100%)" : "#1a1a2e" }}>
      {/* Thin timer bar */}
      <div className="h-2.5 bg-black/40 flex-shrink-0">
        <motion.div className="h-full"
          animate={{ width: `${timerPct}%`, backgroundColor: isVolcanoMode ? (timerPct > 50 ? "#f97316" : timerPct > 25 ? "#ef4444" : "#dc2626") : (timerPct > 50 ? "#52c41a" : timerPct > 25 ? "#faad14" : "#ff4d4f") }}
          transition={{ duration: 0.9 }} />
      </div>

      {/* Tiny status bar */}
      <div className="bg-black/70 px-4 py-1.5 flex items-center justify-between text-xs font-black text-white/70 flex-shrink-0">
        {isBombQ ? (
          <span className="text-orange-400">💣 Bomb Mode — wrong answer = out!</span>
        ) : isVolcanoMode ? (
          <span className="text-red-400">🌋 Volcano Mode</span>
        ) : isClassicPlus ? (
          <span className="text-sky-400">📱 Classic+</span>
        ) : isRelayMode ? (
          <span style={{ color: myTeam?.color ?? "#a78bfa" }}>🏁 {myTeam?.name ?? "Relay"}{isMyTeamActivePlayer ? " — YOUR TURN! 🎯" : ""}</span>
        ) : (
          <span>👀 Look at the screen!</span>
        )}
        <span className={timer <= 5 && timer > 0 ? "text-red-400 animate-pulse" : ""}>{timer}s</span>
      </div>

      {/* Question text card — Classic+, Volcano, Relay, short_answer, audio */}
      {(showQuestionOnPhone || isShortAnswer || isAudioQ) && (
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0 px-4 py-3"
          style={{
            background: isVolcanoMode
              ? "rgba(220,38,38,0.12)"
              : isRelayMode
              ? `${myTeam?.color ?? "#6d28d9"}22`
              : "rgba(56,189,248,0.1)",
            borderBottom: `1px solid ${isVolcanoMode ? "rgba(220,38,38,0.25)" : isRelayMode ? `${myTeam?.color ?? "#6d28d9"}44` : "rgba(56,189,248,0.2)"}`,
          }}>
          <p className="text-white font-black text-center text-base md:text-lg leading-snug">
            {(currentQ as any).questionText}
          </p>
        </motion.div>
      )}

      {/* Audio player — audio question type */}
      {isAudioQ && questionAudioUrl && (
        <div className="flex-shrink-0 px-4 py-3 flex flex-col items-center gap-2"
          style={{ background: "rgba(123,47,247,0.15)", borderBottom: "1px solid rgba(123,47,247,0.3)" }}>
          <div className="text-white/60 text-xs font-black uppercase tracking-widest">🎵 Listen carefully</div>
          <audio controls autoPlay src={questionAudioUrl} className="w-full max-w-sm" />
        </div>
      )}

      {/* Active boost banner */}
      <AnimatePresence>
        {(boostActive.shield || boostActive.double) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center gap-3 py-1.5 text-xs font-black flex-shrink-0"
            style={{ background: boostActive.double ? "rgba(234,179,8,0.2)" : "rgba(59,130,246,0.2)" }}>
            {boostActive.shield && <><Shield className="w-3.5 h-3.5 text-blue-400" /><span className="text-blue-300">Shield active</span></>}
            {boostActive.double && <><Flame className="w-3.5 h-3.5 text-yellow-400" /><span className="text-yellow-300">2× Points active</span></>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Relay: not my turn — waiting screen */}
      {isRelayMode && !isMyRelayTurn && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-white text-center">
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="mb-4 select-none" style={{ fontSize: "5rem" }}>
            📣
          </motion.div>
          <h2 className="text-3xl font-display font-black mb-2" style={{ color: myTeam?.color ?? "#a78bfa" }}>
            {myTeam?.name ?? "Your Team"}
          </h2>
          <p className="text-white/60 font-bold text-lg mb-6">
            {myTeamActivePlayer ? (
              <><span className="text-white font-black">{myTeamActivePlayer.nickname}</span> is answering…</>
            ) : "Waiting for teammate…"}
          </p>
          <div className="text-white/40 text-sm font-bold">Your turn comes next! 🎯</div>
          <div className="mt-4 text-2xl font-black" style={{ color: myTeam?.color ?? "#a78bfa" }}>
            Team Score: {myTeam?.score?.toLocaleString() ?? "0"}
          </div>
        </div>
      )}

      {/* Free text answer (short_answer type) */}
      {!isRelayMode || isMyRelayTurn ? (
        isShortAnswer ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <div className="text-white/50 text-xs font-black uppercase tracking-widest">Type your answer</div>
            <div className="w-full max-w-md">
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && textInput.trim()) { e.preventDefault(); handleAnswer(textInput.trim(), 0); } }}
                placeholder="Type your answer here…"
                rows={3}
                disabled={answered}
                className="w-full p-4 rounded-2xl text-white text-lg font-bold resize-none outline-none border-2 border-purple-500/40 focus:border-purple-400 transition-all"
                style={{ background: "rgba(123,47,247,0.15)" }}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={!textInput.trim() || answered}
              onClick={() => textInput.trim() && handleAnswer(textInput.trim(), 0)}
              className="px-10 py-4 rounded-2xl font-black text-xl transition-all"
              style={{
                background: textInput.trim() && !answered ? "#7b2ff7" : "rgba(255,255,255,0.1)",
                color: textInput.trim() && !answered ? "#fff" : "rgba(255,255,255,0.3)",
                boxShadow: textInput.trim() && !answered ? "0 4px 20px rgba(123,47,247,0.5)" : "none",
              }}>
              {answered ? "✓ Submitted" : "Submit →"}
            </motion.button>
            <div className="text-white/30 text-xs font-bold">AI will grade your answer</div>
          </div>
        ) : null
      ) : null}

      {/* Answer blocks — adaptive layout (MC and audio types) */}
      {(!isRelayMode || isMyRelayTurn) && !isShortAnswer && (isTrueFalse ? (
        <div className="flex-1 grid grid-cols-2" style={{ gap: "3px", background: "#111" }}>
          {TF_BLOCKS.map((b, i) => (
            <motion.button key={i} whileTap={{ scale: 0.96 }}
              onClick={() => !isEliminated(i) && handleAnswer(opts[i], i)}
              disabled={isEliminated(i)}
              className="flex flex-col items-center justify-center gap-3 select-none relative"
              style={{ background: isEliminated(i) ? "#222" : b.bg, boxShadow: isEliminated(i) ? "none" : `inset 0 -8px 0 0 ${b.shadow}`, opacity: isEliminated(i) ? 0.3 : 1 }}>
              <span className="font-black leading-none drop-shadow-lg" style={{ fontSize: "6rem" }}>{b.shape}</span>
              <span className="text-white font-display font-black text-3xl md:text-4xl tracking-widest drop-shadow-md">{b.label}</span>
            </motion.button>
          ))}
        </div>
      ) : is3 ? (
        <div className="flex-1 flex flex-col" style={{ gap: "3px", background: "#111" }}>
          <div className="flex flex-1" style={{ gap: "3px" }}>
            {opts.slice(0, 2).map((opt, i) => {
              const b = BLOCKS[i];
              const elim = isEliminated(i);
              return (
                <motion.button key={i} whileTap={{ scale: 0.96 }}
                  onClick={() => !elim && handleAnswer(opt, i)}
                  disabled={elim}
                  className="flex-1 flex flex-col items-center justify-center gap-2 select-none"
                  style={{ background: elim ? "#222" : b.bg, boxShadow: elim ? "none" : `inset 0 -6px 0 0 ${b.shadow}`, opacity: elim ? 0.3 : 1 }}>
                  <span className="text-5xl md:text-7xl drop-shadow-lg leading-none">{b.shape}</span>
                  <span className="text-white font-display font-black text-lg md:text-2xl text-center px-3 leading-tight drop-shadow-md">{opt}</span>
                </motion.button>
              );
            })}
          </div>
          {(() => {
            const elim = isEliminated(2);
            return (
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={() => !elim && handleAnswer(opts[2], 2)}
                disabled={elim}
                className="flex flex-col items-center justify-center gap-2 select-none py-8"
                style={{ background: elim ? "#222" : BLOCKS[2].bg, boxShadow: elim ? "none" : `inset 0 -6px 0 0 ${BLOCKS[2].shadow}`, opacity: elim ? 0.3 : 1 }}>
                <span className="text-5xl md:text-7xl drop-shadow-lg leading-none">{BLOCKS[2].shape}</span>
                <span className="text-white font-display font-black text-lg md:text-2xl text-center px-3 leading-tight drop-shadow-md">{opts[2]}</span>
              </motion.button>
            );
          })()}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 grid-rows-2" style={{ gap: "3px", background: "#111" }}>
          {opts.map((opt, i) => {
            const b = BLOCKS[i] || BLOCKS[0];
            const elim = isEliminated(i);
            return (
              <motion.button key={i} whileTap={{ scale: 0.96, opacity: 0.85 }}
                onClick={() => !elim && handleAnswer(opt, i)}
                disabled={elim}
                className="flex flex-col items-center justify-center gap-2 relative overflow-hidden select-none"
                style={{ background: elim ? "#222" : b.bg, boxShadow: elim ? "none" : `inset 0 -6px 0 0 ${b.shadow}`, opacity: elim ? 0.3 : 1 }}>
                <span className="text-6xl md:text-8xl drop-shadow-lg select-none leading-none">{b.shape}</span>
                <span className="text-white font-display font-black text-xl md:text-2xl text-center px-3 leading-tight drop-shadow-md">{opt}</span>
              </motion.button>
            );
          })}
        </div>
      ))}

      {/* Power-up bar */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 px-4 py-3"
        style={{ background: "rgba(0,0,0,0.6)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {POWERUP_DEFS.map(pu => (
          <motion.button
            key={pu.key}
            whileTap={{ scale: 0.9 }}
            disabled={pu.count <= 0 || powerupMut.isPending}
            onClick={() => pu.count > 0 && powerupMut.mutate(pu.key)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl font-black text-xs transition-all relative"
            style={{
              background: pu.active ? `${pu.color}33` : pu.count <= 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
              border: `2px solid ${pu.count <= 0 ? "rgba(255,255,255,0.1)" : pu.active ? pu.color : `${pu.color}80`}`,
              color: pu.count <= 0 ? "rgba(255,255,255,0.2)" : pu.color,
              boxShadow: pu.active ? `0 0 12px ${pu.color}55` : "none",
              opacity: pu.count <= 0 ? 0.4 : 1,
            }}>
            {pu.icon}
            <span>{pu.label}</span>
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center"
              style={{ background: pu.count > 0 ? pu.color : "#555", color: "#fff" }}>{pu.count}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
