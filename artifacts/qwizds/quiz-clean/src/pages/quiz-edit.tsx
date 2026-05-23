import { ProtectedRoute } from "@/lib/auth";
import { useGetQuiz, useUpdateQuiz, useAddQuestion, useUpdateQuestion, useDeleteQuestion } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Plus, Trash2, CheckCircle2, ChevronLeft, Clock, Star, BrainCircuit, Play, Menu, X, CloudOff, Image, Globe, Lock, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useImageUpload(onSuccess: (servingUrl: string, objectPath: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    try {
      const res = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await res.json();

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      const servingUrl = `${BASE}/api/storage${objectPath}`;
      onSuccess(servingUrl, objectPath);
    } catch (e) {
      console.error("Image upload failed", e);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onSuccess]);

  return { upload, uploading, progress };
}

const BLOCKS = [
  { bg: "#e21b3c", shadow: "#9e0e25", shape: "▲", label: "Answer 1" },
  { bg: "#1368ce", shadow: "#0b4a94", shape: "♦", label: "Answer 2" },
  { bg: "#26890c", shadow: "#165c07", shape: "■", label: "Answer 3" },
  { bg: "#d89e00", shadow: "#a07500", shape: "●", label: "Answer 4" },
];

const TF_BLOCKS = [
  { bg: "#26890c", shadow: "#165c07", shape: "✓", label: "True" },
  { bg: "#e21b3c", shadow: "#9e0e25", shape: "✗", label: "False" },
];

const QUESTION_TYPES = [
  { id: "multiple_choice", label: "4 Answers", icon: "▦" },
  { id: "multiple_choice_3", label: "3 Answers", icon: "▤" },
  { id: "true_false", label: "True / False", icon: "⊕" },
  { id: "short_answer", label: "Free Text", icon: "✎" },
  { id: "audio", label: "Audio", icon: "♪" },
];

const TIME_OPTIONS = [5, 10, 20, 30, 60, 90, 120];
const POINT_OPTIONS = [{ label: "Standard", value: 1000 }, { label: "Double", value: 2000 }, { label: "None", value: 0 }];

function lsKey(quizId: number, qId: number) { return `qwizds_q_${quizId}_${qId}`; }
function lsSave(quizId: number, qId: number, data: object) {
  try { localStorage.setItem(lsKey(quizId, qId), JSON.stringify({ ...data, ts: Date.now() })); } catch {}
}
function lsLoad(quizId: number, qId: number) {
  try { const s = localStorage.getItem(lsKey(quizId, qId)); return s ? JSON.parse(s) : null; } catch { return null; }
}
function lsClear(quizId: number, qId: number) {
  try { localStorage.removeItem(lsKey(quizId, qId)); } catch {}
}

export default function QuizEditPage() {
  const [, params] = useRoute("/quizzes/:id/edit");
  const id = parseInt(params?.id || "0");
  return (
    <ProtectedRoute>
      {id ? <QuizEditor id={id} /> : <div>Invalid ID</div>}
    </ProtectedRoute>
  );
}

