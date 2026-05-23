import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, Download, RotateCcw, FileText,
  GraduationCap, Plus, X, Printer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SUBJECTS = [
  "Mathematics",
  "Science",
  "English Language Arts",
  "History",
  "Geography",
  "Biology",
  "Chemistry",
  "Physics",
  "Social Studies",
  "Languages",
  "Foreign Languages",
  "Literature",
  "Computer Science",
  "Economics",
  "Psychology",
  "Philosophy",
  "Health",
  "Art",
  "Music",
  "Physical Education",
  "Religion / Ethics",
  "Other",
];

const GRADE_LEVELS = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9",
  "Grade 10", "Grade 11", "Grade 12",
];

const QUESTION_TYPES = [
  { id: "multiple_choice", label: "Multiple Choice", emoji: "🔘" },
  { id: "true_false",      label: "True or False",   emoji: "✅" },
  { id: "fill_blank",      label: "Fill in the Blank", emoji: "✏️" },
  { id: "short_answer",    label: "Short Answer",    emoji: "📝" },
  { id: "matching",        label: "Matching",        emoji: "🔗" },
];

const LOADING_STAGES = [
  "Crafting learning objectives…",
  "Writing questions…",
  "Building answer choices…",
  "Adding fill-in-the-blanks…",
  "Preparing the answer key…",
  "Formatting your worksheet…",
];

type Question = {
  id: number;
  question?: string;
  options?: string[];
  answer?: string;
  term?: string;
  definition?: string;
};

type Section = {
  type: string;
  title: string;
  instructions: string;
  wordBank?: string[];
  questions: Question[];
};

type Worksheet = {
  title: string;
  subject: string;
  gradeLevel: string;
  objectives: string[];
  sections: Section[];
  answerKey?: Record<string, string>;
};

