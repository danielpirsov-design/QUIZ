import { AppLayout } from "@/components/layout/AppLayout";
import { useDiscoverQuizzes } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Compass, Play, Users, BrainCircuit, Dumbbell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const CARD_COLORS = [
  { from: "#7c3aed", to: "#a855f7" },
  { from: "#db2777", to: "#ec4899" },
  { from: "#0891b2", to: "#06b6d4" },
  { from: "#d97706", to: "#fbbf24" },
  { from: "#059669", to: "#34d399" },
  { from: "#6d28d9", to: "#8b5cf6" },
];

export default function DiscoverPage() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  // Debounce: wait 350 ms after the user stops typing before sending the query
  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const { data: quizzes, isLoading } = useDiscoverQuizzes({ search });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5 text-sm font-bold"
            style={{ background: "rgba(6,182,212,0.1)", borderColor: "rgba(6,182,212,0.25)", color: "#06b6d4" }}>
            <Compass className="w-4 h-4" /> Browse Community Quizzes
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black text-white mb-4">
            Discover <span className="gradient-text-cyan-blue">Quizzes</span>
          </h1>
          <p className="text-lg font-medium max-w-xl mx-auto mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            Search any topic, series, or subject — then practice right away.
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: "rgba(255,255,255,0.35)" }} />
            <input
              className="w-full h-14 pl-14 pr-5 rounded-2xl text-lg font-medium text-white border outline-none transition-all focus:border-cyan-500/50"
              style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}
              placeholder="Search any topic, series, show…"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
            />
            {input && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-lg"
                style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.07)" }}
                onClick={() => { setInput(""); setSearch(""); }}
              >
                Clear
              </button>
            )}
          </div>

          {search && !isLoading && (
            <p className="mt-3 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
              {quizzes?.length ?? 0} result{quizzes?.length !== 1 ? "s" : ""} for <span className="text-white/60">"{search}"</span>
            </p>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          </div>
        ) : quizzes?.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">No quizzes found</h3>
            <p style={{ color: "rgba(255,255,255,0.35)" }}>Try a different search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {quizzes?.map((quiz, idx) => {
              const c = CARD_COLORS[idx % CARD_COLORS.length];
              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4) }}
                  className="group flex flex-col rounded-3xl border overflow-hidden hover:-translate-y-1 transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  {/* Thumbnail */}
                  <div className="relative h-32 overflow-hidden cursor-pointer" style={{ background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)` }}
                    onClick={() => setLocation(`/quizzes/${quiz.id}`)}>
                    {quiz.coverImageUrl ? (
                      <img src={quiz.coverImageUrl} alt={quiz.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BrainCircuit className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl text-xs font-black text-white"
                      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
                      {quiz.questionCount}Q
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="font-display font-black text-white mb-1 line-clamp-2 leading-snug">{quiz.title}</h3>
                    <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                      By {quiz.creatorName}
                      <VerifiedBadge role={(quiz as any).creatorRole ?? ""} size="sm" />
                    </p>
                    {quiz.description && (
                      <p className="text-xs line-clamp-2 mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>{quiz.description}</p>
                    )}

                    <div className="mt-auto flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs font-bold mr-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <Users className="w-3.5 h-3.5" /> {quiz.timesPlayed}
                      </div>
                      <Link href={`/quizzes/${quiz.id}`}>
                        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all hover:brightness-110"
                          style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.12)", background: "transparent" }}>
                          View
                        </button>
                      </Link>
                      <Link href={`/practice/${quiz.id}`}>
                        <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-black transition-all hover:brightness-110"
                          style={{ background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)` }}>
                          <Dumbbell className="w-3.5 h-3.5" /> Practice
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
