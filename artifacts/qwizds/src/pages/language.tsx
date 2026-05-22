import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, Plus, BookOpen, Trash2, Play, Sparkles, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LANG_FLAGS: Record<string, string> = {
  Spanish: "🇪🇸", French: "🇫🇷", German: "🇩🇪", Italian: "🇮🇹",
  Portuguese: "🇧🇷", Japanese: "🇯🇵", Chinese: "🇨🇳", Korean: "🇰🇷",
  Russian: "🇷🇺", Arabic: "🇸🇦", Hindi: "🇮🇳", Dutch: "🇳🇱",
  Polish: "🇵🇱", Turkish: "🇹🇷", Swedish: "🇸🇪", English: "🇬🇧",
  Greek: "🇬🇷", Hebrew: "🇮🇱", Thai: "🇹🇭", Vietnamese: "🇻🇳",
};

const LANG_COLORS = [
  "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
  "linear-gradient(135deg, #db2777 0%, #ec4899 100%)",
  "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
  "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
  "linear-gradient(135deg, #c2410c 0%, #f97316 100%)",
];

function getFlag(lang: string) {
  return LANG_FLAGS[lang] ?? "🌐";
}

type LanguageSet = {
  id: number;
  title: string;
  nativeLanguage: string;
  targetLanguage: string;
  wordCount: number;
  createdAt: string;
};

function LanguagePage() {
  const [sets, setSets] = useState<LanguageSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${BASE}/api/language-sets`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { setSets(Array.isArray(data) ? data : []); })
      .catch(() => setSets([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this language set?")) return;
    await fetch(`${BASE}/api/language-sets/${id}`, { method: "DELETE", credentials: "include" });
    setSets(s => s.filter(x => x.id !== id));
    toast({ title: "Set deleted" });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", boxShadow: "0 0 24px rgba(124,58,237,0.5)" }}>
              <Languages className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black text-white">Language Learning</h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                AI-powered flashcards and vocabulary games
              </p>
            </div>
          </div>
          <Link href="/language/create">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
            >
              <Plus className="w-4 h-4" />
              New Set
            </motion.button>
          </Link>
        </div>

        {/* Body */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 rounded-3xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        ) : sets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center py-24 rounded-3xl border"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="text-7xl mb-5">🌍</div>
            <h2 className="text-2xl font-display font-black text-white mb-2">Start learning a language</h2>
            <p className="text-sm mb-8 max-w-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Create your first vocabulary set with AI or add words manually — flashcards and games included.
            </p>
            <Link href="/language/create">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" }}
              >
                <Sparkles className="w-4 h-4" />
                Create with AI
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {sets.map((set, i) => (
                <motion.div
                  key={set.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/language/${set.id}`}>
                    <div
                      className="relative rounded-3xl border overflow-hidden cursor-pointer group transition-all hover:-translate-y-1"
                      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      {/* Color bar */}
                      <div className="h-1.5 w-full" style={{ background: LANG_COLORS[i % LANG_COLORS.length] }} />

                      <div className="p-6">
                        {/* Flag + languages */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{getFlag(set.targetLanguage)}</span>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                                {set.nativeLanguage} → {set.targetLanguage}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={e => handleDelete(set.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-500/20 text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title */}
                        <h3 className="font-display font-black text-white text-lg leading-tight mb-1 line-clamp-2">
                          {set.title}
                        </h3>

                        {/* Word count */}
                        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {set.wordCount} {set.wordCount === 1 ? "word" : "words"}
                        </p>

                        {/* Study button */}
                        <div className="mt-4 flex items-center gap-2">
                          <div
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm text-white transition-all group-hover:brightness-110"
                            style={{ background: LANG_COLORS[i % LANG_COLORS.length] }}
                          >
                            <Play className="w-3.5 h-3.5" />
                            Study
                          </div>
                          <div
                            className="flex items-center justify-center p-2.5 rounded-xl font-black text-sm transition-all"
                            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function LanguagePageRoute() {
  return <ProtectedRoute><LanguagePage /></ProtectedRoute>;
}