function QuizEditor({ id }: { id: number }) {
  const { data: quiz, isLoading } = useGetQuiz(id);
  const updateMut         = useUpdateQuiz();
  const addQuestionMut    = useAddQuestion();
  const deleteQuestionMut = useDeleteQuestion();
  const { toast }         = useToast();
  const queryClient       = useQueryClient();
  const [, setLocation]   = useLocation();

  const [title, setTitle]         = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [activeQId, setActiveQId] = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [togglingVis, setTogglingVis] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title);
      setVisibility(quiz.visibility as "public" | "private");
    }
  }, [quiz]);
  useEffect(() => {
    if (quiz && activeQId === null && quiz.questions.length > 0) setActiveQId(quiz.questions[0].id);
  }, [quiz, activeQId]);

  const saveTitle = async () => {
    if (!quiz || title === quiz.title || !title.trim()) return;
    setSaving(true);
    try { await updateMut.mutateAsync({ id, data: { title } }); queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${id}`] }); }
    catch { toast({ title: "Failed to save title", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const toggleVisibility = async () => {
    const next = visibility === "public" ? "private" : "public";
    setTogglingVis(true);
    try {
      await updateMut.mutateAsync({ id, data: { visibility: next } });
      setVisibility(next);
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${id}`] });
      toast({ title: next === "public" ? "Quiz is now Public 🌍" : "Quiz is now Private 🔒" });
    } catch { toast({ title: "Failed to update visibility", variant: "destructive" }); }
    finally { setTogglingVis(false); }
  };

  const handleAddQuestion = async () => {
    setSidebarOpen(false);
    const q = await addQuestionMut.mutateAsync({
      id, data: {
        questionText: "", questionType: "multiple_choice",
        options: ["", "", "", ""], correctAnswer: "",
        timeLimit: 20, points: 1000,
        orderIndex: (quiz?.questions?.length || 0) + 1,
      }
    });
    queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${id}`] });
    setActiveQId(q.id);
  };

  const handleDelete = async (qId: number) => {
    if (!confirm("Delete this question?")) return;
    lsClear(id, qId);
    await deleteQuestionMut.mutateAsync({ id, questionId: qId });
    queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${id}`] });
    const remaining = quiz?.questions.filter(q => q.id !== qId) || [];
    setActiveQId(remaining[0]?.id ?? null);
  };

  const selectQuestion = (qId: number) => { setActiveQId(qId); setSidebarOpen(false); };

  const activeQuestion = quiz?.questions.find(q => q.id === activeQId) ?? quiz?.questions[0] ?? null;

  if (isLoading || !quiz) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#46178f" }}>
      <Loader2 className="w-12 h-12 animate-spin text-white" />
    </div>
  );

  const questionCount = quiz.questions.length;

  return (
    <div className="h-screen flex flex-col overflow-hidden text-white" style={{ background: "#1a1a2e" }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 z-30" style={{ background: "#46178f" }}>
        <button onClick={() => setLocation("/my-quizzes")} className="flex items-center gap-1 text-white/70 hover:text-white font-bold text-sm transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-xl px-3 py-2 font-display font-black text-base sm:text-lg text-white placeholder:text-white/30 outline-none focus:border-yellow-400 focus:bg-white/15 transition-all"
          placeholder="Quiz title..."
        />

        <div className="flex items-center gap-2 shrink-0">
          {saving && <Loader2 className="w-4 h-4 text-white/50 animate-spin" />}

          {/* Visibility toggle */}
          <button
            onClick={toggleVisibility}
            disabled={togglingVis}
            title={visibility === "public" ? "Click to make Private" : "Click to make Public"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black border transition-all hover:brightness-110 disabled:opacity-50"
            style={{
              background: visibility === "public" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)",
              borderColor: visibility === "public" ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.2)",
              color: visibility === "public" ? "#4ade80" : "rgba(255,255,255,0.6)",
            }}
          >
            {togglingVis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : visibility === "public" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline capitalize">{visibility}</span>
          </button>

          {/* Mobile: Questions button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all"
          >
            <Menu className="w-4 h-4" />
            <span className="text-xs">{questionCount}Q</span>
          </button>

          <button
            onClick={() => setLocation(`/quizzes/${id}`)}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-black text-sm transition-all hover:brightness-110"
            style={{ background: "#ffcc02" }}
          >
            <Play className="w-4 h-4 fill-current" /> Host
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">

        {/* ── MOBILE SIDEBAR OVERLAY ────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed inset-y-0 left-0 w-72 z-50 md:hidden flex flex-col"
                style={{ background: "#2d2d4e", top: 0, bottom: 0 }}
              >
                <SidebarContent
                  quiz={quiz} activeQuestion={activeQuestion} quizId={id}
                  onSelect={selectQuestion} onAdd={handleAddQuestion}
                  isPending={addQuestionMut.isPending}
                  header={
                    <button onClick={() => setSidebarOpen(false)} className="p-1 text-white/50 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  }
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── DESKTOP SIDEBAR ───────────────────────────────────────── */}
        <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/10" style={{ background: "#2d2d4e" }}>
          <SidebarContent
            quiz={quiz} activeQuestion={activeQuestion} quizId={id}
            onSelect={selectQuestion} onAdd={handleAddQuestion}
            isPending={addQuestionMut.isPending}
          />
        </div>

        {/* ── MAIN EDITOR ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center p-4 md:p-6 gap-4 md:gap-5" style={{ background: "#1a1a2e" }}>
          {activeQuestion ? (
            <QuestionEditor
              key={activeQuestion.id}
              quizId={id}
              question={activeQuestion}
              onDelete={() => handleDelete(activeQuestion.id)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-center px-4">
              <BrainCircuit className="w-16 md:w-20 h-16 md:h-20 mb-4 opacity-20" />
              <p className="text-lg md:text-xl font-bold mb-4">No questions yet</p>
              <button
                onClick={handleAddQuestion}
                disabled={addQuestionMut.isPending}
                className="px-8 py-3 rounded-2xl font-black text-black text-base"
                style={{ background: "#ffcc02" }}
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Add first question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE BOTTOM BAR ─────────────────────────────────────────── */}
      <div className="md:hidden shrink-0 flex items-center justify-between px-4 py-3 border-t border-white/10 z-20" style={{ background: "#2d2d4e" }}>
        <button onClick={handleAddQuestion} disabled={addQuestionMut.isPending}
          className="flex-1 mr-3 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 border-dashed border-white/20 text-white/60 hover:border-yellow-400 hover:text-yellow-400 transition-all">
          {addQuestionMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add Question</>}
        </button>
        <button onClick={() => setLocation(`/quizzes/${id}`)}
          className="px-5 py-3 rounded-2xl font-black text-black text-sm flex items-center gap-1.5"
          style={{ background: "#ffcc02" }}>
          <Play className="w-4 h-4 fill-current" /> Host
        </button>
      </div>
    </div>
  );
}