// ── Print stylesheet injected into a pop-up window ───────────────────────────
function buildPrintHTML(title: string, html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Georgia", serif;
      color: #111;
      background: #fff;
      padding: 48px;
      max-width: 820px;
      margin: 0 auto;
    }
    .ws-header { text-align: center; margin-bottom: 28px; border-bottom: 3px double #333; padding-bottom: 16px; }
    .ws-title { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 6px; }
    .ws-meta { font-size: 13px; color: #555; display: flex; justify-content: center; gap: 28px; margin-top: 8px; }
    .ws-meta span { border-bottom: 1px solid #bbb; padding-bottom: 2px; }
    .ws-name-line { display: flex; justify-content: space-between; margin: 18px 0 28px 0; gap: 32px; }
    .ws-name-line label { font-size: 13px; font-weight: 700; display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .ws-name-line .line { border-bottom: 1.5px solid #333; height: 22px; }
    .ws-objectives { margin-bottom: 24px; background: #f8f8f8; border: 1px solid #ddd; padding: 14px 18px; border-radius: 6px; }
    .ws-objectives h4 { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: #555; margin-bottom: 8px; }
    .ws-objectives ul { padding-left: 20px; }
    .ws-objectives li { font-size: 12px; color: #444; margin-bottom: 4px; }
    .ws-section { margin-bottom: 30px; }
    .ws-section-header { background: #222; color: #fff; padding: 8px 14px; border-radius: 4px 4px 0 0; font-size: 14px; font-weight: 900; letter-spacing: 0.3px; }
    .ws-instructions { font-size: 12px; color: #555; font-style: italic; padding: 8px 14px; background: #f5f5f5; border: 1px solid #e0e0e0; border-top: none; margin-bottom: 12px; }
    .ws-word-bank { padding: 8px 14px; margin-bottom: 10px; background: #fffde7; border: 1px dashed #aaa; font-size: 12px; }
    .ws-word-bank strong { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
    .ws-q { display: flex; gap: 10px; margin-bottom: 14px; padding: 0 4px; }
    .ws-q-num { font-weight: 900; font-size: 13px; min-width: 22px; padding-top: 1px; }
    .ws-q-body { flex: 1; }
    .ws-q-text { font-size: 13px; line-height: 1.55; margin-bottom: 6px; }
    .ws-options { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; padding-left: 4px; }
    .ws-option { font-size: 12.5px; padding: 2px 0; }
    .ws-blank-line { border-bottom: 1.5px solid #333; display: inline-block; min-width: 160px; height: 20px; margin: 0 4px; }
    .ws-tf-choices { display: flex; gap: 24px; margin-top: 4px; font-size: 13px; }
    .ws-tf-circle { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #333; margin-right: 6px; }
    .ws-answer-line { border-bottom: 1.5px solid #bbb; min-height: 44px; margin-top: 4px; }
    .ws-match-row { display: grid; grid-template-columns: 1fr 28px 1fr; gap: 8px; align-items: center; margin-bottom: 6px; font-size: 13px; }
    .ws-match-line { border-bottom: 1.5px solid #bbb; height: 20px; }
    .ws-answer-key { margin-top: 36px; border-top: 2px solid #333; padding-top: 16px; page-break-before: always; }
    .ws-answer-key h3 { font-size: 15px; font-weight: 900; margin-bottom: 14px; }
    .ws-answer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 16px; }
    .ws-answer-item { font-size: 12.5px; display: flex; gap: 6px; }
    .ws-answer-num { font-weight: 700; min-width: 20px; }
    @media print {
      body { padding: 28px; }
      .no-print { display: none !important; }
      a { text-decoration: none; color: inherit; }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

// ── Worksheet renderer ────────────────────────────────────────────────────────
function renderWorksheetHTML(ws: Worksheet): string {
  const header = `
    <div class="ws-header">
      <div class="ws-title">${ws.title}</div>
      <div class="ws-meta">
        <span>Subject: ${ws.subject}</span>
        <span>Grade: ${ws.gradeLevel}</span>
        <span>Date: ___________________</span>
      </div>
    </div>
    <div class="ws-name-line">
      <label>Name <div class="line"></div></label>
      <label>Class <div class="line"></div></label>
      <label>Score <div class="line"></div></label>
    </div>`;

  const objectivesHTML = ws.objectives?.length ? `
    <div class="ws-objectives">
      <h4>Learning Objectives</h4>
      <ul>${ws.objectives.map(o => `<li>${o}</li>`).join("")}</ul>
    </div>` : "";

  let qCounter = 0;
  const sectionsHTML = (ws.sections || []).map(sec => {
    const questionsHTML = (sec.questions || []).map(q => {
      qCounter++;
      const num = qCounter;

      if (sec.type === "multiple_choice") {
        const opts = (q.options || []).map(o => `<div class="ws-option">${o}</div>`).join("");
        return `<div class="ws-q"><div class="ws-q-num">${num}.</div><div class="ws-q-body"><div class="ws-q-text">${q.question}</div><div class="ws-options">${opts}</div></div></div>`;
      }
      if (sec.type === "true_false") {
        return `<div class="ws-q"><div class="ws-q-num">${num}.</div><div class="ws-q-body"><div class="ws-q-text">${q.question}</div><div class="ws-tf-choices"><span><span class="ws-tf-circle"></span>True</span><span><span class="ws-tf-circle"></span>False</span></div></div></div>`;
      }
      if (sec.type === "fill_blank") {
        const filled = (q.question || "").replace(/_+/g, '<span class="ws-blank-line"></span>');
        return `<div class="ws-q"><div class="ws-q-num">${num}.</div><div class="ws-q-body"><div class="ws-q-text">${filled}</div></div></div>`;
      }
      if (sec.type === "short_answer") {
        return `<div class="ws-q"><div class="ws-q-num">${num}.</div><div class="ws-q-body"><div class="ws-q-text">${q.question}</div><div class="ws-answer-line"></div></div></div>`;
      }
      if (sec.type === "matching") {
        return `<div class="ws-q"><div class="ws-q-num">${num}.</div><div class="ws-q-body"><div class="ws-match-row"><div class="ws-q-text">${q.term}</div><div></div><div class="ws-match-line"></div></div></div></div>`;
      }
      return `<div class="ws-q"><div class="ws-q-num">${num}.</div><div class="ws-q-body"><div class="ws-q-text">${q.question || q.term}</div></div></div>`;
    }).join("");

    const wordBankHTML = sec.wordBank?.length ? `
      <div class="ws-word-bank">
        <strong>Word Bank</strong>
        ${sec.wordBank.join(" &nbsp;·&nbsp; ")}
      </div>` : "";

    return `
      <div class="ws-section">
        <div class="ws-section-header">${sec.title}</div>
        <div class="ws-instructions">${sec.instructions}</div>
        ${wordBankHTML}
        ${questionsHTML}
      </div>`;
  }).join("");

  const answerKeyHTML = ws.answerKey && Object.keys(ws.answerKey).length ? `
    <div class="ws-answer-key">
      <h3>Answer Key</h3>
      <div class="ws-answer-grid">
        ${Object.entries(ws.answerKey).map(([k, v]) =>
          `<div class="ws-answer-item"><span class="ws-answer-num">${k}.</span><span>${v}</span></div>`
        ).join("")}
      </div>
    </div>` : "";

  return header + objectivesHTML + sectionsHTML + answerKeyHTML;
}

// ── Main page ─────────────────────────────────────────────────────────────────
function WorksheetPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [subject, setSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [topic, setTopic] = useState("");
  const effectiveSubject = subject === "Other" ? customSubject.trim() : subject;
  const [gradeLevel, setGradeLevel] = useState("Grade 5");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["multiple_choice", "short_answer"]);
  const [questionCount, setQuestionCount] = useState(10);
  const [customInstructions, setCustomInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);

  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(t => t !== id) : prev) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!effectiveSubject || !topic) return;
    setLoading(true);
    setWorksheet(null);
    setLoadingStage(0);

    const interval = setInterval(() => {
      setLoadingStage(s => (s + 1) % LOADING_STAGES.length);
    }, 1200);

    try {
      const res = await fetch(`${BASE}/api/ai/generate-worksheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: effectiveSubject, topic, gradeLevel, questionTypes: selectedTypes, questionCount, customInstructions }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setWorksheet(data);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!worksheet) return;
    const html = renderWorksheetHTML(worksheet);
    const fullHTML = buildPrintHTML(worksheet.title, html);
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) { toast({ title: "Allow pop-ups to download PDF", variant: "destructive" }); return; }
    printWindow.document.write(fullHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="p-3 rounded-2xl shrink-0" style={{ background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)", boxShadow: "0 0 24px rgba(6,182,212,0.5)" }}>
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-display font-black text-white">Create Worksheets</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black"
                style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", color: "#06b6d4" }}>
                <GraduationCap className="w-3 h-3" /> Teacher Only
              </span>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              AI generates a print-ready worksheet — download it as a PDF in one click
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Form ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Subject */}
            <div className="p-5 rounded-3xl border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
              <label className="text-xs font-black uppercase tracking-wider block mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Subject</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-xl px-3 h-10 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: subject ? "white" : "rgba(255,255,255,0.35)", appearance: "auto" }}
              >
                <option value="" disabled style={{ background: "#1a0050" }}>Pick a subject…</option>
                {SUBJECTS.map(s => <option key={s} value={s} style={{ background: "#1a0050", color: "white" }}>{s}</option>)}
              </select>
              {subject === "Other" && (
                <input
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  placeholder="Describe your subject…"
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-cyan-500/40 placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "white" }}
                />
              )}
            </div>

            {/* Topic */}
            <div className="p-5 rounded-3xl border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
              <label className="text-xs font-black uppercase tracking-wider block mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Topic</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. The Water Cycle, Fractions, World War II…"
                className="w-full rounded-xl px-3 py-2.5 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-cyan-500/40 placeholder:text-white/30"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "white" }}
              />
            </div>

            {/* Grade Level */}
            <div className="p-5 rounded-3xl border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
              <label className="text-xs font-black uppercase tracking-wider block mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Grade Level</label>
              <select
                value={gradeLevel}
                onChange={e => setGradeLevel(e.target.value)}
                className="w-full rounded-xl px-3 h-10 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "white", appearance: "auto" }}
              >
                {GRADE_LEVELS.map(g => <option key={g} value={g} style={{ background: "#1a0050", color: "white" }}>{g}</option>)}
              </select>
            </div>

            {/* Question Types */}
            <div className="p-5 rounded-3xl border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
              <label className="text-xs font-black uppercase tracking-wider block mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Question Types</label>
              <div className="space-y-2">
                {QUESTION_TYPES.map(t => {
                  const active = selectedTypes.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleType(t.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left"
                      style={{
                        background: active ? "rgba(6,182,212,0.18)" : "rgba(255,255,255,0.07)",
                        border: `1px solid ${active ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.14)"}`,
                        color: active ? "#06b6d4" : "rgba(255,255,255,0.45)",
                      }}
                    >
                      <span className="text-base">{t.emoji}</span>
                      {t.label}
                      {active && <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center text-xs" style={{ background: "#06b6d4", color: "white" }}>✓</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Count */}
            <div className="p-5 rounded-3xl border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
              <label className="text-xs font-black uppercase tracking-wider block mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                Questions: <span className="text-white">{questionCount}</span>
              </label>
              <input
                type="range" min={5} max={30} step={5}
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
              </div>
            </div>

            {/* Custom instructions */}
            <div className="p-5 rounded-3xl border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
              <label className="text-xs font-black uppercase tracking-wider block mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                Special Instructions <span className="normal-case font-medium">(optional)</span>
              </label>
              <textarea
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                rows={3}
                placeholder="e.g. Include a diagram, focus on causes and effects, bilingual Spanish/English…"
                className="w-full rounded-xl px-3 py-2.5 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-cyan-500/40 placeholder:text-white/30 resize-none"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "white" }}
              />
            </div>

            {/* Generate */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              disabled={loading || !effectiveSubject || !topic}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)", boxShadow: "0 0 24px rgba(6,182,212,0.4)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {LOADING_STAGES[loadingStage]}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Worksheet
                </span>
              )}
            </motion.button>
          </div>

          {/* ── Preview ── */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {!worksheet && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-96 rounded-3xl border flex flex-col items-center justify-center text-center p-10"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
                >
                  <FileText className="w-14 h-14 mb-4 opacity-20" style={{ color: "#06b6d4" }} />
                  <p className="text-base font-black text-white/30">Your worksheet will appear here</p>
                  <p className="text-sm mt-1 text-white/20">Fill in the form and click Generate</p>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-96 rounded-3xl border flex flex-col items-center justify-center gap-5"
                  style={{ background: "rgba(6,182,212,0.04)", borderColor: "rgba(6,182,212,0.15)" }}
                >
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full animate-spin"
                      style={{ background: "conic-gradient(from 0deg, #0891b2, #06b6d4, transparent)", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-7 h-7" style={{ color: "#06b6d4" }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-white text-base">Building your worksheet…</p>
                    <p className="text-sm mt-1 font-medium" style={{ color: "#06b6d4" }}>{LOADING_STAGES[loadingStage]}</p>
                  </div>
                </motion.div>
              )}

              {worksheet && !loading && (
                <motion.div key="worksheet" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  {/* Action bar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1">
                      <p className="font-black text-white text-sm truncate">{worksheet.title}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {worksheet.gradeLevel} · {worksheet.subject}
                      </p>
                    </div>
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/8"
                      style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl font-black text-black text-sm transition-all"
                      style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)", boxShadow: "0 0 16px rgba(255,204,2,0.35)" }}
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </motion.button>
                  </div>

                  {/* Worksheet preview */}
                  <div
                    className="rounded-3xl overflow-hidden border"
                    style={{ background: "white", borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <WorksheetPreview worksheet={worksheet} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── In-page preview component (styled for dark-to-light) ─────────────────────
function WorksheetPreview({ worksheet }: { worksheet: Worksheet }) {
  let qCounter = 0;

  return (
    <div className="p-8 text-black font-serif text-sm leading-relaxed max-h-[720px] overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-6 pb-4" style={{ borderBottom: "3px double #333" }}>
        <h1 className="text-xl font-black tracking-tight mb-1">{worksheet.title}</h1>
        <div className="flex justify-center gap-6 text-xs text-gray-500 mt-2">
          <span>Subject: {worksheet.subject}</span>
          <span>Grade: {worksheet.gradeLevel}</span>
          <span>Date: ___________________</span>
        </div>
      </div>

      {/* Name line */}
      <div className="flex gap-6 mb-6 text-xs">
        {["Name", "Class", "Score"].map(l => (
          <div key={l} className="flex-1">
            <span className="font-black">{l}</span>
            <div className="border-b border-gray-400 mt-1 h-5" />
          </div>
        ))}
      </div>

      {/* Objectives */}
      {worksheet.objectives?.length > 0 && (
        <div className="mb-5 bg-gray-50 border border-gray-200 rounded-md p-3">
          <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Learning Objectives</p>
          <ul className="list-disc pl-4 space-y-0.5 text-xs text-gray-600">
            {worksheet.objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}

      {/* Sections */}
      {(worksheet.sections || []).map((sec, si) => (
        <div key={si} className="mb-7">
          <div className="bg-gray-800 text-white px-3 py-1.5 rounded-t text-xs font-black tracking-wide">
            {sec.title}
          </div>
          <p className="text-xs text-gray-500 italic px-3 py-2 bg-gray-50 border border-t-0 border-gray-200 mb-3">
            {sec.instructions}
          </p>
          {sec.wordBank?.length ? (
            <div className="px-3 py-2 mb-3 bg-yellow-50 border border-dashed border-gray-300 text-xs">
              <strong className="uppercase tracking-wide text-gray-500 block mb-1">Word Bank</strong>
              {sec.wordBank.join("  ·  ")}
            </div>
          ) : null}
          {(sec.questions || []).map(q => {
            qCounter++;
            const num = qCounter;
            if (sec.type === "multiple_choice") {
              return (
                <div key={q.id} className="flex gap-2 mb-4">
                  <span className="font-black text-xs w-5 shrink-0 pt-0.5">{num}.</span>
                  <div className="flex-1">
                    <p className="mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-1">
                      {(q.options || []).map((o, i) => <span key={i} className="text-xs">{o}</span>)}
                    </div>
                  </div>
                </div>
              );
            }
            if (sec.type === "true_false") {
              return (
                <div key={q.id} className="flex gap-2 mb-4">
                  <span className="font-black text-xs w-5 shrink-0 pt-0.5">{num}.</span>
                  <div className="flex-1">
                    <p>{q.question}</p>
                    <div className="flex gap-5 mt-1 text-xs">
                      <span>○ True</span><span>○ False</span>
                    </div>
                  </div>
                </div>
              );
            }
            if (sec.type === "fill_blank") {
              const parts = (q.question || "").split(/(_+)/g);
              return (
                <div key={q.id} className="flex gap-2 mb-4">
                  <span className="font-black text-xs w-5 shrink-0 pt-0.5">{num}.</span>
                  <p className="flex-1 flex flex-wrap items-end gap-0.5">
                    {parts.map((p, i) => p.match(/^_+$/)
                      ? <span key={i} className="inline-block border-b border-gray-500 min-w-[80px] mx-1" />
                      : <span key={i}>{p}</span>)}
                  </p>
                </div>
              );
            }
            if (sec.type === "short_answer") {
              return (
                <div key={q.id} className="flex gap-2 mb-5">
                  <span className="font-black text-xs w-5 shrink-0 pt-0.5">{num}.</span>
                  <div className="flex-1">
                    <p className="mb-2">{q.question}</p>
                    <div className="border-b border-gray-300 h-9 mb-1" />
                    <div className="border-b border-gray-300 h-9" />
                  </div>
                </div>
              );
            }
            if (sec.type === "matching") {
              return (
                <div key={q.id} className="flex gap-2 mb-3">
                  <span className="font-black text-xs w-5 shrink-0 pt-0.5">{num}.</span>
                  <div className="flex-1 grid grid-cols-3 gap-2 items-center text-xs">
                    <span>{q.term}</span>
                    <span className="text-center text-gray-300">──────</span>
                    <div className="border-b border-gray-300 h-5" />
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}

      {/* Answer Key */}
      {worksheet.answerKey && Object.keys(worksheet.answerKey).length > 0 && (
        <div className="mt-6 pt-5" style={{ borderTop: "2px solid #333" }}>
          <p className="font-black text-sm mb-3">Answer Key</p>
          <div className="grid grid-cols-4 gap-x-4 gap-y-1.5">
            {Object.entries(worksheet.answerKey).map(([k, v]) => (
              <div key={k} className="text-xs flex gap-1.5">
                <span className="font-black">{k}.</span>
                <span className="text-gray-600">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorksheetRoute() {
  return (
    <ProtectedRoute allowedRoles={["teacher", "owner"]}>
      <WorksheetPage />
    </ProtectedRoute>
  );
}
