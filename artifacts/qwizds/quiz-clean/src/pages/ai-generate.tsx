import { ProtectedRoute } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, Save, ChevronRight, Wand2, Globe, X, CheckCircle2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const BLOCK_COLORS = [
  { bg: "#e21b3c", shape: "▲" },
  { bg: "#1368ce", shape: "♦" },
  { bg: "#d89e00", shape: "●" },
  { bg: "#26890c", shape: "■" },
];

const SUBJECT_PRESETS = [
  { emoji: "🔬", label: "Science" },
  { emoji: "📚", label: "History" },
  { emoji: "➕", label: "Math" },
  { emoji: "🌍", label: "Geography" },
  { emoji: "💻", label: "Technology" },
  { emoji: "🎨", label: "Art" },
  { emoji: "🎵", label: "Music" },
  { emoji: "⚽", label: "Sports" },
  { emoji: "🎬", label: "Movies" },
  { emoji: "🍕", label: "Food" },
  { emoji: "🧠", label: "Psychology" },
  { emoji: "💼", label: "Business" },
];

const MODES = [
  { id: "game", emoji: "🎮", label: "Fun Game", desc: "Engaging & memorable" },
  { id: "exam", emoji: "📋", label: "Exam Prep", desc: "Precise & academic" },
  { id: "deepdive", emoji: "🔭", label: "Deep Dive", desc: "Advanced & conceptual" },
];

const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Arabic", "Chinese", "Japanese", "Italian", "Hebrew"];

const LOADING_STAGES = [
  { label: "Analyzing your topic…", duration: 800 },
  { label: "Crafting clever questions…", duration: 1400 },
  { label: "Writing plausible distractors…", duration: 1200 },
  { label: "Adding explanations…", duration: 900 },
  { label: "Polishing the final quiz…", duration: 800 },
];

const IMAGE_LOADING_STAGES = [
  { label: "Designing image prompts…", duration: 1200 },
  { label: "Generating illustrations…", duration: 2000 },
  { label: "Storing images securely…", duration: 1000 },
];

export default function AIGeneratePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AIGenerateContent />
      </AppLayout>
    </ProtectedRoute>
  );
}