function CoverImageSection({ quizId, currentUrl }: { quizId: number; currentUrl?: string | null }) {
  const [coverUrl, setCoverUrl] = useState(currentUrl || "");
  const updateMut = useUpdateQuiz();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveCover = async (url: string) => {
    try {
      await updateMut.mutateAsync({ id: quizId, data: { coverImageUrl: url || null } } as any);
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${quizId}`] });
    } catch { console.error("Failed to save cover image"); }
  };

  const { upload, uploading, progress } = useImageUpload(useCallback((servingUrl: string) => {
    setCoverUrl(servingUrl);
    saveCover(servingUrl);
  }, []));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  return (
    <div className="p-3 border-b border-white/10">
      <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">Cover Image</div>
      <div
        className="relative w-full rounded-xl overflow-hidden border-2 border-dashed border-white/20 cursor-pointer group transition-all hover:border-white/40"
        style={{ minHeight: 72, background: "rgba(255,255,255,0.04)" }}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {coverUrl && !uploading ? (
          <img src={coverUrl} alt="Quiz cover" className="w-full object-cover" style={{ maxHeight: 120 }} />
        ) : uploading ? (
          <div className="flex flex-col items-center justify-center h-[72px] gap-1 px-4">
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-purple-400 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-white/40 text-xs font-bold">Uploading… {progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[72px] text-white/30 group-hover:text-white/50 transition-colors">
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold">Upload cover image</span>
          </div>
        )}
        {coverUrl && !uploading && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 text-white text-xs font-bold"><Upload className="w-4 h-4" /> Change</div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {coverUrl && !uploading && (
        <button onClick={() => { setCoverUrl(""); saveCover(""); }}
          className="mt-1.5 w-full text-xs text-white/30 hover:text-red-400 transition-colors font-bold">
          Remove cover
        </button>
      )}
    </div>
  );
}

function SidebarContent({ quiz, activeQuestion, quizId, onSelect, onAdd, isPending, header }: {
  quiz: any; activeQuestion: any; quizId: number;
  onSelect: (id: number) => void; onAdd: () => void; isPending: boolean;
  header?: React.ReactNode;
}) {
  return (
    <>
      <CoverImageSection quizId={quizId} currentUrl={quiz.coverImageUrl} />
      <div className="p-3 flex items-center justify-between text-xs font-black uppercase tracking-widest text-white/40 border-b border-white/10">
        <span>Questions ({quiz.questions.length})</span>
        {header}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {quiz.questions.map((q: any, idx: number) => {
            const isActive = q.id === activeQuestion?.id;
            return (
              <motion.button key={q.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                onClick={() => onSelect(q.id)}
                className="w-full text-left rounded-xl overflow-hidden border-2 transition-all"
                style={{ borderColor: isActive ? "#ffcc02" : "transparent", background: isActive ? "rgba(255,204,2,0.1)" : "rgba(255,255,255,0.05)" }}
              >
                <div className="px-3 pt-2 pb-1">
                  <div className="text-xs font-black text-white/40 mb-1">Q{idx + 1}</div>
                  <div className="text-sm font-bold text-white line-clamp-2 min-h-[2.5rem]">
                    {q.questionText || <span className="text-white/30 italic">Empty question</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-0.5 p-1 pt-0">
                  {BLOCKS.map((b, i) => (
                    <div key={i} className="h-5 rounded-sm flex items-center gap-1 px-1.5" style={{ background: b.bg + "cc" }}>
                      <span className="text-[8px] opacity-70">{b.shape}</span>
                      <span className="text-[9px] font-bold text-white truncate">{q.options?.[i] || ""}</span>
                    </div>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="p-3 border-t border-white/10">
        <button onClick={onAdd} disabled={isPending}
          className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 border-2 border-dashed border-white/20 text-white/60 hover:border-yellow-400 hover:text-yellow-400 hover:bg-yellow-400/5 transition-all">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add Question</>}
        </button>
      </div>
    </>
  );
}

function QuestionEditor({ quizId, question, onDelete }: { quizId: number; question: any; onDelete: () => void }) {
  const backup = lsLoad(quizId, question.id);
  const useBackup = backup && backup.ts > (new Date(question.updatedAt || 0).getTime());

  // Derive initial type from DB or backup
  const initType = (() => {
    const t = useBackup ? backup.qType : question.questionType;
    if (t === "true_false") return "true_false";
    if (t === "multiple_choice_3") return "multiple_choice_3";
    if (t === "short_answer") return "short_answer";
    if (t === "audio") return "audio";
    return "multiple_choice";
  })();

  const [qType, setQTypeState] = useState<"multiple_choice" | "multiple_choice_3" | "true_false" | "short_answer" | "audio">(initType as any);
  const [text, setTextState]   = useState(useBackup ? backup.text : (question.questionText || ""));
  const [options, setOptions]  = useState<string[]>(() => {
    if (initType === "true_false") return ["True", "False"];
    if (initType === "short_answer") return [];
    const stored = useBackup ? backup.options : question.options;
    if (Array.isArray(stored) && stored.length >= 2) {
      const padded = [...stored];
      while (padded.length < 4) padded.push("");
      return padded.slice(0, 4);
    }
    return ["", "", "", ""];
  });
  const [correct, setCorrect]  = useState(useBackup ? backup.correct : (question.correctAnswer || ""));
  const [time, setTime]        = useState(question.timeLimit || 20);
  const [points, setPoints]    = useState(question.points ?? 1000);
  const [audioUrl, setAudioUrl] = useState(question.audioUrl || "");
  const [audioUrlSaving, setAudioUrlSaving] = useState(false);
  const audioUrlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasBackup]            = useState(useBackup && !!backup);

  const updateMut   = useUpdateQuestion();
  const { toast }   = useToast();
  const queryClient = useQueryClient();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute the effective options array to save (trim trailing empties for 3-choice)
  const effectiveOptions = (type: string, opts: string[]) => {
    if (type === "true_false") return ["True", "False"];
    if (type === "multiple_choice_3") return opts.slice(0, 3);
    if (type === "short_answer") return [];
    return opts.slice(0, 4);
  };

  const doSave = async (t: string, opts: string[], cor: string, tm: number, pts: number, type: string) => {
    setSaveStatus("saving");
    try {
      const finalOpts = effectiveOptions(type, opts);
      await updateMut.mutateAsync({
        id: quizId, questionId: question.id,
        data: { questionText: t, questionType: type as any, options: finalOpts, correctAnswer: cor, timeLimit: tm, points: pts }
      });
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${quizId}`] });
      lsClear(quizId, question.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      toast({ title: "Error saving — data backed up locally", variant: "destructive" });
    }
  };

  const saveAudioUrl = async (url: string) => {
    setAudioUrlSaving(true);
    try {
      await updateMut.mutateAsync({ id: quizId, questionId: question.id, data: { audioUrl: url || null } } as any);
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${quizId}`] });
    } catch {}
    setAudioUrlSaving(false);
  };

  const handleAudioUrlChange = (v: string) => {
    setAudioUrl(v);
    if (audioUrlTimer.current) clearTimeout(audioUrlTimer.current);
    audioUrlTimer.current = setTimeout(() => saveAudioUrl(v), 1200);
  };

  const scheduleAutoSave = (t: string, opts: string[], cor: string, tm: number, pts: number, type: string) => {
    lsSave(quizId, question.id, { text: t, options: opts, correct: cor, qType: type });
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => doSave(t, opts, cor, tm, pts, type), 900);
  };

  const setText = (v: string) => { setTextState(v); scheduleAutoSave(v, options, correct, time, points, qType); };

  const setOpt = (i: number, v: string) => {
    const n = [...options]; n[i] = v;
    const newCorrect = correct === options[i] ? v : correct;
    setOptions(n); setCorrect(newCorrect);
    scheduleAutoSave(text, n, newCorrect, time, points, qType);
  };

  const markCorrect = (opt: string) => {
    setCorrect(opt);
    scheduleAutoSave(text, options, opt, time, points, qType);
  };

  const changeTime   = (v: number) => { setTime(v);   doSave(text, options, correct, v, points, qType); };
  const changePoints = (v: number) => { setPoints(v); doSave(text, options, correct, time, v, qType); };

  const switchType = (newType: "multiple_choice" | "multiple_choice_3" | "true_false" | "short_answer" | "audio") => {
    setQTypeState(newType);
    let newOpts = options;
    let newCorrect = correct;
    if (newType === "true_false") {
      newOpts = ["True", "False"];
      newCorrect = "";
    } else if (newType === "short_answer") {
      newOpts = [];
      newCorrect = correct;
    } else if (newType === "multiple_choice_3") {
      newOpts = [options[0] || "", options[1] || "", options[2] || "", ""];
      if (correct === options[3]) newCorrect = "";
    } else {
      newOpts = [options[0] || "", options[1] || "", options[2] || "", options[3] || ""];
    }
    setOptions(newOpts);
    setCorrect(newCorrect);
    doSave(text, newOpts, newCorrect, time, points, newType);
  };

  const isTextBased = qType === "short_answer";
  const isAudio = qType === "audio";

  // How many answer slots to show
  const slotCount = qType === "true_false" ? 2 : qType === "multiple_choice_3" ? 3 : 4;
  const activeBlocks = qType === "true_false" ? TF_BLOCKS : BLOCKS.slice(0, slotCount);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">

      {/* Backup warning */}
      {hasBackup && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-yellow-300 border border-yellow-400/30" style={{ background: "rgba(255,204,2,0.1)" }}>
          <CloudOff className="w-4 h-4 shrink-0" />
          Restored unsaved draft
        </div>
      )}

      {/* ── Question type selector ───────────────────────────────────── */}
      <div className="flex gap-2 rounded-2xl p-1.5 border border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
        {QUESTION_TYPES.map(qt => (
          <button key={qt.id} onClick={() => switchType(qt.id as any)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all"
            style={{
              background: qType === qt.id ? "#ffcc02" : "transparent",
              color: qType === qt.id ? "#111" : "rgba(255,255,255,0.45)",
            }}>
            <span className="text-base leading-none">{qt.icon}</span>
            <span className="hidden sm:inline">{qt.label}</span>
            <span className="sm:hidden text-xs">{qt.id === "true_false" ? "T/F" : qt.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* ── Settings bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 rounded-2xl px-4 py-3 border border-white/10 flex-wrap" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-white/40 shrink-0" />
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {TIME_OPTIONS.map(t => (
                <button key={t} onClick={() => changeTime(t)}
                  className="px-2 py-1 rounded-lg text-xs font-black transition-all shrink-0"
                  style={{ background: time === t ? "#ffcc02" : "rgba(255,255,255,0.1)", color: time === t ? "#111" : "rgba(255,255,255,0.6)" }}>
                  {t < 60 ? `${t}s` : `${t / 60}m`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-white/40 shrink-0" />
            <div className="flex gap-1">
              {POINT_OPTIONS.map(p => (
                <button key={p.value} onClick={() => changePoints(p.value)}
                  className="px-2 py-1 rounded-lg text-xs font-black transition-all shrink-0"
                  style={{ background: points === p.value ? "#7b2ff7" : "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveStatus === "saving" && <span className="text-xs text-white/40 font-bold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
          {saveStatus === "saved"  && <span className="text-xs text-green-400 font-bold">✓ Saved</span>}
          {saveStatus === "error"  && <span className="text-xs text-red-400 font-bold flex items-center gap-1"><CloudOff className="w-3 h-3" /> Offline</span>}
          <button onClick={onDelete} className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Question text ─────────────────────────────────────────────── */}
      <div className="rounded-3xl border-2 border-white/10 hover:border-white/20 focus-within:border-yellow-400 transition-all overflow-hidden" style={{ background: "#fff", minHeight: 120 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Start typing your question..."
          rows={3}
          className="w-full p-5 md:p-7 text-center text-2xl md:text-4xl font-display font-black bg-transparent border-none outline-none resize-none text-gray-900 placeholder:text-gray-300"
        />
      </div>

      {/* ── Image URL ─────────────────────────────────────────────────── */}
      <ImageUrlInput quizId={quizId} questionId={question.id} currentUrl={question.imageUrl || ""} onSaved={() => {}} />

      {/* ── Audio URL (audio type only) ───────────────────────────────── */}
      {isAudio && (
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full" style={{ height: 48 }} />
          )}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="text-lg shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>♪</span>
            <input
              value={audioUrl}
              onChange={e => handleAudioUrlChange(e.target.value)}
              placeholder="Paste audio URL (.mp3, .ogg, .wav)…"
              className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/20 outline-none border-none"
            />
            {audioUrlSaving && <Loader2 className="w-3 h-3 animate-spin shrink-0 text-white/30" />}
            {audioUrl && !audioUrlSaving && (
              <button onClick={() => { setAudioUrl(""); handleAudioUrlChange(""); }}
                className="text-white/30 hover:text-red-400 transition-colors shrink-0 text-xs font-bold">✕</button>
            )}
          </div>
        </div>
      )}

      {/* ── Free text answer input (short_answer type) ────────────────── */}
      {isTextBased && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border-2 border-white/10 hover:border-white/20 focus-within:border-yellow-400 transition-all overflow-hidden p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">Expected Correct Answer</div>
            <input
              value={correct}
              onChange={e => { setCorrect(e.target.value); scheduleAutoSave(text, [], e.target.value, time, points, qType); }}
              placeholder="Type the model answer (AI will grade player responses against this)…"
              className="w-full bg-transparent text-white text-base font-bold outline-none border-none placeholder:text-white/20"
            />
          </div>
          <div className="text-center py-2 px-4 rounded-2xl text-sm font-bold" style={{ background: "rgba(123,47,247,0.15)", color: "#a78bfa", border: "1px solid rgba(123,47,247,0.3)" }}>
            ✨ Players type their answer — AI grades it automatically
          </div>
        </div>
      )}

      {/* ── Answer blocks (MC and audio types) ────────────────────────── */}
      {!isTextBased && (
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {activeBlocks.map((b, i) => {
          const optValue = qType === "true_false" ? b.label : options[i];
          const isCorrect = correct !== "" && correct === optValue;
          const isOptional = (qType === "multiple_choice" && i === 3) || (qType === "multiple_choice_3" && i === 2);
          const isLastOdd = qType === "multiple_choice_3" && i === 2;

          return (
            <div key={i}
              className={`relative rounded-2xl overflow-hidden transition-all${isLastOdd ? " col-span-2" : ""}`}
              style={{
                outline: isCorrect ? `4px solid #fff` : "none",
                boxShadow: isCorrect ? `0 0 0 2px ${b.bg}, 0 4px 24px ${b.bg}66` : undefined,
              }}
            >
              <div className="flex items-center" style={{ background: b.bg, minHeight: 68 }}>
                {/* Shape icon */}
                <div className="w-12 md:w-16 h-full self-stretch flex items-center justify-center shrink-0 text-2xl md:text-3xl text-white font-bold"
                  style={{ background: "rgba(0,0,0,0.15)", minHeight: 68 }}>
                  {b.shape}
                </div>

                {/* Text / fixed label */}
                {qType === "true_false" ? (
                  <span className="flex-1 px-3 text-white text-lg md:text-2xl font-display font-black">{b.label}</span>
                ) : (
                  <input
                    value={options[i]}
                    onChange={e => setOpt(i, e.target.value)}
                    placeholder={isOptional ? `${b.label} (optional)` : b.label}
                    className="flex-1 h-full bg-transparent border-none outline-none text-white text-base md:text-xl font-display font-black px-2 md:px-4 placeholder:text-white/35 self-stretch"
                    style={{ minHeight: 68 }}
                  />
                )}

                {/* ── Correct answer button ── */}
                <button
                  onClick={() => markCorrect(optValue)}
                  title={isCorrect ? "Correct answer ✓" : "Mark as correct answer"}
                  className="mr-2 md:mr-3 shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 border-2 transition-all"
                  style={{
                    minWidth: 54,
                    borderColor: isCorrect ? "#fff" : "rgba(255,255,255,0.3)",
                    background: isCorrect ? "#fff" : "rgba(0,0,0,0.25)",
                  }}
                >
                  {isCorrect
                    ? <CheckCircle2 className="w-5 h-5" style={{ color: b.bg }} />
                    : <span className="text-white/60 text-base leading-none">○</span>
                  }
                  <span className="text-[9px] font-black leading-none" style={{ color: isCorrect ? b.bg : "rgba(255,255,255,0.5)" }}>
                    {isCorrect ? "CORRECT" : "SET ✓"}
                  </span>
                </button>
              </div>

              {/* Bottom shadow strip */}
              <div className="h-2" style={{ background: b.shadow }} />

              {/* Optional badge */}
              {isOptional && !options[i] && (
                <div className="absolute top-1.5 left-16 text-[10px] font-black uppercase tracking-widest text-white/40 px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(0,0,0,0.2)" }}>
                  optional
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* ── Correct answer status (MC types) ──────────────────────────── */}
      {!isTextBased && (
      <div className="text-center py-2 px-4 rounded-2xl text-sm font-bold transition-all"
        style={{
          background: correct ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)",
          color: correct ? "#4ade80" : "rgba(255,255,255,0.25)",
          border: `1px solid ${correct ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.06)"}`,
        }}>
        {correct
          ? <>✓ Correct answer: <span className="text-white">{correct}</span></>
          : "☝ Click the circle on an answer to mark it as correct"}
      </div>
      )}
    </div>
  );
}

