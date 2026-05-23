import { ProtectedRoute } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, Plus, Trash2, ArrowLeft, Save,
  Languages, ChevronDown, Wand2, PenLine, BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LANGUAGE_OPTIONS = [
  { name: "Spanish",    flag: "🇪🇸" },
  { name: "French",     flag: "🇫🇷" },
  { name: "German",     flag: "🇩🇪" },
  { name: "Italian",    flag: "🇮🇹" },
  { name: "Portuguese", flag: "🇧🇷" },
  { name: "Japanese",   flag: "🇯🇵" },
  { name: "Chinese",    flag: "🇨🇳" },
  { name: "Korean",     flag: "🇰🇷" },
  { name: "Russian",    flag: "🇷🇺" },
  { name: "Arabic",     flag: "🇸🇦" },
  { name: "Hindi",      flag: "🇮🇳" },
  { name: "Dutch",      flag: "🇳🇱" },
  { name: "Polish",     flag: "🇵🇱" },
  { name: "Turkish",    flag: "🇹🇷" },
  { name: "Swedish",    flag: "🇸🇪" },
  { name: "Greek",      flag: "🇬🇷" },
  { name: "English",    flag: "🇬🇧" },
];

const NATIVE_OPTIONS = [
  { name: "English",    flag: "🇬🇧" },
  { name: "Spanish",    flag: "🇪🇸" },
  { name: "French",     flag: "🇫🇷" },
  { name: "Portuguese", flag: "🇧🇷" },
  { name: "German",     flag: "🇩🇪" },
  { name: "Arabic",     flag: "🇸🇦" },
  { name: "Chinese",    flag: "🇨🇳" },
  { name: "Russian",    flag: "🇷🇺" },
];

const LOADING_STAGES = [
  "Choosing the best words…",
  "Generating translations…",
  "Writing example sentences…",
  "Checking pronunciation…",
  "Polishing your set…",
];

const WORD_COUNT_OPTIONS = [5, 10, 15, 20, 30];

const TOPIC_PRESETS = [
  { emoji: "🍕", label: "Food & Drinks" },
  { emoji: "🏠", label: "Home & Family" },
  { emoji: "💼", label: "Work & Business" },
  { emoji: "✈️", label: "Travel" },
  { emoji: "🎭", label: "Arts & Culture" },
  { emoji: "🏥", label: "Health & Body" },
  { emoji: "🌿", label: "Nature" },
  { emoji: "😊", label: "Emotions" },
  { emoji: "🔢", label: "Numbers & Time" },
  { emoji: "🛒", label: "Shopping" },
];

type Word = { native: string; translated: string; pronunciation: string; example: string };

