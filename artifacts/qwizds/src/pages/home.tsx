import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Play, Sparkles, Brain, Trophy, Zap, Users, Star, ArrowRight, CheckCircle } from "lucide-react";

const FLOAT_IN = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const KAHOOT_ANSWERS = [
  { bg: "#e21b3c", shape: "▲", text: "Photosynthesis" },
  { bg: "#1368ce", shape: "♦", text: "Mitosis" },
  { bg: "#d89e00", shape: "●", text: "Osmosis" },
  { bg: "#26890c", shape: "■", text: "Respiration" },
];

const STATS = [
  { value: "50K+", label: "Quizzes Created", color: "#a855f7" },
  { value: "2M+",  label: "Games Played",    color: "#ec4899" },
  { value: "120+", label: "Countries",        color: "#06b6d4" },
  { value: "4.9★", label: "Average Rating",   color: "#fbbf24" },
];

const FEATURES = [
  {
    emoji: "🧠",
    title: "AI Quiz Builder",
    desc: "Type a topic. Our GPT-5.2 AI writes 20 perfect questions instantly — with explanations and plausible distractors.",
    gradient: "from-violet-500/20 to-purple-600/10",
    border: "border-violet-500/20",
    glow: "rgba(139,92,246,0.3)",
    tag: "Powered by GPT-5.2",
    tagColor: "#a855f7",
  },
  {
    emoji: "⚡",
    title: "Live Multiplayer",
    desc: "Host on the big screen. Players join from their phones with a PIN. Questions, countdown, and leaderboards — all live.",
    gradient: "from-pink-500/20 to-rose-600/10",
    border: "border-pink-500/20",
    glow: "rgba(244,63,142,0.3)",
    tag: "Real-time WebSockets",
    tagColor: "#ec4899",
  },
  {
    emoji: "🏆",
    title: "Score & Compete",
    desc: "Speed bonuses, streaks, and animated leaderboards keep players hooked from question one to the final podium.",
    gradient: "from-cyan-500/20 to-sky-600/10",
    border: "border-cyan-500/20",
    glow: "rgba(6,182,212,0.3)",
    tag: "In-Game Rankings",
    tagColor: "#06b6d4",
  },
];

const HOW_IT_WORKS = [
  { n: "1", title: "Create your quiz", desc: "Use AI or build manually. Add questions, set time limits, pick difficulty.", color: "#a855f7" },
  { n: "2", title: "Host a live game", desc: "Share the PIN. Players join from any device — no account needed.", color: "#ec4899" },
  { n: "3", title: "Play & celebrate", desc: "Watch the real-time leaderboard. Crown the winner with confetti!", color: "#fbbf24" },
];

const MARQUEE_ITEMS = ["🔬 Science", "📚 History", "💻 Technology", "🎵 Music", "⚽ Sports", "🍕 Food", "🧠 Psychology", "🌍 Geography", "🎬 Cinema", "📐 Math", "🎨 Art", "💼 Business"];

