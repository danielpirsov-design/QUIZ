import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Gamepad2, GraduationCap, Wand2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ROLES = [
  {
    id: "teacher",
    label: "Teacher",
    description: "Host live games, create quizzes, track student progress",
    icon: GraduationCap,
    color: "from-violet-500 to-purple-600",
    border: "border-violet-400",
  },
  {
    id: "student",
    label: "Student",
    description: "Join games with a PIN and compete on the leaderboard",
    icon: Gamepad2,
    color: "from-pink-500 to-rose-600",
    border: "border-pink-400",
  },
  {
    id: "creator",
    label: "Creator",
    description: "Build and publish quiz content for the community",
    icon: Wand2,
    color: "from-blue-500 to-cyan-600",
    border: "border-blue-400",
  },
];

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await fetch(`${BASE}/api/auth/update-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: selected }),
      });
      await qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/dashboard");
    } catch {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-12">
          <div className="inline-block bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/40 transform -rotate-6 mb-6">
            <Gamepad2 className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black mb-3">
            Welcome to QUIZDES!
          </h1>
          <p className="text-white/60 text-lg font-medium">
            How will you be using QUIZDES?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {ROLES.map(role => {
            const Icon = role.icon;
            const isSelected = selected === role.id;
            return (
              <motion.button
                key={role.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(role.id)}
                className={`relative p-6 rounded-3xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? `${role.border} bg-white/10 shadow-xl`
                    : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/8"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="selection"
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${role.color} opacity-10`}
                  />
                )}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-display font-black mb-2">{role.label}</h3>
                <p className="text-white/50 text-sm font-medium leading-relaxed">
                  {role.description}
                </p>
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          disabled={!selected || loading}
          className={`w-full h-16 rounded-2xl font-display font-black text-xl transition-all duration-200 ${
            selected
              ? "bg-primary shadow-xl shadow-primary/30 hover:bg-primary/90"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          ) : (
            "Let's go!"
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
