import { useRoute, Link } from "wouter";
import { useGetQuiz } from "@workspace/api-client-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Flame, Home, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/contexts/SoundContext";
import { useFullscreen } from "@/lib/use-fullscreen";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const BLOCKS = [
  { bg: "#e21b3c", shape: "▲" },
  { bg: "#1368ce", shape: "♦" },
  { bg: "#26890c", shape: "■" },
  { bg: "#d89e00", shape: "●" },
];

const TF_BLOCKS = [
  { bg: "#26890c", shape: "✓", label: "TRUE" },
  { bg: "#e21b3c", shape: "✗", label: "FALSE" },
];

const MAX_WRONG = 5;
type Phase = "intro" | "countdown" | "question" | "reveal" | "erupting" | "win" | "lose";

function VolcanoSVG({ lavaLevel, erupting }: { lavaLevel: number; erupting: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Night sky */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #0a0518 0%, #1a0a3a 40%, #2d1a0a 75%, #1a0a00 100%)"
      }} />

      {/* Stars */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            width: Math.random() * 2.5 + 0.5,
            height: Math.random() * 2.5 + 0.5,
            left: `${(i * 37 + 7) % 100}%`,
            top: `${(i * 23 + 5) % 55}%`,
            background: "white",
            opacity: 0.4 + (i % 5) * 0.12,
          }} />
      ))}

      {/* Moon */}
      <div className="absolute top-6 right-16 w-14 h-14 rounded-full opacity-70"
        style={{ background: "#fffde0", boxShadow: "0 0 24px 8px rgba(255,253,200,0.3)" }} />

      {/* Smoke puffs above volcano */}
      {erupting && Array.from({ length: 4 }).map((_, i) => (
        <motion.div key={i}
          initial={{ y: 0, opacity: 0.7, scale: 0.5 }}
          animate={{ y: -180, opacity: 0, scale: 2.5 + i * 0.5 }}
          transition={{ duration: 1.4 + i * 0.3, delay: i * 0.15, ease: "easeOut" }}
          className="absolute rounded-full"
          style={{
            width: 60 + i * 20,
            height: 60 + i * 20,
            left: `calc(50% - ${30 + i * 10}px + ${(i % 2 === 0 ? -1 : 1) * i * 15}px)`,
            bottom: "38%",
            background: "rgba(200,100,20,0.5)",
            filter: "blur(8px)",
          }} />
      ))}

      {/* Eruption particles */}
      {erupting && Array.from({ length: 14 }).map((_, i) => (
        <motion.div key={`p${i}`}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (i % 2 === 0 ? -1 : 1) * (40 + Math.random() * 120),
            y: -(120 + Math.random() * 200),
            opacity: 0, scale: 0.3
          }}
          transition={{ duration: 0.9 + Math.random() * 0.5, ease: "easeOut" }}
          className="absolute rounded-full"
          style={{
            width: 10 + (i % 4) * 5,
            height: 10 + (i % 4) * 5,
            left: `calc(50% - 5px)`,
            bottom: "39%",
            background: i % 3 === 0 ? "#ff6600" : i % 3 === 1 ? "#ffcc00" : "#ff3300",
          }} />
      ))}

      {/* Volcano body */}
      <svg className="absolute bottom-0 left-1/2 -translate-x-1/2" width="360" height="260" viewBox="0 0 360 260">
        {/* Main volcano shape */}
        <polygon points="180,20 20,260 340,260" fill="#2a1505" />
        <polygon points="180,20 30,260 330,260" fill="#3d1f07" />
        {/* Crater */}
        <ellipse cx="180" cy="28" rx="32" ry="12" fill="#1a0a03" />
        {/* Glowing lava in crater */}
        <ellipse cx="180" cy="30" rx="22" ry="7" fill="#ff4500" opacity="0.8">
          <animate attributeName="opacity" values="0.6;0.95;0.6" dur="1.2s" repeatCount="indefinite" />
        </ellipse>
        {/* Rock texture lines */}
        <line x1="120" y1="80" x2="60" y2="260" stroke="#4a2a0a" strokeWidth="1.5" opacity="0.4" />
        <line x1="200" y1="60" x2="280" y2="260" stroke="#4a2a0a" strokeWidth="1.5" opacity="0.4" />
        <line x1="160" y1="100" x2="100" y2="260" stroke="#4a2a0a" strokeWidth="1" opacity="0.3" />
      </svg>

      {/* Lava fill rising from bottom */}
      <motion.div
        animate={{ height: `${lavaLevel}%` }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="absolute bottom-0 left-0 right-0"
        style={{
          background: "linear-gradient(0deg, #7f1d1d 0%, #dc2626 25%, #ea580c 55%, #f97316 80%, #fb923c 100%)",
          opacity: 0.82,
        }}>
        {/* Lava surface glow */}
        <div className="absolute top-0 left-0 right-0 h-8" style={{
          background: "linear-gradient(180deg, rgba(251,191,36,0.6) 0%, transparent 100%)",
        }} />
        {/* Lava bubbles */}
        {lavaLevel > 5 && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: 14 + i * 8,
              height: 14 + i * 8,
              left: `${15 + i * 16}%`,
              top: `${5 + (i % 3) * 8}px`,
              background: "rgba(254,240,138,0.6)",
              animation: `pulse ${1 + i * 0.3}s ease-in-out infinite`,
            }} />
        ))}
      </motion.div>

      {/* Lava overflow: full screen cover on lose */}
      {lavaLevel >= 100 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(220,38,38,0.0) 0%, rgba(220,38,38,0.95) 100%)" }} />
      )}
    </div>
  );
}

