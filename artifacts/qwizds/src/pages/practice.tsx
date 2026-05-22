import { useRoute, Link } from "wouter";
import { useGetQuiz } from "@workspace/api-client-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Zap, Home, RotateCcw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/contexts/SoundContext";
import Confetti from "react-confetti";

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

type Phase = "intro" | "countdown" | "question" | "reveal" | "finish";
type AnswerLog = { questionText: string; correct: boolean; myAnswer: string; correctAnswer: string; pts: number };

function calcPoints(timeSpent: number, timeLimit: number, streak: number): number {
  const base = Math.max(500, Math.round(1000 * (1 - 0.5 * (timeSpent / timeLimit))));
  const bonus = Math.min(200, streak * 50);
  return base + bonus;
}

function useWindowSize() {
  const [s, setS] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const h = () => setS({ w: window.innerWidth, h: window.innerHeight });
    h(); window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return s;
}

export default function PracticePage() {
  const [, params] = useRoute("/practice/:id");
  const id = parseInt(params?.id || "0");
  const { data: quiz, isLoading } = useGetQuiz(id);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060612" }}>
      <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
    </div>
  );
  if (!quiz) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060612" }}>
      <p className="text-white text-xl font-bold">Quiz not found</p>
    </div>
  );

  return <PracticeGame quiz={quiz} />;
}