export default function Home() {
  return (
    <AppLayout>
      <div className="relative overflow-hidden">

        {/* ── Hero section ───────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-28 overflow-hidden" style={{ minHeight: "92vh" }}>

          {/* Rich gradient background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Vivid mesh gradient */}
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(120,60,255,0.28) 0%, transparent 65%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(244,63,142,0.2) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 100% 80%, rgba(6,182,212,0.12) 0%, transparent 60%)" }} />
            <div className="blob absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, rgba(138,92,246,0.7) 0%, transparent 70%)" }} />
            <div className="blob blob-delay-4 absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-15"
              style={{ background: "radial-gradient(circle, rgba(244,63,142,0.7) 0%, transparent 70%)" }} />
          </div>

          {/* Floating Kahoot answer blocks */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
            {KAHOOT_ANSWERS.map((a, i) => (
              <motion.div
                key={i}
                className="absolute rounded-2xl flex items-center gap-3 px-4 py-3 shadow-2xl select-none"
                style={{
                  background: a.bg,
                  top: [`18%`, `72%`, `15%`, `65%`][i],
                  left: i < 2 ? [`2%`, `3%`][i] : undefined,
                  right: i >= 2 ? [`2%`, `3%`][i - 2] : undefined,
                  boxShadow: `0 8px 32px ${a.bg}66`,
                }}
                initial={{ opacity: 0, scale: 0.7, rotate: [-6, 4, -4, 6][i] }}
                animate={{ opacity: 1, scale: 1, rotate: [-3, 2, -2, 3][i] }}
                transition={{ duration: 0.8, delay: 0.8 + i * 0.15, ease: "backOut" }}
              >
                <span className="text-2xl text-white">{a.shape}</span>
                <span className="text-sm font-black text-white whitespace-nowrap">{a.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Badge */}
          <motion.div {...FLOAT_IN(0)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-7 text-sm font-bold"
            style={{ background: "rgba(138,92,246,0.12)", borderColor: "rgba(138,92,246,0.3)", color: "#c084fc" }}>
            <Sparkles className="w-4 h-4" />
            AI-Powered Quiz Platform
          </motion.div>

          {/* Headline */}
          <motion.h1 {...FLOAT_IN(0.1)} className="font-display font-black leading-[1.05] mb-6 max-w-4xl"
            style={{ fontSize: "clamp(2.8rem, 8vw, 6.5rem)" }}>
            <span className="text-white">Make learning</span>
            <br />
            <span className="gradient-text-rainbow">unforgettable.</span>
          </motion.h1>

          <motion.p {...FLOAT_IN(0.2)} className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-medium"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            Create AI-generated quiz games in seconds. Host live, join from any phone,
            compete on real-time leaderboards.
          </motion.p>

          {/* CTA buttons */}
          <motion.div {...FLOAT_IN(0.3)} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/join">
              <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 h-14 rounded-2xl font-black text-lg text-black transition-all hover:scale-105 hover:brightness-110 active:scale-98 btn-game-3d glow-gold"
                style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)" }}>
                <Play className="w-5 h-5 fill-current" />
                Enter PIN to Play
              </button>
            </Link>
            <Link href="/auth">
              <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 h-14 rounded-2xl font-black text-lg text-white transition-all hover:scale-105 active:scale-98 border"
                style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)" }}>
                <Sparkles className="w-5 h-5" />
                Start for Free
              </button>
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div {...FLOAT_IN(0.4)} className="flex items-center gap-6 mt-8 text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            {["No credit card", "Free forever plan", "Join in 10 seconds"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                {t}
              </span>
            ))}
          </motion.div>
        </section>

        {/* ── Marquee strip ─────────────────────────────────────────────── */}
        <div className="py-6 border-y overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex gap-0 marquee" style={{ width: "max-content" }}>
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 font-black text-sm mx-6 whitespace-nowrap"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                {item} <span className="text-purple-500">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 rounded-3xl border"
                style={{ background: `${s.color}0d`, borderColor: `${s.color}22` }}
              >
                <div className="text-3xl sm:text-4xl font-display font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Feature cards ─────────────────────────────────────────────── */}
        <section className="py-12 px-4 pb-24">
          <div className="max-w-6xl mx-auto">
            <motion.div className="text-center mb-14"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-4xl sm:text-5xl font-display font-black text-white mb-4">
                Everything you need to <span className="gradient-text-purple-pink">win the classroom</span>
              </h2>
              <p className="text-lg font-medium max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
                One platform for creating, hosting, and crushing quizzes.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.12 }}
                  viewport={{ once: true }}
                  className={`relative p-8 rounded-3xl border bg-gradient-to-br ${f.gradient} ${f.border} hover:-translate-y-1 transition-all duration-300 group overflow-hidden`}
                >
                  {/* Glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
                    style={{ boxShadow: `inset 0 0 60px ${f.glow}` }} />
                  <div className="text-5xl mb-5">{f.emoji}</div>
                  <div className="inline-block px-2.5 py-1 rounded-lg text-xs font-black mb-4"
                    style={{ background: `${f.tagColor}20`, color: f.tagColor }}>{f.tag}</div>
                  <h3 className="text-xl font-display font-black text-white mb-3">{f.title}</h3>
                  <p className="font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="py-20 px-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="max-w-4xl mx-auto">
            <motion.div className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-4xl sm:text-5xl font-display font-black text-white mb-3">How it works</h2>
              <p className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>From idea to live game in under two minutes.</p>
            </motion.div>

            <div className="space-y-6">
              {HOW_IT_WORKS.map((step, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -32 : 32 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-6 p-7 rounded-3xl border"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-display font-black text-black shrink-0"
                    style={{ background: step.color }}>
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-white mb-1">{step.title}</h3>
                    <p className="font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="py-24 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center relative overflow-hidden rounded-[2.5rem] p-12 md:p-16 border"
            style={{
              background: "linear-gradient(135deg, rgba(138,92,246,0.15) 0%, rgba(244,63,142,0.10) 50%, rgba(6,182,212,0.08) 100%)",
              borderColor: "rgba(138,92,246,0.3)",
              boxShadow: "0 0 80px rgba(138,92,246,0.12)",
            }}
          >
            <div className="blob absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, rgba(244,63,142,0.6) 0%, transparent 70%)" }} />
            <div className="blob blob-delay-4 absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)" }} />

            <div className="relative z-10">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-4xl sm:text-5xl font-display font-black text-white mb-4">
                Ready to play?
              </h2>
              <p className="text-lg font-medium mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
                Join millions of learners. Create your first quiz free, no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <button className="px-10 h-14 rounded-2xl font-black text-lg text-black hover:scale-105 transition-transform glow-gold"
                    style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)" }}>
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2 inline" />
                  </button>
                </Link>
                <Link href="/join">
                  <button className="px-10 h-14 rounded-2xl font-black text-lg text-white hover:scale-105 transition-transform border"
                    style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)" }}>
                    Enter Game PIN
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

      </div>
    </AppLayout>
  );
}
