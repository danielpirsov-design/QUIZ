import { ProtectedRoute } from "@/lib/auth";
import { useParams, useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, RotateCcw, Shuffle, CheckCircle2,
  XCircle, Trophy, BookOpen, Zap, ChevronLeft, ChevronRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LANG_FLAGS: Record<string, string> = {
  Spanish: "🇪🇸", French: "🇫🇷", German: "🇩🇪", Italian: "🇮🇹",
  Portuguese: "🇧🇷", Japanese: "🇯🇵", Chinese: "🇨🇳", Korean: "🇰🇷",
  Russian: "🇷🇺", Arabic: "🇸🇦", Hindi: "🇮🇳", Dutch: "🇳🇱",
  Polish: "🇵🇱", Turkish: "🇹🇷", Swedish: "🇸🇪", English: "🇬🇧",
  Greek: "🇬🇷", Hebrew: "🇮🇱",
};

const QUIZ_COLORS = ["#e21b3c", "#1368ce", "#26890c", "#d89e00"];
const QUIZ_SHAPES = ["▲", "♦", "■", "●"];

type Word = {
  id: number;
  nativeWord: string;
  translatedWord: string;
  pronunciation: string | null;
  example: string | null;
};

type LanguageSet = {
  id: number;
  title: string;
  nativeLanguage: string;
  targetLanguage: string;
  wordCount: number;
  words: Word[];
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getWrongOptions(allWords: Word[], correctWord: Word, field: "nativeWord" | "translatedWord"): string[] {
  const others = allWords.filter(w => w.id !== correctWord.id);
  const shuffled = shuffle(others).slice(0, 3);
  return shuffled.map(w => w[field]);
}

// ── FLASHCARD MODE ───────────────────────────────────────────────────────────
function FlashcardMode({ words, nativeLang, targetLang }: { words: Word[]; nativeLang: string; targetLang: string }) {
  const [deck, setDeck] = useState(() => shuffle(words));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  const current = deck[index];

  const handleNext = () => {
    setFlipped(false);
    setTimeout(() => {
      if (index + 1 >= deck.length) setDone(true);
      else setIndex(i => i + 1);
    }, 150);
  };

  const handlePrev = () => {
    if (index === 0) return;
    setFlipped(false);
    setTimeout(() => setIndex(i => i - 1), 150);
  };

  const handleShuffle = () => {
    setDeck(shuffle(words));
    setIndex(0);
    setFlipped(false);
    setDone(false);
  };

  const handleRestart = () => {
    setDeck(shuffle(words));
    setIndex(0);
    setFlipped(false);
    setDone(false);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center py-16"
      >
        <div className="text-7xl mb-4">🎉</div>
        <h2 className="text-3xl font-display font-black text-white mb-2">All done!</h2>
        <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
          You reviewed all {words.length} cards
        </p>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" }}
        >
          <RotateCcw className="w-4 h-4" /> Study Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Progress */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
            {index + 1} / {deck.length}
          </span>
          <button onClick={handleShuffle}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            <Shuffle className="w-3.5 h-3.5" /> Shuffle
          </button>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7)" }}
            animate={{ width: `${((index + 1) / deck.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 200 }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-lg h-64 cursor-pointer mb-6"
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped(f => !f)}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-8 select-none"
            style={{ backfaceVisibility: "hidden", background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(168,85,247,0.15) 100%)", border: "2px solid rgba(168,85,247,0.3)" }}
          >
            <p className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              {LANG_FLAGS[nativeLang] ?? ""} {nativeLang}
            </p>
            <p className="text-4xl font-display font-black text-white text-center leading-tight">
              {current.nativeWord}
            </p>
            <p className="text-sm mt-4 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
              Tap to reveal
            </p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-8 select-none"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(59,130,246,0.1) 100%)", border: "2px solid rgba(6,182,212,0.3)" }}
          >
            <p className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              {LANG_FLAGS[targetLang] ?? ""} {targetLang}
            </p>
            <p className="text-4xl font-display font-black text-white text-center leading-tight mb-2">
              {current.translatedWord}
            </p>
            {current.pronunciation && (
              <p className="text-base font-medium mb-2" style={{ color: "#06b6d4" }}>
                [{current.pronunciation}]
              </p>
            )}
            {current.example && (
              <p className="text-xs text-center italic mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                {current.example}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={index === 0}
          className="p-3 rounded-2xl transition-all hover:bg-white/8 disabled:opacity-25"
          style={{ background: "rgba(255,255,255,0.06)", color: "white" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 rounded-2xl font-black text-white transition-all hover:brightness-110"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" }}
        >
          {index + 1 === deck.length ? "Finish" : "Next"}
        </button>
        <button
          onClick={() => setFlipped(f => !f)}
          className="p-3 rounded-2xl transition-all hover:bg-white/8"
          style={{ background: "rgba(255,255,255,0.06)", color: "white" }}
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ── QUIZ MODE ────────────────────────────────────────────────────────────────
function QuizMode({ words }: { words: Word[] }) {
  const [questions, setQuestions] = useState(() => buildQuiz(words));
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [answered, setAnswered] = useState(false);

  function buildQuiz(ws: Word[]) {
    return shuffle(ws).map(w => {
      const wrongs = getWrongOptions(ws, w, "translatedWord");
      const options = shuffle([w.translatedWord, ...wrongs]);
      return { word: w, options, correct: w.translatedWord };
    });
  }

  const current = questions[qIndex];

  const handleSelect = (opt: string) => {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    if (opt === current.correct) setScore(s => s + 1);
  };

  const handleNext = () => {
    setSelected(null);
    setAnswered(false);
    if (qIndex + 1 >= questions.length) setDone(true);
    else setQIndex(i => i + 1);
  };

  const handleRestart = () => {
    setQuestions(buildQuiz(words));
    setQIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-12"
      >
        <Trophy className="w-16 h-16 mb-4" style={{ color: "#fbbf24" }} />
        <h2 className="text-4xl font-display font-black text-white mb-2">
          {score}/{questions.length}
        </h2>
        <p className="text-6xl font-display font-black mb-2" style={{ color: pct >= 80 ? "#22c55e" : pct >= 50 ? "#fbbf24" : "#ef4444" }}>
          {pct}%
        </p>
        <p className="text-base mb-8 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
          {pct === 100 ? "Perfect score! 🏆" : pct >= 80 ? "Great job! 🎉" : pct >= 50 ? "Keep practising! 💪" : "Don't give up! 🔥"}
        </p>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" }}
        >
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
            {qIndex + 1} / {questions.length}
          </span>
          <span className="text-sm font-black" style={{ color: "#fbbf24" }}>
            ✦ {score}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #ec4899, #a855f7)" }}
            animate={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="w-full"
        >
          <div
            className="w-full rounded-3xl p-8 text-center mb-6"
            style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              What is the translation?
            </p>
            <p className="text-4xl font-display font-black text-white">{current.word.nativeWord}</p>
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {current.options.map((opt, i) => {
              const isCorrect = opt === current.correct;
              const isSelected = opt === selected;
              let bg = QUIZ_COLORS[i];
              if (answered) {
                if (isCorrect) bg = "#22c55e";
                else if (isSelected) bg = "#ef4444";
                else bg = "#374151";
              }
              return (
                <motion.button
                  key={opt}
                  whileHover={!answered ? { scale: 1.03 } : {}}
                  whileTap={!answered ? { scale: 0.97 } : {}}
                  onClick={() => handleSelect(opt)}
                  disabled={answered}
                  className="relative flex items-center gap-3 p-4 rounded-2xl font-black text-white text-left transition-all"
                  style={{
                    background: bg,
                    boxShadow: isSelected || (answered && isCorrect) ? `0 0 20px ${bg}66` : "none",
                  }}
                >
                  <span className="text-xl opacity-80">{QUIZ_SHAPES[i]}</span>
                  <span className="text-sm leading-tight flex-1">{opt}</span>
                  {answered && isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                  {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-auto shrink-0" />}
                </motion.button>
              );
            })}
          </div>

          {answered && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {selected === current.correct ? (
                <div className="text-center mb-4">
                  <p className="text-lg font-black" style={{ color: "#22c55e" }}>Correct! 🎉</p>
                  {current.word.example && (
                    <p className="text-xs italic mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{current.word.example}</p>
                  )}
                </div>
              ) : (
                <div className="text-center mb-4">
                  <p className="text-base font-black" style={{ color: "#ef4444" }}>Not quite!</p>
                  <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    The answer was <span className="font-black text-white">{current.correct}</span>
                  </p>
                </div>
              )}
              <button
                onClick={handleNext}
                className="w-full py-3 rounded-2xl font-black text-white transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" }}
              >
                {qIndex + 1 === questions.length ? "See Results" : "Next →"}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── MAIN STUDY PAGE ──────────────────────────────────────────────────────────
function LanguageStudyPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [set, setSet] = useState<LanguageSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"flashcards" | "quiz">("flashcards");

  useEffect(() => {
    fetch(`${BASE}/api/language-sets/${params.id}`, { credentials: "include" })
      .then(r => r.json())
      .then(setSet)
      .catch(() => setLocation("/language"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060612" }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!set) return null;

  const targetFlag = LANG_FLAGS[set.targetLanguage] ?? "🌐";

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "#060612" }}>
      <div className="max-w-lg mx-auto">

        {/* Back */}
        <button
          onClick={() => setLocation("/language")}
          className="flex items-center gap-2 mb-6 text-sm font-bold transition-all hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <ArrowLeft className="w-4 h-4" /> All sets
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-3 block">{targetFlag}</span>
          <h1 className="text-2xl font-display font-black text-white mb-1">{set.title}</h1>
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            {set.nativeLanguage} → {set.targetLanguage} · {set.wordCount} words
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 p-1 rounded-2xl mb-8" style={{ background: "rgba(255,255,255,0.06)" }}>
          {[
            { id: "flashcards", label: "Flashcards", icon: <BookOpen className="w-4 h-4" /> },
            { id: "quiz",       label: "Quiz",       icon: <Zap className="w-4 h-4" /> },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as "flashcards" | "quiz")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all"
              style={{
                background: mode === m.id ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" : "transparent",
                color: mode === m.id ? "white" : "rgba(255,255,255,0.4)",
                boxShadow: mode === m.id ? "0 0 16px rgba(124,58,237,0.4)" : "none",
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Mode content */}
        <AnimatePresence mode="wait">
          {mode === "flashcards" ? (
            <motion.div key="flashcards" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <FlashcardMode words={set.words} nativeLang={set.nativeLanguage} targetLang={set.targetLanguage} />
            </motion.div>
          ) : (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {set.words.length < 4 ? (
                <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <p className="text-base font-medium">Add at least 4 words to play Quiz mode.</p>
                </div>
              ) : (
                <QuizMode words={set.words} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LanguageStudyRoute() {
  return <ProtectedRoute><LanguageStudyPage /></ProtectedRoute>;
}
