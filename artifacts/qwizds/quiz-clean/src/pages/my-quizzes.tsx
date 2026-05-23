import { ProtectedRoute } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListQuizzes, useCreateQuiz, useDeleteQuiz, useUpdateQuiz } from "@workspace/api-client-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Edit2, Trash2, Play, BrainCircuit, Clock, Search, Globe, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const CARD_GRADIENTS = [
  "from-violet-600 to-purple-700",
  "from-blue-600 to-cyan-700",
  "from-rose-600 to-pink-700",
  "from-amber-500 to-orange-600",
  "from-emerald-600 to-teal-700",
  "from-indigo-600 to-violet-700",
];

const QUIZ_EMOJIS = ["🧠", "🎯", "🔥", "⚡", "🌟", "🎓", "🚀", "🎪", "💡", "🦄"];

export default function MyQuizzes() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <MyQuizzesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}

function MyQuizzesContent() {
  const [search, setSearch]           = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [newTitle, setNewTitle]       = useState("");
  const [visibility, setVisibility]   = useState<"public" | "private">("private");

  const { data: quizzes, isLoading } = useListQuizzes();
  const createMut   = useCreateQuiz();
  const deleteMut   = useDeleteQuiz();
  const updateMut   = useUpdateQuiz();
  const [, setLocation] = useLocation();
  const { toast }       = useToast();
  const queryClient     = useQueryClient();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const toggleVisibility = async (id: number, current: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const next = current === "public" ? "private" : "public";
    setTogglingId(id);
    try {
      await updateMut.mutateAsync({ id, data: { visibility: next } });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({ title: next === "public" ? "Quiz is now Public 🌍" : "Quiz is now Private 🔒" });
    } catch { toast({ title: "Failed to update visibility", variant: "destructive" }); }
    finally { setTogglingId(null); }
  };

  const filtered = (quizzes || []).filter(q => q.title.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await createMut.mutateAsync({ data: { title: newTitle, visibility } });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      setShowCreate(false);
      setNewTitle("");
      setLocation(`/quizzes/${res.id}/edit`);
    } catch { toast({ title: "Error creating quiz", variant: "destructive" }); }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this quiz?")) return;
    await deleteMut.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
    toast({ title: "Quiz deleted" });
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #46178f 0%, #1a1a2e 260px)" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display font-black text-white">My Quizzes</h1>
            <p className="text-white/50 font-medium mt-1">{quizzes?.length ?? 0} quizzes created</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-black text-lg shadow-xl hover:brightness-110 transition-all"
            style={{ background: "#ffcc02", boxShadow: "0 6px 0 #b8960a" }}
          >
            <Plus className="w-5 h-5" /> Create
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quizzes..."
            className="w-full pl-12 pr-4 h-12 rounded-2xl font-medium text-white placeholder:text-white/30 border border-white/10 outline-none focus:border-yellow-400 transition-all"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-52 rounded-3xl animate-pulse" style={{ background: "rgba(255,255,255,0.07)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-7xl mb-4">🧠</div>
            <h3 className="text-2xl font-display font-black text-white mb-2">
              {search ? "No quizzes match" : "No quizzes yet"}
            </h3>
            <p className="text-white/40 font-medium mb-6">
              {search ? "Try a different search" : "Create your first quiz to get started!"}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)}
                className="px-8 py-3 rounded-2xl font-black text-black"
                style={{ background: "#ffcc02" }}>
                Create your first quiz
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filtered.map((quiz, i) => {
                const gradient = CARD_GRADIENTS[quiz.id % CARD_GRADIENTS.length];
                const emoji    = QUIZ_EMOJIS[quiz.id % QUIZ_EMOJIS.length];
                return (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`relative bg-gradient-to-br ${gradient} rounded-3xl overflow-hidden shadow-xl group cursor-pointer`}
                    onClick={() => setLocation(`/quizzes/${quiz.id}/edit`)}
                  >
                    {/* Thumbnail area */}
                    <div className="h-28 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-black/10" />
                      <span className="text-6xl drop-shadow-lg">{emoji}</span>
                    </div>

                    {/* Info */}
                    <div className="bg-white p-4 flex flex-col gap-3">
                      <div>
                        <h3 className="font-display font-black text-gray-900 text-lg leading-tight line-clamp-2 mb-1">
                          {quiz.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                          <span className="flex items-center gap-1"><BrainCircuit className="w-3.5 h-3.5" /> {quiz.questionCount} Qs</span>
                          <span className="flex items-center gap-1">
                            {quiz.visibility === "public" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            {quiz.visibility}
                          </span>
                          {quiz.timesPlayed > 0 && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {quiz.timesPlayed} plays</span>}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/quizzes/${quiz.id}`} onClick={e => e.stopPropagation()} className="flex-1">
                          <button
                            className="w-full py-2 rounded-xl font-black text-sm text-white flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
                            style={{ background: "#46178f" }}
                          >
                            <Play className="w-4 h-4 fill-current" /> Play
                          </button>
                        </Link>
                        <Link href={`/quizzes/${quiz.id}/edit`} onClick={e => e.stopPropagation()} className="flex-1">
                          <button className="w-full py-2 rounded-xl font-black text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center justify-center gap-1.5 transition-all">
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                        </Link>
                        <button
                          onClick={e => toggleVisibility(quiz.id, quiz.visibility, e)}
                          disabled={togglingId === quiz.id}
                          title={quiz.visibility === "public" ? "Make Private" : "Make Public"}
                          className="px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                          style={{
                            color: quiz.visibility === "public" ? "#16a34a" : "#6b7280",
                            background: quiz.visibility === "public" ? "#dcfce7" : "#f3f4f6",
                          }}
                        >
                          {quiz.visibility === "public" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={e => handleDelete(quiz.id, e)}
                          className="px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="w-full max-w-md rounded-3xl p-8 shadow-2xl"
              style={{ background: "#2d2d4e", border: "1px solid rgba(255,255,255,0.1)" }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-3xl font-display font-black text-white mb-6">Create a quiz</h2>
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-white/60 font-bold text-sm mb-2 uppercase tracking-wider">Quiz title</label>
                  <input
                    autoFocus
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. History of Rome"
                    className="w-full px-4 py-3 rounded-2xl font-bold text-white text-lg border-2 border-white/10 outline-none focus:border-yellow-400 transition-all"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                  />
                </div>

                <div>
                  <label className="block text-white/60 font-bold text-sm mb-2 uppercase tracking-wider">Visibility</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["private", "public"] as const).map(v => (
                      <button key={v} type="button" onClick={() => setVisibility(v)}
                        className="py-3 rounded-2xl font-black text-sm capitalize border-2 transition-all flex items-center justify-center gap-2"
                        style={{
                          background: visibility === v ? "rgba(255,204,2,0.15)" : "rgba(255,255,255,0.05)",
                          borderColor: visibility === v ? "#ffcc02" : "rgba(255,255,255,0.1)",
                          color: visibility === v ? "#ffcc02" : "rgba(255,255,255,0.5)",
                        }}>
                        {v === "private" ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createMut.isPending || !newTitle.trim()}
                  className="w-full py-4 rounded-2xl font-black text-black text-lg mt-2 disabled:opacity-50 transition-all hover:brightness-110"
                  style={{ background: "#ffcc02", boxShadow: "0 4px 0 #b8960a" }}
                >
                  {createMut.isPending ? "Creating..." : "Create & Edit →"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
