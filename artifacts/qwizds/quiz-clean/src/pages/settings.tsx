import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { useSound } from "@/contexts/SoundContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, LANGUAGE_LABELS, type Language } from "@/contexts/LanguageContext";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, User, Palette, Music, Volume2, Check, Moon, Sun, VolumeX, Music2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useUpdateProfile() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const update = async (data: { displayName?: string; avatarUrl?: string | null }) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading };
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Navbar />
      <SettingsView />
    </ProtectedRoute>
  );
}

function SettingsView() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { musicEnabled, sfxEnabled, toggleMusic, toggleSfx } = useSound();
  const { language, setLanguage, t } = useLanguage();
  const { update, loading } = useUpdateProfile();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [avatarError, setAvatarError] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSaveProfile = async () => {
    const ok = await update({
      displayName: displayName || undefined,
      avatarUrl: avatarUrl || null,
    });
    if (ok) {
      setSaved(true);
      toast({ title: t.settings.profileSaved, description: t.settings.profileSavedDesc });
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaved(false), 2500);
    } else {
      toast({ title: t.settings.saveFailed, description: t.settings.saveFailedDesc, variant: "destructive" });
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen" style={{ background: isDark ? "#060612" : "#f0f0f8" }}>
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-display font-black" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{t.settings.title}</h1>
          <p className="mt-1 text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)" }}>
            {t.settings.subtitle}
          </p>
        </div>

        {/* ── Profile ─────────────────────────────────────────────────── */}
        <Section icon={<User className="w-5 h-5" />} title={t.settings.profile} isDark={isDark}>
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2"
                style={{ borderColor: isDark ? "rgba(168,85,247,0.5)" : "#a855f7" }}>
                {avatarUrl && !avatarError ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                    onLoad={() => setAvatarError(false)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black"
                    style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff" }}>
                    {(displayName || user?.displayName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5"
                style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)" }}>
                {t.settings.profilePicture}
              </label>
              <input
                value={avatarUrl}
                onChange={e => { setAvatarUrl(e.target.value); setAvatarError(false); }}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all"
                style={{
                  background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e0e0ec",
                  color: isDark ? "#fff" : "#1a1a2e",
                }}
              />
            </div>
          </div>

          {/* Display name */}
          <div className="mb-5">
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5"
              style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)" }}>
              {t.settings.displayName}
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t.settings.yourName}
              className="w-full px-4 py-3 rounded-xl text-base font-bold border outline-none transition-all"
              style={{
                background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e0e0ec",
                color: isDark ? "#fff" : "#1a1a2e",
              }}
            />
          </div>

          {/* Account info (read-only) */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: t.settings.email, value: user?.email ?? "" },
              { label: t.settings.role,  value: user?.role  ?? "" },
            ].map(f => (
              <div key={f.label} className="px-4 py-2.5 rounded-xl border"
                style={{
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e0e0ec",
                }}>
                <div className="text-[10px] font-black uppercase tracking-wider mb-0.5"
                  style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)" }}>{f.label}</div>
                <div className="text-sm font-bold truncate" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#1a1a2e" }}>{f.value}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm text-white transition-all hover:scale-105 hover:brightness-110 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saved ? t.settings.saved : t.settings.saveProfile}
          </button>
        </Section>

        {/* ── Language ─────────────────────────────────────────────────── */}
        <Section icon={<Globe className="w-5 h-5" />} title={t.settings.language} isDark={isDark}>
          <p className="text-sm font-medium mb-4" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
            {t.settings.languageSubtitle}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map(lang => {
              const info = LANGUAGE_LABELS[lang];
              const active = language === lang;
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className="relative flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all hover:scale-[1.02]"
                  style={{
                    borderColor: active ? "#a855f7" : isDark ? "rgba(255,255,255,0.08)" : "#e0e0ec",
                    background: isDark
                      ? (active ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.03)")
                      : (active ? "rgba(168,85,247,0.06)" : "rgba(0,0,0,0.02)"),
                    boxShadow: active ? "0 0 20px rgba(168,85,247,0.2)" : "none",
                  }}
                >
                  <span className="text-2xl">{info.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black leading-none" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{info.label}</div>
                    <div className="text-xs font-bold mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)" }}>{info.nativeLabel}</div>
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#a855f7" }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Appearance ──────────────────────────────────────────────── */}
        <Section icon={<Palette className="w-5 h-5" />} title={t.settings.appearance} isDark={isDark}>
          <p className="text-sm font-medium mb-4" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
            {t.settings.chooseTheme}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ThemeCard
              label={t.settings.night}
              sublabel={t.settings.nightSub}
              icon={<Moon className="w-5 h-5" />}
              active={isDark}
              preview={{ bg: "#060612", accent: "#a855f7", text: "#fff" }}
              onClick={() => setTheme("dark")}
              isDark={isDark}
            />
            <ThemeCard
              label={t.settings.day}
              sublabel={t.settings.daySub}
              icon={<Sun className="w-5 h-5" />}
              active={!isDark}
              preview={{ bg: "#f0f0f8", accent: "#7c3aed", text: "#1a1a2e" }}
              onClick={() => setTheme("light")}
              isDark={isDark}
            />
          </div>
        </Section>

        {/* ── Sound ───────────────────────────────────────────────────── */}
        <Section icon={<Music className="w-5 h-5" />} title={t.settings.sound} isDark={isDark}>
          <div className="flex flex-col gap-3">
            <ToggleRow
              icon={<Music2 className="w-5 h-5" />}
              label={t.settings.gameMusic}
              description={t.settings.gameMusicDesc}
              enabled={musicEnabled}
              onToggle={toggleMusic}
              isDark={isDark}
              color="#a855f7"
            />
            <ToggleRow
              icon={<Volume2 className="w-5 h-5" />}
              label={t.settings.soundEffects}
              description={t.settings.soundEffectsDesc}
              enabled={sfxEnabled}
              onToggle={toggleSfx}
              isDark={isDark}
              color="#06b6d4"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children, isDark }: { icon: React.ReactNode; title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-6 border"
      style={{
        background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e0e0ec",
        boxShadow: isDark ? "none" : "0 2px 20px rgba(0,0,0,0.06)",
      }}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff" }}>
          {icon}
        </div>
        <h2 className="text-lg font-display font-black" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function ThemeCard({ label, sublabel, icon, active, preview, onClick, isDark }:
  { label: string; sublabel: string; icon: React.ReactNode; active: boolean; preview: { bg: string; accent: string; text: string }; onClick: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl p-4 border-2 text-left transition-all hover:scale-[1.02]"
      style={{
        borderColor: active ? "#a855f7" : isDark ? "rgba(255,255,255,0.08)" : "#e0e0ec",
        background: isDark ? (active ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.03)") : (active ? "rgba(168,85,247,0.06)" : "rgba(0,0,0,0.02)"),
        boxShadow: active ? "0 0 20px rgba(168,85,247,0.2)" : "none",
      }}>
      {/* Mini preview */}
      <div className="w-full h-14 rounded-xl mb-3 overflow-hidden flex items-center justify-center gap-1.5 px-2"
        style={{ background: preview.bg }}>
        <div className="h-3 rounded-full flex-1" style={{ background: preview.accent, opacity: 0.8 }} />
        <div className="h-3 rounded-full w-1/3" style={{ background: preview.accent, opacity: 0.4 }} />
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: active ? "#a855f7" : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>{icon}</span>
        <div>
          <div className="text-sm font-black leading-none" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{label}</div>
          <div className="text-[10px] font-bold mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)" }}>{sublabel}</div>
        </div>
        {active && (
          <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#a855f7" }}>
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </button>
  );
}

function ToggleRow({ icon, label, description, enabled, onToggle, isDark, color }:
  { icon: React.ReactNode; label: string; description: string; enabled: boolean; onToggle: () => void; isDark: boolean; color: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
      style={{
        background: enabled
          ? (isDark ? `${color}12` : `${color}0d`)
          : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
        borderColor: enabled ? `${color}40` : (isDark ? "rgba(255,255,255,0.06)" : "#e0e0ec"),
      }}>
      <div className="p-2 rounded-xl shrink-0" style={{ background: enabled ? color : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"), color: enabled ? "#fff" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)") }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{label}</div>
        <div className="text-xs font-medium" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)" }}>{description}</div>
      </div>
      <button
        onClick={onToggle}
        className="relative w-12 h-6 rounded-full shrink-0 transition-all duration-300"
        style={{ background: enabled ? color : (isDark ? "rgba(255,255,255,0.1)" : "#d0d0e0") }}>
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full shadow"
          animate={{ left: enabled ? "calc(100% - 22px)" : "2px" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ background: "#fff" }} />
      </button>
    </div>
  );
}