function PracticeGame({ quiz }: { quiz: any }) {
  const questions = (quiz.questions || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex);
  const { playTick, playCorrect, playWrong, playCountdownEnd, startGameMusic, stopGameMusic } = useSound();
  const { w, h } = useWindowSize();

  const [phase, setPhase]       = useState<Phase>("intro");
  const [qIdx, setQIdx]         = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [timer, setTimer]       = useState(0);
  const [score, setScore]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [logs, setLogs]         = useState<AnswerLog[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const startTimeRef = useRef(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickFired    = useRef(false);

  const currentQ = questions[qIdx];
  const isTF = currentQ?.questionType === "true_false";
  const blocks = isTF ? TF_BLOCKS : BLOCKS;

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countRef.current) clearInterval(countRef.current);
  };

  const startQuestion = useCallback(() => {
    setPhase("countdown");
    setCountdown(3);
    setSelected(null);
    setPointsEarned(0);
    tickFired.current = false;

    let c = 3;
    countRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countRef.current!);
        const tl = currentQ?.timeLimit || 20;
        setTimer(tl);
        setPhase("question");
        startTimeRef.current = Date.now();
        tickFired.current = false;

        timerRef.current = setInterval(() => {
          setTimer(t => {
            const next = t - 1;
            if (next <= 10 && next > 0) playTick();
            if (next <= 0) {
              clearInterval(timerRef.current!);
              playCountdownEnd();
              revealAnswer(null, tl);
              return 0;
            }
            return next;
          });
        }, 1000);
      }
    }, 900);
  }, [qIdx, currentQ]);

  const revealAnswer = useCallback((ans: string | null, overrideTL?: number) => {
    clearTimers();
    setPhase("reveal");
    const tl = overrideTL ?? currentQ?.timeLimit ?? 20;
    const timeSpent = Math.min(tl, (Date.now() - startTimeRef.current) / 1000);
    const correct = ans === currentQ?.correctAnswer;

    let pts = 0;
    if (correct && ans !== null) {
      pts = calcPoints(timeSpent, tl, streak);
      setScore(s => s + pts);
      setStreak(s => { const ns = s + 1; setMaxStreak(m => Math.max(m, ns)); return ns; });
      playCorrect();
    } else {
      setStreak(0);
      if (ans !== null) playWrong();
    }
    setPointsEarned(pts);
    setLogs(l => [...l, {
      questionText: currentQ.questionText,
      correct,
      myAnswer: ans ?? "(no answer)",
      correctAnswer: currentQ.correctAnswer,
      pts,
    }]);

    setTimeout(() => {
      if (qIdx + 1 >= questions.length) {
        setPhase("finish");
        stopGameMusic();
        setShowConfetti(true);
      } else {
        setQIdx(i => i + 1);
        startQuestion();
      }
    }, 2200);
  }, [currentQ, streak, qIdx, questions.length, playCorrect, playWrong, stopGameMusic]);

  const handleAnswer = (opt: string) => {
    if (phase !== "question" || selected) return;
    setSelected(opt);
    revealAnswer(opt);
  };

  useEffect(() => {
    return () => { clearTimers(); stopGameMusic(); };
  }, []);

  const accuracy = logs.length > 0 ? Math.round((logs.filter(l => l.correct).length / logs.length) * 100) : 0;
  const stars = accuracy >= 100 ? 3 : accuracy >= 70 ? 2 : accuracy >= 40 ? 1 : 0;

  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white"
        style={{ background: "linear-gradient(135deg, #060612 0%, #1a0533 50%, #46178f 100%)" }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-lg">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-4xl md:text-5xl font-display font-black mb-2">{quiz.title}</h1>
          <p className="text-white/50 font-semibold mb-2">{questions.length} questions • Solo Practice</p>
          {quiz.description && <p className="text-white/40 text-sm mb-8">{quiz.description}</p>}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => { startGameMusic(); startQuestion(); }}
              className="h-16 px-12 text-xl font-black rounded-2xl"
              style={{ background: "#ffcc02", color: "#111" }}>
              ▶ Start Practice
            </Button>
            <Link href={`/quizzes/${quiz.id}`}>
              <Button variant="outline" className="h-16 px-8 text-lg font-black rounded-2xl border-white/30 text-white">
                ← Back
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "finish") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white"
        style={{ background: "linear-gradient(135deg, #1a0533 0%, #46178f 60%, #7b2ff7 100%)" }}>
        {showConfetti && <Confetti width={w} height={h} recycle={false} numberOfPieces={400}
          colors={["#ffcc02", "#fff", "#e21b3c", "#1368ce", "#26890c", "#a855f7"]} />}
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }} className="text-center max-w-md">
          <div className="text-7xl mb-4">🏆</div>
          <h1 className="text-5xl font-display font-black mb-1"
            style={{ background: "linear-gradient(90deg,#ffcc02,#fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {score.toLocaleString()} pts
          </h1>
          <div className="flex justify-center gap-1 my-4">
            {[1, 2, 3].map(i => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: i * 0.2, type: "spring" }}>
                <Star className="w-10 h-10" fill={i <= stars ? "#ffcc02" : "none"} stroke={i <= stars ? "#ffcc02" : "#ffffff40"} />
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-8 mt-6">
            {[
              { label: "Accuracy", value: `${accuracy}%` },
              { label: "Best Streak", value: `${maxStreak}🔥` },
              { label: "Correct", value: `${logs.filter(l => l.correct).length}/${logs.length}` },
            ].map((s, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="rounded-2xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div className="text-xl font-black">{s.value}</div>
                <div className="text-xs font-bold text-white/50 mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto mb-6 rounded-2xl"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {logs.map((l, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm border-b border-white/5 last:border-0">
                <span className="text-lg">{l.correct ? "✅" : "❌"}</span>
                <span className="flex-1 truncate text-left font-medium text-white/80">{l.questionText}</span>
                {l.correct && <span className="font-black text-yellow-300 text-xs">+{l.pts}</span>}
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard">
              <Button className="h-14 px-8 font-black rounded-2xl" style={{ background: "#ffcc02", color: "#111" }}>
                <Home className="w-5 h-5 mr-2" /> Home
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.location.reload()}
              className="h-14 px-8 font-black rounded-2xl border-white/30 text-white">
              <RotateCcw className="w-5 h-5 mr-2" /> Again
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const maxTime = currentQ?.timeLimit || 20;
  const pct = maxTime > 0 ? timer / maxTime : 0;
  const timerColor = pct > 0.5 ? "#52c41a" : pct > 0.25 ? "#faad14" : "#ff4d4f";

  return (
    <div className="min-h-screen flex flex-col text-white select-none"
      style={{ background: "linear-gradient(135deg, #46178f 0%, #7b2ff7 100%)" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "rgba(0,0,0,0.35)" }}>
        <div className="flex items-center gap-3">
          <div className="text-sm font-black text-white/60">{qIdx + 1}/{questions.length}</div>
          <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((qIdx) / questions.length) * 100}%`, background: "#ffcc02" }} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {streak > 1 && (
            <motion.div key={streak} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              className="flex items-center gap-1 px-3 py-1 rounded-full font-black text-sm"
              style={{ background: "rgba(249,115,22,0.25)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.4)" }}>
              <Zap className="w-3.5 h-3.5" />{streak}🔥
            </motion.div>
          )}
          <div className="font-display font-black text-2xl" style={{ color: "#ffcc02" }}>
            {score.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(70,23,143,0.85)", backdropFilter: "blur(6px)" }}>
            <div className="text-9xl font-display font-black" style={{ color: "#ffcc02", textShadow: "0 0 60px rgba(255,204,2,0.8)" }}>
              {countdown > 0 ? countdown : "GO!"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question card + timer */}
      <div className="flex-1 flex flex-col p-4 gap-4 max-w-3xl w-full mx-auto">
        <div className="flex items-stretch gap-4">
          <AnimatePresence mode="wait">
            <motion.div key={qIdx} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260 }}
              className="flex-1 bg-white text-gray-900 rounded-3xl shadow-2xl overflow-hidden">
              {currentQ?.imageUrl && (
                <img src={currentQ.imageUrl} alt="" className="w-full max-h-48 object-cover" />
              )}
              <div className="px-8 py-6 flex items-center justify-center min-h-[90px]">
                <h2 className="text-2xl md:text-4xl font-display font-black text-center leading-tight">
                  {currentQ?.questionText}
                </h2>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Timer ring */}
          <div className="flex flex-col items-center justify-center shrink-0 gap-1">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
                <circle cx="40" cy="40" r="34" fill="none"
                  stroke={phase === "reveal" ? "rgba(255,255,255,0.2)" : timerColor}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={phase === "reveal" ? 2 * Math.PI * 34 : 2 * Math.PI * 34 * (1 - pct)}
                  style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-display font-black text-xl tabular-nums ${pct < 0.25 && phase === "question" ? "text-red-400 animate-pulse" : "text-white"}`}>
                  {phase === "reveal" ? "✓" : timer}
                </span>
              </div>
            </div>
            <span className="text-white/40 text-xs font-bold">sec</span>
          </div>
        </div>

        {/* Answer blocks */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {(isTF ? TF_BLOCKS : BLOCKS.slice(0, currentQ?.options?.length || 4)).map((b: any, i: number) => {
            const opt = isTF ? b.label : currentQ?.options?.[i];
            if (!opt) return null;
            const isSelected = selected === opt;
            const isCorrect  = opt === currentQ?.correctAnswer;
            const showResult = phase === "reveal";

            let bg = b.bg;
            if (showResult) {
              if (isCorrect) bg = "#22c55e";
              else if (isSelected && !isCorrect) bg = "#374151";
              else bg = `${b.bg}55`;
            }

            return (
              <motion.button key={i}
                onClick={() => handleAnswer(opt)}
                disabled={phase !== "question"}
                whileHover={phase === "question" ? { scale: 1.03 } : {}}
                whileTap={phase === "question" ? { scale: 0.97 } : {}}
                animate={showResult && isCorrect ? { scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="relative rounded-2xl overflow-hidden flex items-center font-display font-black text-white cursor-pointer select-none transition-all duration-300 shadow-lg"
                style={{
                  background: bg,
                  boxShadow: showResult && isCorrect ? `0 0 30px ${b.bg}80` : undefined,
                  minHeight: 70,
                  opacity: showResult && !isCorrect && !isSelected ? 0.45 : 1,
                }}>
                <div className="w-14 shrink-0 flex items-center justify-center text-2xl h-full self-stretch"
                  style={{ background: "rgba(0,0,0,0.2)", minHeight: 70 }}>
                  {showResult && isCorrect ? "✓" : showResult && isSelected && !isCorrect ? "✗" : b.shape}
                </div>
                <span className="flex-1 px-4 text-base md:text-xl leading-tight text-center">{opt}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Points earned animation */}
      <AnimatePresence>
        {phase === "reveal" && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none">
            {pointsEarned > 0 ? (
              <div className="px-8 py-4 rounded-3xl shadow-2xl font-display"
                style={{ background: "rgba(34,197,94,0.95)", border: "2px solid rgba(255,255,255,0.3)" }}>
                <div className="text-4xl font-black text-white">+{pointsEarned.toLocaleString()}</div>
                <div className="text-white/80 font-bold text-sm mt-0.5">
                  {streak > 1 ? `${streak}× Streak bonus!` : "Correct!"}
                </div>
              </div>
            ) : selected !== null ? (
              <div className="px-8 py-4 rounded-3xl shadow-2xl font-display"
                style={{ background: "rgba(239,68,68,0.9)", border: "2px solid rgba(255,255,255,0.2)" }}>
                <div className="text-2xl font-black text-white">Wrong!</div>
                <div className="text-white/80 text-sm mt-0.5">Answer: {currentQ?.correctAnswer}</div>
              </div>
            ) : (
              <div className="px-8 py-4 rounded-3xl shadow-2xl font-display"
                style={{ background: "rgba(100,100,100,0.9)" }}>
                <div className="text-2xl font-black text-white">Time's up!</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