function ImageUrlInput({ quizId, questionId, currentUrl, onSaved }: { quizId: number; questionId: number; currentUrl: string; onSaved: () => void }) {
  const [url, setUrl] = useState(currentUrl);
  const [saving, setSaving] = useState(false);
  const updateMut = useUpdateQuestion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = async (v: string) => {
    setSaving(true);
    try {
      await updateMut.mutateAsync({ quizId, id: questionId, data: { imageUrl: v || null } } as any);
      onSaved();
    } catch {}
    setSaving(false);
  };

  const handleChange = (v: string) => {
    setUrl(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(v), 1200);
  };

  const { upload, uploading, progress } = useImageUpload(useCallback((servingUrl: string) => {
    setUrl(servingUrl);
    save(servingUrl);
  }, []));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
      {url && !uploading && (
        <img src={url} alt="Question image preview" className="w-full max-h-40 object-cover"
          onError={e => (e.currentTarget.style.display = "none")}
          onLoad={e => (e.currentTarget.style.display = "block")} />
      )}
      {uploading && (
        <div className="w-full h-16 flex flex-col items-center justify-center gap-1">
          <div className="w-3/4 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-purple-400 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-white/40 text-xs font-bold">Uploading… {progress}%</span>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Image className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
        <input
          value={url}
          onChange={e => handleChange(e.target.value)}
          placeholder="Paste URL or upload a file…"
          className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/20 outline-none border-none"
        />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          title="Upload image"
          className="shrink-0 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        </button>
        {saving && <Loader2 className="w-3 h-3 animate-spin shrink-0 text-white/30" />}
        {url && !saving && !uploading && (
          <button onClick={() => { setUrl(""); save(""); }}
            className="text-white/30 hover:text-red-400 transition-colors shrink-0 text-xs font-bold">✕</button>
        )}
      </div>
    </div>
  );
}