function AIGenerateContent() {
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [mode, setMode] = useState("game");
  const [language, setLanguage] = useState("English");
  const [withImages, setWithImages] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageLoadingStage, setImageLoadingStage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const startStageAnimation = () => {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    let elapsed = 0;
    LOADING_STAGES.forEach((s, i) => {
      const t = setTimeout(() => setLoadingStage(i), elapsed);
      stageTimers.current.push(t);
      elapsed += s.duration;
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && !text.trim()) { toast({ title: "Please enter a topic or paste some text", variant: "destructive" }); return; }
    setLoading(true);
    setLoadingStage(0);
    setResult(null);
    startStageAnimation();
    try {
      const res = await fetch(`${BASE}/api/ai/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic, text, customPrompt, questionCount, difficulty, mode, language }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      stageTimers.current.forEach(clearTimeout);
      setLoading(false);

      if (withImages && data.questions?.length) {
        setImageLoading(true);
        setImageLoadingStage(0);
        const imgTimers: ReturnType<typeof setTimeout>[] = [];
        let elapsed = 0;
        IMAGE_LOADING_STAGES.forEach((s, i) => {
          const t = setTimeout(() => setImageLoadingStage(i), elapsed);
          imgTimers.push(t);
          elapsed += s.duration;
        });

        const imageResults = await Promise.allSettled(
          data.questions.map((q: any) =>
            fetch(`${BASE}/api/ai/generate-question-image`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ questionText: q.questionText, topic }),
            }).then(r => r.ok ? r.json() : null).catch(() => null)
          )
        );

        imgTimers.forEach(clearTimeout);
        setImageLoading(false);

        data.questions = data.questions.map((q: any, i: number) => {
          const imgResult = imageResults[i];
          if (imgResult.status === "fulfilled" && imgResult.value?.objectPath) {
            return { ...q, imageUrl: `${BASE}/api/storage${imgResult.value.objectPath}` };
          }
          return q;
        });
      }

      setResult(data);
    } catch (e: any) {
      toast({ title: "Generation failed", description: "The AI encountered an error. Please try again.", variant: "destructive" });
    } finally {
      stageTimers.current.forEach(clearTimeout);
      setLoading(false);
      setImageLoading(false);
    }
  };

  const handleRegenerate = async (idx: number) => {
    setRegeneratingIdx(idx);
    try {
      const res = await fetch(`${BASE}/api/ai/regenerate-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic, existingQuestion: result.questions[idx]?.questionText, difficulty, language }),
      });
      if (!res.ok) throw new Error();
      const newQ = await res.json();
      setResult((prev: any) => {
        const qs = [...prev.questions];
        qs[idx] = newQ;
        return { ...prev, questions: qs };
      });
    } catch {
      toast({ title: "Failed to regenerate question", variant: "destructive" });
    } finally {
      setRegeneratingIdx(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/ai/generate-and-save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ generatedQuiz: result }),
      });
      if (!res.ok) throw new Error();
      const { quizId } = await res.json();
      toast({ title: "Quiz saved! Opening editor…" });
      setLocation(`/quizzes/${quizId}/edit`);
    } catch {
      toast({ title: "Failed to save quiz", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">

        {/* Header */}
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-400/30 mb-5 text-sm font-bold text-yellow-300" style={{ background: "rgba(255,204,2,0.1)" }}>
            <Sparkles className="w-4 h-4" /> Powered by GPT-5.2
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-white mb-4 leading-tight">
            AI Quiz <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #ffcc02, #ff7b00)" }}>Magic</span>
          </h1>
          <p className="text-white/60 text-lg font-medium max-w-xl mx-auto">
            Describe any topic. Get a play-ready game in seconds.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!result && !loading && (
            <motion.form key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              onSubmit={handleGenerate} className="space-y-6">

              {/* Topic input */}
              <div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="p-5 sm:p-7">
                  <label className="block text-sm font-black uppercase tracking-widest text-white/40 mb-3">Topic or Subject</label>
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. The Solar System, Python Programming, World War II…"
                    className="w-full bg-transparent text-white text-lg sm:text-xl font-bold placeholder:text-white/20 outline-none border-none"
                  />
                  {/* Subject presets */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                    {SUBJECT_PRESETS.map(s => (
                      <button key={s.label} type="button"
                        onClick={() => setTopic(s.label)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border transition-all"
                        style={{
                          borderColor: topic === s.label ? "#ffcc02" : "rgba(255,255,255,0.12)",
                          background: topic === s.label ? "rgba(255,204,2,0.15)" : "rgba(255,255,255,0.05)",
                          color: topic === s.label ? "#ffcc02" : "rgba(255,255,255,0.6)",
                        }}>
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Paste text (collapsible) */}
              <details className="group rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                <summary className="px-5 py-4 cursor-pointer text-sm font-bold text-white/50 flex items-center justify-between select-none hover:text-white/70 transition-colors list-none">
                  <span>📄 Paste reference material <span className="font-normal text-white/30">(optional — improves accuracy)</span></span>
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 pb-5">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Paste articles, notes, textbook content, documentation…"
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 outline-none focus:border-yellow-400/50 resize-none text-sm font-medium"
                  />
                </div>
              </details>

              {/* Custom prompt / instructions */}
              <div className="rounded-3xl border border-purple-500/30 overflow-hidden" style={{ background: "rgba(168,85,247,0.07)" }}>
                <div className="p-5 sm:p-7">
                  <label className="block text-sm font-black uppercase tracking-widest mb-1" style={{ color: "rgba(168,85,247,0.9)" }}>
                    ✨ Custom Instructions <span className="font-normal text-white/25 normal-case tracking-normal text-xs">(optional)</span>
                  </label>
                  <p className="text-xs font-medium mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Tell the AI anything extra — focus areas, question style, what to avoid, specific subtopics…
                  </p>
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder={`e.g. "Focus on the causes of WWI, not the battles"\n"Make every question a true/false"\n"Include quotes from famous scientists"\n"Avoid questions about dates"`}
                    rows={3}
                    className="w-full bg-white/5 border border-purple-500/20 rounded-2xl p-4 text-white placeholder:text-white/20 outline-none focus:border-purple-400/50 resize-none text-sm font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Mode */}
              <div className="rounded-3xl border border-white/10 p-5 sm:p-7" style={{ background: "rgba(255,255,255,0.05)" }}>
                <label className="block text-sm font-black uppercase tracking-widest text-white/40 mb-4">Quiz Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {MODES.map(m => (
                    <button key={m.id} type="button" onClick={() => setMode(m.id)}
                      className="p-4 rounded-2xl border-2 text-left transition-all"
                      style={{ borderColor: mode === m.id ? "#ffcc02" : "rgba(255,255,255,0.1)", background: mode === m.id ? "rgba(255,204,2,0.1)" : "rgba(255,255,255,0.03)" }}>
                      <div className="text-2xl mb-1">{m.emoji}</div>
                      <div className="text-sm font-black text-white">{m.label}</div>
                      <div className="text-xs text-white/40 font-medium">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Question count */}
                <div className="rounded-2xl border border-white/10 p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-3">Questions</label>
                  <div className="flex gap-2 flex-wrap">
                    {[5, 10, 15, 20].map(n => (
                      <button key={n} type="button" onClick={() => setQuestionCount(n)}
                        className="flex-1 py-2 rounded-xl font-black text-sm transition-all"
                        style={{ background: questionCount === n ? "#ffcc02" : "rgba(255,255,255,0.08)", color: questionCount === n ? "#111" : "rgba(255,255,255,0.5)" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="rounded-2xl border border-white/10 p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-3">Difficulty</label>
                  <div className="flex gap-2">
                    {(["easy", "medium", "hard"] as const).map(d => (
                      <button key={d} type="button" onClick={() => setDifficulty(d)}
                        className="flex-1 py-2 rounded-xl font-black text-xs capitalize transition-all"
                        style={{
                          background: difficulty === d ? ({ easy: "#26890c", medium: "#d89e00", hard: "#e21b3c" }[d]) : "rgba(255,255,255,0.08)",
                          color: difficulty === d ? "#fff" : "rgba(255,255,255,0.5)",
                        }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="rounded-2xl border border-white/10 p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-3">
                    <Globe className="w-3 h-3 inline mr-1" />Language
                  </label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full bg-transparent text-white text-sm font-bold outline-none cursor-pointer"
                    style={{ appearance: "none" }}
                  >
                    {LANGUAGES.map(l => <option key={l} value={l} style={{ background: "#302b63" }}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Images toggle */}
              <button type="button" onClick={() => setWithImages(v => !v)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all"
                style={{
                  borderColor: withImages ? "rgba(168,85,247,0.6)" : "rgba(255,255,255,0.1)",
                  background: withImages ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.04)",
                }}>
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: withImages ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.08)" }}>
                  🖼️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white text-sm">Add AI-generated images</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {withImages ? "Each question will get a unique AI illustration" : "Illustrated visuals for every question (takes longer)"}
                  </div>
                </div>
                <div className={`shrink-0 w-11 h-6 rounded-full transition-colors ${withImages ? "bg-purple-500" : "bg-white/10"}`}>
                  <div className={`w-5 h-5 m-0.5 rounded-full bg-white shadow transition-transform ${withImages ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </button>

              {/* Generate button */}
              <button type="submit"
                className="w-full h-16 rounded-3xl font-black text-xl text-black flex items-center justify-center gap-3 transition-all hover:brightness-105 hover:scale-[1.01] active:scale-[0.99] shadow-2xl"
                style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)", boxShadow: "0 8px 40px rgba(255,204,2,0.35)" }}>
                <Sparkles className="w-6 h-6" />
                Generate Quiz with AI
              </button>
            </motion.form>
          )}

          {/* Loading state */}
          {(loading || imageLoading) && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center">
              {/* Animated orb */}
              <div className="relative w-32 h-32 mb-10">
                <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full"
                  style={{ background: imageLoading ? "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)" : "radial-gradient(circle, rgba(255,204,2,0.4) 0%, transparent 70%)" }} />
                <div className="absolute inset-4 rounded-full flex items-center justify-center"
                  style={{ background: imageLoading ? "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)" : "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)" }}>
                  {imageLoading ? <Image className="w-10 h-10 text-white" /> : <Sparkles className="w-10 h-10 text-black" />}
                </div>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed"
                  style={{ borderColor: imageLoading ? "rgba(168,85,247,0.3)" : "rgba(255,204,2,0.3)" }} />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">{imageLoading ? "Painting illustrations…" : "AI is working…"}</h2>
              <AnimatePresence mode="wait">
                <motion.p key={imageLoading ? `img-${imageLoadingStage}` : loadingStage}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="font-medium text-lg" style={{ color: imageLoading ? "rgba(168,85,247,0.8)" : "rgba(255,255,255,0.5)" }}>
                  {imageLoading ? IMAGE_LOADING_STAGES[imageLoadingStage]?.label : LOADING_STAGES[loadingStage]?.label}
                </motion.p>
              </AnimatePresence>
              <div className="flex gap-2 mt-6">
                {(imageLoading ? IMAGE_LOADING_STAGES : LOADING_STAGES).map((_, i) => (
                  <motion.div key={i} className="h-1.5 rounded-full"
                    animate={{
                      width: i <= (imageLoading ? imageLoadingStage : loadingStage) ? 32 : 8,
                      background: i <= (imageLoading ? imageLoadingStage : loadingStage) ? (imageLoading ? "#a855f7" : "#ffcc02") : "rgba(255,255,255,0.15)"
                    }}
                    transition={{ duration: 0.4 }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Result */}
          {result && !loading && !imageLoading && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Result header */}
              <div className="rounded-3xl border border-yellow-400/20 p-6 sm:p-8"
                style={{ background: "linear-gradient(135deg, rgba(255,204,2,0.08) 0%, rgba(255,149,0,0.04) 100%)" }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      <span className="text-green-400 font-bold text-sm">Generated successfully</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-black text-white">{result.title}</h2>
                    {result.description && <p className="text-white/50 mt-1 font-medium">{result.description}</p>}
                    <div className="flex items-center gap-3 mt-3 text-sm text-white/40 font-bold flex-wrap">
                      <span>{result.questions?.length} questions</span>
                      <span>·</span>
                      <span className="capitalize">{difficulty}</span>
                      <span>·</span>
                      <span>{language}</span>
                    </div>
                  </div>
                  <button onClick={() => setResult(null)}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all">
                    <Wand2 className="w-4 h-4" /> New Quiz
                  </button>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {result.questions?.map((q: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-3xl border border-white/10 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    {/* Question image */}
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Question illustration"
                        className="w-full object-cover"
                        style={{ maxHeight: 180, borderBottom: "1px solid rgba(255,255,255,0.06)" }} />
                    )}

                    {/* Question header */}
                    <div className="p-5 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-xs font-black text-white/30 uppercase tracking-widest">Q{i + 1}</span>
                          <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">{q.questionText}</h3>
                        </div>
                        <button
                          onClick={() => handleRegenerate(i)}
                          disabled={regeneratingIdx === i}
                          className="shrink-0 p-2 rounded-xl border border-white/10 text-white/30 hover:text-yellow-400 hover:border-yellow-400/30 transition-all"
                          title="Regenerate this question">
                          {regeneratingIdx === i
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RefreshCw className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Kahoot-style answer blocks */}
                    <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                      {q.options?.map((opt: string, idx: number) => {
                        const isCorrect = opt === q.correctAnswer;
                        const c = BLOCK_COLORS[idx % 4];
                        return (
                          <div key={idx}
                            className="flex items-center gap-2 px-3 py-3 rounded-2xl border-2 transition-all"
                            style={{
                              background: c.bg + (isCorrect ? "ee" : "44"),
                              borderColor: isCorrect ? "#fff" : "transparent",
                              boxShadow: isCorrect ? `0 0 0 1px ${c.bg}, 0 4px 16px ${c.bg}55` : undefined,
                            }}>
                            <span className="text-lg shrink-0">{c.shape}</span>
                            <span className="text-sm font-bold text-white leading-tight">{opt}</span>
                            {isCorrect && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="mx-3 mb-3 px-4 py-3 rounded-2xl text-sm text-white/50 font-medium"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        💡 {q.explanation}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Save button */}
              <div className="sticky bottom-4 pt-4">
                <button onClick={handleSave} disabled={saving}
                  className="w-full h-16 rounded-3xl font-black text-xl text-black flex items-center justify-center gap-3 transition-all hover:brightness-105 hover:scale-[1.01] active:scale-[0.99] shadow-2xl disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)", boxShadow: "0 8px 40px rgba(255,204,2,0.35)" }}>
                  {saving ? <><Loader2 className="w-6 h-6 animate-spin" /> Saving…</> : <><Save className="w-6 h-6" /> Save & Open Editor</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