function LanguageCreatePage() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [nativeLang, setNativeLang] = useState("English");
  const [targetLang, setTargetLang] = useState("Spanish");
  const [topic, setTopic] = useState("");
  const [wordCount, setWordCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [generatedWords, setGeneratedWords] = useState<Word[]>([]);
  const [title, setTitle] = useState("");
  const [manualWords, setManualWords] = useState<{ native: string; translated: string }[]>([
    { native: "", translated: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim() || !targetLang) return;
    setLoading(true);
    setGeneratedWords([]);
    setLoadingStage(0);

    const interval = setInterval(() => {
      setLoadingStage(s => (s + 1) % LOADING_STAGES.length);
    }, 1100);

    try {
      const res = await fetch(`${BASE}/api/ai/generate-language-set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic, nativeLanguage: nativeLang, targetLanguage: targetLang, wordCount }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setGeneratedWords(data.words ?? []);
      if (data.title && !title) setTitle(data.title);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleSaveAI = async () => {
    if (!title.trim() || generatedWords.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/language-sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, nativeLanguage: nativeLang, targetLanguage: targetLang, words: generatedWords }),
      });
      if (!res.ok) throw new Error("Save failed");
      const set = await res.json();
      toast({ title: "Set saved!" });
      setLocation(`/language/${set.id}`);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManual = async () => {
    const validWords = manualWords.filter(w => w.native.trim() && w.translated.trim());
    if (!title.trim() || validWords.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/language-sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title, nativeLanguage: nativeLang, targetLanguage: targetLang,
          words: validWords.map(w => ({ native: w.native, translated: w.translated, pronunciation: "", example: "" })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const set = await res.json();
      toast({ title: "Set saved!" });
      setLocation(`/language/${set.id}`);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addManualWord = () => setManualWords(w => [...w, { native: "", translated: "" }]);
  const updateManualWord = (i: number, field: "native" | "translated", val: string) => {
    setManualWords(w => w.map((x, j) => j === i ? { ...x, [field]: val } : x));
  };
  const removeManualWord = (i: number) => {
    setManualWords(w => w.filter((_, j) => j !== i));
  };
  const updateGeneratedWord = (i: number, field: keyof Word, val: string) => {
    setGeneratedWords(w => w.map((x, j) => j === i ? { ...x, [field]: val } : x));
  };

  const targetFlag = LANGUAGE_OPTIONS.find(l => l.name === targetLang)?.flag ?? "🌐";
  const nativeFlag = NATIVE_OPTIONS.find(l => l.name === nativeLang)?.flag ?? "🌐";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back */}
        <button onClick={() => setLocation("/language")}
          className="flex items-center gap-2 mb-8 text-sm font-bold transition-all hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Language Learning
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black text-white mb-1">Create Vocabulary Set</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Let AI generate words for you, or add them yourself
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 rounded-2xl mb-8" style={{ background: "rgba(255,255,255,0.06)" }}>
          {[
            { id: "ai", label: "AI Generate", icon: <Wand2 className="w-4 h-4" /> },
            { id: "manual", label: "Manual", icon: <PenLine className="w-4 h-4" /> },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as "ai" | "manual")}
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

        {/* Language pair */}
        <div className="p-5 rounded-3xl border mb-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Language Pair</p>
          <div className="flex items-center gap-3">
            {/* Native */}
            <div className="relative flex-1">
              <select
                value={nativeLang}
                onChange={e => setNativeLang(e.target.value)}
                className="w-full appearance-none rounded-xl pl-10 pr-8 py-2.5 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)", color: "white" }}
              >
                {NATIVE_OPTIONS.map(l => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}
              </select>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">{nativeFlag}</span>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
            <span className="text-lg font-black" style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
            {/* Target */}
            <div className="relative flex-1">
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value)}
                className="w-full appearance-none rounded-xl pl-10 pr-8 py-2.5 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)", color: "white" }}
              >
                {LANGUAGE_OPTIONS.map(l => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}
              </select>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">{targetFlag}</span>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === "ai" ? (
            <motion.div key="ai" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>

              {/* Topic */}
              <div className="p-5 rounded-3xl border mb-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Topic or Theme</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {TOPIC_PRESETS.map(t => (
                    <button key={t.label} onClick={() => setTopic(t.label)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                      style={{
                        background: topic === t.label ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${topic === t.label ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.1)"}`,
                        color: topic === t.label ? "#c084fc" : "rgba(255,255,255,0.55)",
                      }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Or type your own topic…"
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                />
              </div>

              {/* Word count */}
              <div className="p-5 rounded-3xl border mb-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Number of Words
                </p>
                <div className="flex gap-2">
                  {WORD_COUNT_OPTIONS.map(n => (
                    <button key={n} onClick={() => setWordCount(n)}
                      className="flex-1 py-2 rounded-xl text-sm font-black transition-all"
                      style={{
                        background: wordCount === n ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" : "rgba(255,255,255,0.07)",
                        color: wordCount === n ? "white" : "rgba(255,255,255,0.45)",
                        boxShadow: wordCount === n ? "0 0 12px rgba(124,58,237,0.35)" : "none",
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full py-4 rounded-2xl font-black text-white text-base mb-6 transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", boxShadow: "0 0 24px rgba(124,58,237,0.4)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {LOADING_STAGES[loadingStage]}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate with AI
                  </span>
                )}
              </motion.button>

              {/* Preview */}
              <AnimatePresence>
                {generatedWords.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Title */}
                    <div className="mb-4">
                      <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Set Title
                      </label>
                      <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Name your set…"
                        className="w-full rounded-xl px-4 py-3 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder:text-white/20"
                        style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                      />
                    </div>

                    {/* Word cards */}
                    <div className="space-y-2 mb-6">
                      {generatedWords.map((w, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="p-4 rounded-2xl border"
                          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              value={w.native}
                              onChange={e => updateGeneratedWord(i, "native", e.target.value)}
                              className="flex-1 bg-transparent text-sm font-black text-white focus:outline-none border-b border-white/10 pb-0.5"
                              placeholder="Native word"
                            />
                            <span style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
                            <input
                              value={w.translated}
                              onChange={e => updateGeneratedWord(i, "translated", e.target.value)}
                              className="flex-1 bg-transparent text-sm font-black focus:outline-none border-b border-white/10 pb-0.5"
                              style={{ color: "#a855f7" }}
                              placeholder="Translation"
                            />
                            {w.pronunciation && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-lg" style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}>
                                {w.pronunciation}
                              </span>
                            )}
                          </div>
                          {w.example && (
                            <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.35)" }}>{w.example}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {/* Save */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSaveAI}
                      disabled={saving || !title.trim()}
                      className="w-full py-4 rounded-2xl font-black text-black text-base transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)", boxShadow: "0 0 24px rgba(255,204,2,0.3)" }}
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> Saving…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Save className="w-5 h-5" /> Save & Study
                        </span>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          ) : (
            <motion.div key="manual" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>

              {/* Title */}
              <div className="mb-5">
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Set Title
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Spanish Greetings"
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                />
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-2 gap-3 mb-2 px-1">
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{nativeLang}</p>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{targetLang}</p>
              </div>

              {/* Word rows */}
              <div className="space-y-2 mb-4">
                {manualWords.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={w.native}
                      onChange={e => updateManualWord(i, "native", e.target.value)}
                      placeholder={`Word in ${nativeLang}`}
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-purple-500/30 placeholder:text-white/15"
                      style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                    />
                    <input
                      value={w.translated}
                      onChange={e => updateManualWord(i, "translated", e.target.value)}
                      placeholder={`Word in ${targetLang}`}
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-purple-500/30 placeholder:text-white/15"
                      style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(168,85,247,0.25)", color: "#c084fc" }}
                    />
                    {manualWords.length > 1 && (
                      <button onClick={() => removeManualWord(i)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/15 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addManualWord}
                className="flex items-center gap-2 text-sm font-bold mb-6 px-3 py-2 rounded-xl transition-all hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                <Plus className="w-4 h-4" /> Add word
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSaveManual}
                disabled={saving || !title.trim() || manualWords.every(w => !w.native.trim())}
                className="w-full py-4 rounded-2xl font-black text-black text-base transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)", boxShadow: "0 0 24px rgba(255,204,2,0.3)" }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Saving…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> Save & Study
                  </span>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

export default function LanguageCreateRoute() {
  return <ProtectedRoute><LanguageCreatePage /></ProtectedRoute>;
}