export default function VolcanoPage() {
  const [, params] = useRoute("/volcano/:id");
  const id = parseInt(params?.id || "0");
  const { data: quiz, isLoading } = useGetQuiz(id);
  const { isFullscreen, toggle } = useFullscreen();

  const fsBtn = (
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
  );

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0518" }}>
      <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      {fsBtn}
    </div>
  );
  if (!quiz) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0518" }}>
      <p className="text-white text-xl font-bold">Quiz not found</p>
      {fsBtn}
    </div>
  );
  return (
    <>
      <VolcanoGame quiz={quiz} />
      {fsBtn}
    </>
  );
}

function VolcanoGame({ quiz }: { quiz: any }) {
  const questions = (quiz.questions || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex);
  const { playTick, playCorrect, playWrong, playCountdownEnd } = useSound();

  const [phase, setPhase]     = useState<Phase>("intro");
  const [qIdx, setQIdx]       = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [timer, setTimer]     = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [lavaLevel, setLavaLevel]   = useState(0);
  const [erupting, setErupting]     = useState(false);
  const [selected, setSelected]     = useState<string | null>(null);
  const [shake, setShake]     = useState(false);
  const [score, setScore]     = useState(0);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  // Refs to always-fresh state so interval callbacks never go stale
  const wrongCountRef   = useRef(0);
  const qIdxRef         = useRef(0);
  const revealRef       = useRef<(ans: string | null, overrideTL?: number) => void>(() => {});
  const startRef        = useRef<() => void>(() => {});

  // Keep refs in sync with state
  wrongCountRef.current = wrongCount;
  qIdxRef.current       = qIdx;

  const currentQ = questions[qIdx];
  const isTF = currentQ?.questionType === "true_false";

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countRef.current) clearInterval(countRef.current);
  };

  const startQuestion = useCallback(() => {
    const q = questions[qIdxRef.current];
    setPhase("countdown");
    setCountdown(3);
    setSelected(null);
    let c = 3;
    countRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countRef.current!);
        const tl = q?.timeLimit || 20;
        setTimer(tl);
        setPhase("question");
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setTimer(t => {
            const next = t - 1;
            if (next <= 10 && next > 0) playTick();
            if (next <= 0) {
              clearInterval(timerRef.current!);
              playCountdownEnd();
              revealRef.current(null, tl);  // always call latest revealAnswer
              return 0;
            }
            return next;
          });
        }, 1000);
      }
    }, 900);
  }, [questions, playTick, playCountdownEnd]);

  const revealAnswer = useCallback((ans: string | null, overrideTL?: number) => {
    clearTimers();
    setPhase("reveal");
    const q   = questions[qIdxRef.current];
    const tl  = overrideTL ?? q?.timeLimit ?? 20;
    const timeSpent = Math.min(tl, (Date.now() - startTimeRef.current) / 1000);
    const correct   = ans === q?.correctAnswer;

    if (correct && ans !== null) {
      const pts = Math.max(500, Math.round(1000 * (1 - 0.5 * (timeSpent / tl))));
      setScore(s => s + pts);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      playCorrect();
      setTimeout(() => {
        if (qIdxRef.current + 1 >= questions.length) {
          setPhase("win");
        } else {
          setQIdx(i => i + 1);
          qIdxRef.current += 1;
          startRef.current();  // always call latest startQuestion
        }
      }, 2000);
    } else {
      playWrong();
      const newWrong = wrongCountRef.current + 1;  // read from ref, never stale
      setWrongCount(newWrong);
      wrongCountRef.current = newWrong;
      setLavaLevel(l => Math.min(100, l + 100 / MAX_WRONG));
      setErupting(true);
      setPhase("erupting");
      setTimeout(() => {
        setErupting(false);
        if (newWrong >= MAX_WRONG) {
          setLavaLevel(100);
          setTimeout(() => setPhase("lose"), 1000);
        } else {
          if (qIdxRef.current + 1 >= questions.length) {
            setPhase("win");
          } else {
            setQIdx(i => i + 1);
            qIdxRef.current += 1;
            startRef.current();  // always call latest startQuestion
          }
        }
      }, 2200);
    }
  }, [questions, playCorrect, playWrong]);

  // Keep refs pointing to latest function versions
  revealRef.current = revealAnswer;
  startRef.current  = startQuestion;

  const handleAnswer = (opt: string) => {
    if (phase !== "question" || selected) return;
    setSelected(opt);
    revealAnswer(opt);
  };

  useEffect(() => () => clearTimers(), []);

  const maxTime = currentQ?.timeLimit || 20;
  const timerPct = maxTime > 0 ? timer / maxTime : 0;

  if (phase === "intro") {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6 text-white">
        <VolcanoSVG lavaLevel={3} erupting={false} />
        <div className="relative z-10 text-center max-w-md">
          <div className="text-6xl mb-3">🌋</div>
          <h1 className="text-4xl md:text-5xl font-display font-black mb-2"
            style={{ textShadow: "0 0 30px rgba(249,115,22,0.8)" }}>
            Volcano Mode
          </h1>
          <h2 className="text-xl font-bold mb-1 text-orange-300">{quiz.title}</h2>
          <p className="text-white/50 text-sm mb-2">{questions.length} questions</p>
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: MAX_WRONG }).map((_, i) => (
              <Flame key={i} className="w-7 h-7 text-orange-500" />
            ))}
            <span className="text-white/60 text-sm ml-2 font-bold">{MAX_WRONG} wrong = eruption!</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={startQuestion}
              className="h-16 px-12 text-xl font-black rounded-2xl"
              style={{ background: "linear-gradient(135deg,#dc2626,#f97316)", color: "#fff", boxShadow: "0 0 30px rgba(220,38,38,0.5)" }}>
              🌋 Enter Volcano
            </Button>
            <Link href={`/quizzes/${quiz.id}`}>
              <Button variant="outline" className="h-16 px-8 text-lg font-black rounded-2xl border-orange-500/40 text-white">
                ← Back
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "win") {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6 text-white">
        <VolcanoSVG lavaLevel={lavaLevel} erupting={false} />
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center max-w-md">
          <div className="text-7xl mb-4">🏆</div>
          <h1 className="text-5xl font-display font-black mb-2" style={{ color: "#ffcc02", textShadow: "0 0 40px rgba(255,204,2,0.6)" }}>
            Survived!
          </h1>
          <p className="text-orange-300 font-bold text-xl mb-1">{score.toLocaleString()} pts</p>
          <p className="text-white/60 mb-8">
            {wrongCount === 0 ? "Perfect — not a single eruption! 🔥" : `${wrongCount} eruption${wrongCount > 1 ? "s" : ""} survived`}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard">
              <Button className="h-14 px-8 font-black rounded-2xl" style={{ background: "#ffcc02", color: "#111" }}>
                <Home className="w-5 h-5 mr-2" /> Home
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.location.reload()}
              className="h-14 px-8 font-black rounded-2xl border-orange-400/40 text-white">
              <RotateCcw className="w-5 h-5 mr-2" /> Try Again
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "lose") {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6 text-white">
        <VolcanoSVG lavaLevel={100} erupting={false} />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 text-center max-w-md">
          <div className="text-7xl mb-4">💀</div>
          <h1 className="text-5xl font-display font-black mb-2" style={{ color: "#ff4444", textShadow: "0 0 40px rgba(255,68,68,0.8)" }}>
            Consumed!
          </h1>
          <p className="text-white/60 mb-2">The lava got you after {wrongCount} wrong answers</p>
          <p className="text-orange-300 font-bold text-xl mb-8">{score.toLocaleString()} pts rescued</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard">
              <Button className="h-14 px-8 font-black rounded-2xl" style={{ background: "#dc2626", color: "#fff" }}>
                <Home className="w-5 h-5 mr-2" /> Escape
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.location.reload()}
              className="h-14 px-8 font-black rounded-2xl border-red-500/40 text-white">
              <RotateCcw className="w-5 h-5 mr-2" /> Try Again
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.5 }}
      className="min-h-screen relative flex flex-col text-white select-none">
      <VolcanoSVG lavaLevel={lavaLevel} erupting={erupting} />

      {/* HUD */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
        <div className="flex items-center gap-2">
          {Array.from({ length: MAX_WRONG }).map((_, i) => (
            <Flame key={i} className={`w-6 h-6 transition-all ${i < wrongCount ? "text-red-600 opacity-40" : "text-orange-500"}`} />
          ))}
        </div>
        <div className="text-sm font-black text-white/60">{qIdx + 1}/{questions.length}</div>
        <div className="font-display font-black text-xl" style={{ color: "#ffcc02" }}>{score.toLocaleString()}</div>
      </div>

      {/* Countdown */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div key={countdown} initial={{ scale: 2.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
            <div className="text-9xl font-display font-black" style={{ color: "#f97316", textShadow: "0 0 60px rgba(249,115,22,0.9)" }}>
              {countdown > 0 ? countdown : "GO!"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question + answers */}
      <div className="relative z-10 flex-1 flex flex-col p-4 gap-4 max-w-3xl w-full mx-auto">
        <div className="flex gap-4 items-stretch">
          <motion.div key={qIdx} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="flex-1 rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: "rgba(0,0,0,0.7)", border: "2px solid rgba(249,115,22,0.3)", backdropFilter: "blur(8px)" }}>
            {currentQ?.imageUrl && (
              <img src={currentQ.imageUrl} alt="" className="w-full max-h-40 object-cover" />
            )}
            <div className="px-6 py-5 flex items-center justify-center min-h-[80px]">
              <h2 className="text-xl md:text-3xl font-display font-black text-center leading-tight text-white">
                {currentQ?.questionText}
              </h2>
            </div>
          </motion.div>
          {/* Timer */}
          <div className="flex flex-col items-center justify-center shrink-0 gap-1">
            <div className="relative w-18 h-18">
              <svg width="70" height="70" className="-rotate-90">
                <circle cx="35" cy="35" r="29" fill="rgba(0,0,0,0.4)" stroke="rgba(249,115,22,0.2)" strokeWidth="6" />
                <circle cx="35" cy="35" r="29" fill="none"
                  stroke={timerPct > 0.5 ? "#f97316" : timerPct > 0.25 ? "#faad14" : "#ff4d4f"}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 29}
                  strokeDashoffset={2 * Math.PI * 29 * (1 - timerPct)}
                  style={{ transition: "stroke-dashoffset 0.9s linear" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display font-black text-lg text-white tabular-nums">{timer}</span>
              </div>
            </div>
            <span className="text-white/40 text-xs font-bold">sec</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(isTF ? TF_BLOCKS : BLOCKS.slice(0, currentQ?.options?.length || 4)).map((b: any, i: number) => {
            const opt = isTF ? b.label : currentQ?.options?.[i];
            if (!opt) return null;
            const isSelected = selected === opt;
            const isCorrect  = opt === currentQ?.correctAnswer;
            const showResult = phase === "reveal" || phase === "erupting";

            let bg = b.bg;
            if (showResult) {
              if (isCorrect) bg = "#22c55e";
              else if (isSelected) bg = "#374151";
              else bg = `${b.bg}44`;
            }

            return (
              <motion.button key={i}
                onClick={() => handleAnswer(opt)}
                disabled={phase !== "question"}
                whileHover={phase === "question" ? { scale: 1.03 } : {}}
                whileTap={phase === "question" ? { scale: 0.96 } : {}}
                className="relative rounded-2xl overflow-hidden flex items-center font-display font-black text-white cursor-pointer shadow-lg"
                style={{ background: bg, minHeight: 68, opacity: showResult && !isCorrect && !isSelected ? 0.4 : 1,
                  border: `2px solid rgba(249,115,22,${showResult && isCorrect ? 0.8 : 0.2})`,
                  boxShadow: showResult && isCorrect ? "0 0 30px rgba(34,197,94,0.6)" : undefined,
                  transition: "background 0.3s, opacity 0.3s"
                }}>
                <div className="w-12 shrink-0 flex items-center justify-center text-2xl h-full self-stretch"
                  style={{ background: "rgba(0,0,0,0.25)", minHeight: 68 }}>
                  {showResult && isCorrect ? "✓" : showResult && isSelected && !isCorrect ? "✗" : b.shape}
                </div>
                <span className="flex-1 px-4 text-sm md:text-lg leading-tight text-center">{opt}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Eruption overlay */}
      <AnimatePresence>
        {phase === "erupting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center"
            style={{ background: "rgba(220,38,38,0.3)", backdropFilter: "blur(2px)" }}>
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: [1, 1.2, 1], opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center">
              <div className="text-8xl">🌋</div>
              <div className="text-3xl font-display font-black text-white mt-2"
                style={{ textShadow: "0 0 30px rgba(255,100,0,1)" }}>
                ERUPTION!
              </div>
              <div className="text-orange-300 font-bold mt-1">
                {MAX_WRONG - wrongCount} wrong left
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
