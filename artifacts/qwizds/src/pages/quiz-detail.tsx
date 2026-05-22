import { useRoute, Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetQuiz, useCreateGame } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Play, Users, Clock, Edit2, Share2, BrainCircuit, Loader2, Dumbbell, Flame, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getGameColor } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function QuizDetailPage() {
  const [, params] = useRoute("/quizzes/:id");
  const id = parseInt(params?.id || "0");
  const { data: quiz, isLoading } = useGetQuiz(id);
  const createGameMut = useCreateGame();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role === "owner" || (user && (quiz as any)?.creatorId === user.id);
  const [showModes, setShowModes] = useState(false);
  const [startingMode, setStartingMode] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const handleWhatsAppShare = async () => {
    setSharing(true);
    try {
      let shareUrl: string;
      if ((quiz as any).visibility === "private" && canEdit) {
        const res = await fetch(`${BASE}/api/quizzes/${id}/share-token`, { method: "POST", credentials: "include" });
        const { token } = await res.json();
        shareUrl = `${window.location.origin}${BASE}/quizzes/${id}?share=${token}`;
      } else {
        shareUrl = `${window.location.origin}${BASE}/quizzes/${id}`;
      }
      const text = encodeURIComponent(`Check out this quiz: "${(quiz as any).title}"\n${shareUrl}`);
      window.open(`https://wa.me/?text=${text}`, "_blank");
    } catch {
      toast({ title: "Failed to generate share link", variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-32"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div></AppLayout>;
  if (!quiz) return <AppLayout><div className="text-center py-32 font-bold text-xl">Quiz not found</div></AppLayout>;

  const handleHost = async (mode: "live" | "bomb" | "classic_plus" | "volcano" | "relay" | "self_paced") => {
    setStartingMode(mode);
    try {
      const res = await createGameMut.mutateAsync({ data: { quizId: id, gameMode: mode } });
      setLocation(`/host/${(res as any).hostToken}`);
    } catch {
      toast({ title: "Failed to start game", variant: "destructive" });
      setStartingMode(null);
    }
  };

  const MODES = [
    {
      key: "live" as const,
      emoji: "🎮",
      label: "Classic",
      sublabel: "Standard",
      description: "Questions with timers. Leaderboard after each round. Question shown on the host screen for the whole class.",
      gradient: "linear-gradient(135deg,#46178f,#7b2ff7)",
      glow: "rgba(123,47,247,0.35)",
      border: "rgba(168,85,247,0.5)",
    },
    {
      key: "classic_plus" as const,
      emoji: "📱",
      label: "Classic+",
      sublabel: "Question on phone",
      description: "Same as Classic but the question also appears on each player's phone — great for remote play or smaller screens.",
      gradient: "linear-gradient(135deg,#0f4c81,#1d7fc4)",
      glow: "rgba(29,127,196,0.35)",
      border: "rgba(56,189,248,0.5)",
    },
    {
      key: "bomb" as const,
      emoji: "💣",
      label: "Bomb Mode",
      sublabel: "Last Man Standing",
      description: "Timer shrinks every round: 30s → 20s → 15s → 10s → 5s. One wrong answer and you're out. Survivors win together!",
      gradient: "linear-gradient(135deg,#991b1b,#b45309)",
      glow: "rgba(180,83,9,0.35)",
      border: "rgba(251,146,60,0.5)",
    },
    {
      key: "volcano" as const,
      emoji: "🌋",
      label: "Volcano",
      sublabel: "Host + Phone",
      description: "Question shown on everyone's phone. Lava-themed — wrong answers heat up the volcano. Race to the top!",
      gradient: "linear-gradient(135deg,#7c1a09,#dc2626)",
      glow: "rgba(220,38,38,0.35)",
      border: "rgba(248,113,113,0.5)",
    },
    {
      key: "relay" as const,
      emoji: "🏁",
      label: "Relay Race",
      sublabel: "Team Battle",
      description: "Players split into Team Red and Team Blue. Each question, one player per team answers in turn. Race to the finish!",
      gradient: "linear-gradient(135deg,#14532d,#16a34a)",
      glow: "rgba(22,163,74,0.35)",
      border: "rgba(74,222,128,0.5)",
    },
    {
      key: "self_paced" as const,
      emoji: "📖",
      label: "Self-Paced",
      sublabel: "Go at Your Own Speed",
      description: "Players answer at their own pace — no waiting for the host. Like Quizizz: everyone moves through questions independently.",
      gradient: "linear-gradient(135deg,#1d4ed8,#7c3aed)",
      glow: "rgba(124,58,237,0.35)",
      border: "rgba(167,139,250,0.5)",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header Hero */}
        <div className="bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${quiz.visibility === 'public' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                {quiz.visibility}
              </span>
              <span className="text-muted-foreground text-sm font-semibold flex items-center gap-1.5">
                By {quiz.creatorName}
                <VerifiedBadge role={(quiz as any).creatorRole ?? ""} size="sm" />
                • {format(new Date(quiz.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-black text-foreground mb-4 leading-tight">
              {quiz.title}
            </h1>
            
            {quiz.description && (
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl font-medium">
                {quiz.description}
              </p>
            )}
            
            {/* Action buttons row */}
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <Button
                onClick={() => setShowModes(v => !v)}
                size="lg"
                className="h-14 px-8 text-lg font-bold rounded-2xl btn-game-3d shadow-xl shadow-primary/20"
              >
                <Play className="w-6 h-6 mr-2 fill-current" />
                Host Live Game
                {showModes ? <ChevronUp className="w-5 h-5 ml-2" /> : <ChevronDown className="w-5 h-5 ml-2" />}
              </Button>
              <Link href={`/practice/${id}`}>
                <Button size="lg" className="h-14 px-6 text-base font-bold rounded-2xl"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }}>
                  <Dumbbell className="w-5 h-5 mr-2" /> Solo Practice
                </Button>
              </Link>
              {(quiz.questions?.length ?? quiz.questionCount ?? 0) >= 6 && (
                <Link href={`/volcano/${id}`}>
                  <Button size="lg" className="h-14 px-6 text-base font-bold rounded-2xl"
                    style={{ background: "linear-gradient(135deg,#dc2626,#f97316)", color: "#fff", boxShadow: "0 0 20px rgba(220,38,38,0.3)" }}>
                    <Flame className="w-5 h-5 mr-2" /> Volcano Mode
                  </Button>
                </Link>
              )}
              {canEdit && (
                <Link href={`/quizzes/${id}/edit`}>
                  <Button size="lg" variant="secondary" className="h-14 px-6 text-base font-bold rounded-2xl">
                    <Edit2 className="w-5 h-5 mr-2" /> Edit
                  </Button>
                </Link>
              )}
              <Button size="icon" variant="outline" className="h-14 w-14 rounded-2xl" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "Link copied to clipboard!" });
              }}>
                <Share2 className="w-6 h-6 text-muted-foreground" />
              </Button>
              <Button
                size="lg"
                disabled={sharing}
                onClick={handleWhatsAppShare}
                className="h-14 px-5 text-base font-bold rounded-2xl gap-2"
                style={{ background: "#25D366", color: "#fff", boxShadow: "0 0 20px rgba(37,211,102,0.3)" }}
              >
                {sharing
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                }
                Share on WhatsApp
              </Button>
            </div>

            {/* Mode picker panel */}
            <AnimatePresence>
              {showModes && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {MODES.map(m => (
                      <motion.button
                        key={m.key}
                        onClick={() => handleHost(m.key)}
                        disabled={!!startingMode}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative rounded-2xl p-5 text-left overflow-hidden group transition-all"
                        style={{
                          background: m.gradient,
                          border: `2px solid ${m.border}`,
                          boxShadow: `0 0 28px ${m.glow}`,
                          opacity: startingMode && startingMode !== m.key ? 0.5 : 1,
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <span className="text-4xl leading-none select-none shrink-0">{m.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-display font-black text-white text-xl">{m.label}</span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/70">{m.sublabel}</span>
                            </div>
                            <p className="text-white/70 text-sm font-medium leading-snug">{m.description}</p>
                          </div>
                          {startingMode === m.key && (
                            <Loader2 className="w-5 h-5 animate-spin text-white shrink-0 mt-0.5" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Questions", value: quiz.questionCount, icon: <BrainCircuit /> },
            { label: "Plays", value: quiz.timesPlayed, icon: <Users /> },
            { label: "Avg Time", value: "~15m", icon: <Clock /> },
            { label: "Category", value: quiz.category || "General", icon: <BrainCircuit /> },
          ].map((s, i) => (
            <div key={i} className="bg-muted/50 border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-primary mb-2">{s.icon}</div>
              <div className="text-2xl font-black font-display text-foreground">{s.value}</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Question Preview */}
        <div>
          <h2 className="text-2xl font-display font-bold mb-6">Questions ({quiz.questions?.length})</h2>
          <div className="space-y-4">
            {quiz.questions?.map((q, i) => (
              <div key={q.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-muted-foreground uppercase">Question {i + 1}</span>
                  <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md">{q.timeLimit}s • {q.points}pts</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">{q.questionText}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {q.options.map((opt, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border-2 flex items-center ${opt === q.correctAnswer ? 'border-success bg-success/10 text-success-foreground' : 'border-border bg-background'}`}>
                      <div className={`w-4 h-4 rounded-sm mr-3 ${getGameColor(idx)}`}></div>
                      <span className={`font-semibold ${opt === q.correctAnswer ? 'text-success' : 'text-foreground'}`}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
