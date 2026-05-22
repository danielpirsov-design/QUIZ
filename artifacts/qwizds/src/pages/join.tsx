import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Loader2, User, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const SKINS: Record<string, { emoji: string; label: string }[]> = {
  Animals: [
    { emoji: "🐶", label: "Dog" },
    { emoji: "🐱", label: "Cat" },
    { emoji: "🐸", label: "Frog" },
    { emoji: "🦊", label: "Fox" },
    { emoji: "🐻", label: "Bear" },
    { emoji: "🐼", label: "Panda" },
    { emoji: "🦁", label: "Lion" },
    { emoji: "🐯", label: "Tiger" },
    { emoji: "🐨", label: "Koala" },
    { emoji: "🐺", label: "Wolf" },
    { emoji: "🐙", label: "Octopus" },
    { emoji: "🐧", label: "Penguin" },
  ],
  Accessories: [
    { emoji: "🎩", label: "Top Hat" },
    { emoji: "👑", label: "Crown" },
    { emoji: "🕶️", label: "Shades" },
    { emoji: "🤠", label: "Cowboy" },
    { emoji: "🧢", label: "Cap" },
    { emoji: "🎓", label: "Grad" },
    { emoji: "🤖", label: "Robot" },
    { emoji: "👽", label: "Alien" },
    { emoji: "🧙", label: "Wizard" },
    { emoji: "🦸", label: "Hero" },
    { emoji: "🎭", label: "Mask" },
    { emoji: "🧸", label: "Teddy" },
  ],
};

export default function JoinGamePage() {
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🐶");
  const [tab, setTab] = useState<"Animals" | "Accessories">("Animals");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [gameId, setGameId] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;
    try {
      const res = await fetch(`${BASE}/api/games/join/${pin}`);
      if (!res.ok) throw new Error("Game not found or not active");
      const data = await res.json();
      setGameId(data.id);
      setStep(2);
    } catch (err: any) {
      toast({ title: t.join.invalidPin, description: err.message, variant: "destructive" });
    }
  };

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setStep(3);
  };

  const handleJoin = async () => {
    if (!gameId || !nickname) return;
    setJoining(true);
    try {
      const res = await fetch(`${BASE}/api/games/${gameId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), avatar }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to join");
      const data = await res.json();
      sessionStorage.setItem(`game_${gameId}_participant`, data.id.toString());
      sessionStorage.setItem(`game_${gameId}_nickname`, nickname.trim());
      sessionStorage.setItem(`game_${gameId}_avatar`, avatar);
      setLocation(`/play/${gameId}`);
    } catch {
      toast({ title: t.join.failedToJoin, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden selection:bg-white/30">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-secondary rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-10 text-center relative z-10"
      >
        <div className="bg-white text-primary p-4 rounded-3xl transform -rotate-6 inline-block mb-4 shadow-2xl">
          <Gamepad2 className="w-12 h-12" />
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-black text-white tracking-tight">QUIZDES</h1>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: PIN ───────────────────────────────── */}
        {step === 1 && (
          <motion.form
            key="step1"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            onSubmit={handlePinSubmit}
            className="w-full max-w-xs bg-white rounded-[2rem] p-6 shadow-2xl relative z-10"
          >
            <button type="button" onClick={() => window.history.back()}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
              <X className="w-5 h-5" />
            </button>
            <Input
              autoFocus
              value={pin}
              onChange={e => setPin(e.target.value.toUpperCase())}
              placeholder={t.join.gamePinPlaceholder}
              className="h-20 text-center text-4xl md:text-5xl font-display font-black rounded-2xl border-4 border-gray-200 focus-visible:border-primary focus-visible:ring-0 mb-4 tracking-widest text-gray-900 placeholder:text-gray-300 bg-gray-50"
              maxLength={8}
            />
            <Button type="submit" disabled={pin.length < 4} className="w-full h-16 text-2xl font-bold rounded-2xl btn-game-3d">
              {t.join.enterButton}
            </Button>
          </motion.form>
        )}

        {/* ── STEP 2: NICKNAME ──────────────────────────── */}
        {step === 2 && (
          <motion.form
            key="step2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            onSubmit={handleNicknameSubmit}
            className="w-full max-w-xs bg-white rounded-[2rem] p-6 shadow-2xl relative z-10"
          >
            <button type="button" onClick={() => setStep(1)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
              <X className="w-5 h-5" />
            </button>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Step 1 of 2</p>
            <div className="relative mb-4">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-400" />
              <Input
                autoFocus
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder={t.join.nicknamePlaceholder}
                className="h-20 pl-16 text-2xl md:text-3xl font-display font-black rounded-2xl border-4 border-gray-200 focus-visible:border-primary focus-visible:ring-0 text-gray-900 placeholder:text-gray-300 bg-gray-50"
                maxLength={15}
              />
            </div>
            <Button type="submit" disabled={!nickname.trim()} className="w-full h-16 text-2xl font-bold rounded-2xl btn-game-3d flex items-center justify-center gap-2">
              Next <ArrowRight className="w-6 h-6" />
            </Button>
          </motion.form>
        )}

        {/* ── STEP 3: SKIN PICKER ───────────────────────── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="w-full max-w-sm bg-white rounded-[2rem] p-5 shadow-2xl relative z-10"
          >
            <button type="button" onClick={() => setStep(2)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
              <X className="w-5 h-5" />
            </button>

            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Step 2 of 2 · Pick your skin</p>

            {/* Selected preview */}
            <div className="flex flex-col items-center mb-4">
              <motion.div
                key={avatar}
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="text-7xl mb-1 drop-shadow-lg select-none"
              >
                {avatar}
              </motion.div>
              <div className="font-display font-black text-gray-700 text-lg">
                {nickname}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex rounded-2xl overflow-hidden border-2 border-gray-100 mb-3">
              {(Object.keys(SKINS) as ("Animals" | "Accessories")[]).map(cat => (
                <button key={cat} type="button"
                  onClick={() => setTab(cat)}
                  className="flex-1 py-2.5 text-sm font-black transition-all"
                  style={{
                    background: tab === cat ? "#46178f" : "transparent",
                    color: tab === cat ? "#fff" : "#9ca3af",
                  }}>
                  {cat === "Animals" ? "🐾 Animals" : "🎭 Accessories"}
                </button>
              ))}
            </div>

            {/* Skin grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-6 gap-2 mb-4"
              >
                {SKINS[tab].map(skin => (
                  <button
                    key={skin.emoji}
                    type="button"
                    onClick={() => setAvatar(skin.emoji)}
                    className="aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all"
                    style={{
                      background: avatar === skin.emoji ? "#ede9fe" : "#f9fafb",
                      border: avatar === skin.emoji ? "3px solid #7c3aed" : "3px solid transparent",
                      transform: avatar === skin.emoji ? "scale(1.15)" : "scale(1)",
                    }}
                    title={skin.label}
                  >
                    {skin.emoji}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>

            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full h-14 text-xl font-bold rounded-2xl btn-game-3d"
            >
              {joining ? <Loader2 className="w-6 h-6 animate-spin" /> : "🎮 Let's Go!"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
