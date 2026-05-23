import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, LogOut, Compass, LayoutDashboard, Menu, X, Zap, BrainCircuit, Languages, FileText, Music2, Volume2, VolumeX, Settings, Shield } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSound } from "@/contexts/SoundContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const { musicEnabled, sfxEnabled, toggleMusic, toggleSfx } = useSound();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const handleLogout = async () => {
    setMobileOpen(false);
    await logoutMutation.mutateAsync();
    queryClient.clear();
    setLocation("/");
  };

  const navLinks = isAuthenticated ? [
    { href: "/dashboard",    label: t.nav.dashboard,  icon: <LayoutDashboard className="w-4 h-4" />, color: "#a855f7" },
    { href: "/discover",     label: t.nav.discover,   icon: <Compass className="w-4 h-4" />,          color: "#06b6d4" },
    { href: "/ai-generate",  label: t.nav.aiCreate,   icon: <BrainCircuit className="w-4 h-4" />,     color: "#ec4899" },
    { href: "/language",     label: t.nav.languages,  icon: <Languages className="w-4 h-4" />,         color: "#22c55e" },
    ...(user?.role === "teacher" || user?.role === "owner" ? [
      { href: "/worksheet",  label: t.nav.worksheets, icon: <FileText className="w-4 h-4" />,          color: "#06b6d4" },
    ] : []),
    ...(user?.role === "owner" ? [
      { href: "/admin",      label: t.nav.admin,      icon: <Shield className="w-4 h-4" />,             color: "#1d6ef5" },
    ] : []),
  ] : [
    { href: "/discover",     label: t.nav.discover,   icon: <Compass className="w-4 h-4" />,         color: "#06b6d4" },
  ];

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-50 w-full border-b" style={{ background: isDark ? "rgba(6,6,18,0.85)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
            <div className="relative">
              <div className="p-2 rounded-xl rotate-[-6deg]"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", boxShadow: "0 0 16px rgba(124,58,237,0.5)" }}>
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="font-display font-black text-xl tracking-tight" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>QUIZDES</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const active = isActive(link.href);
              return (
                <Link key={link.href} href={link.href}>
                  <div className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{
                      color: active ? link.color : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)",
                      background: active ? `${link.color}15` : "transparent",
                    }}>
                    <span style={{ color: active ? link.color : undefined }}>{link.icon}</span>
                    {link.label}
                    {active && (
                      <motion.div layoutId="nav-indicator"
                        className="absolute bottom-0 inset-x-3 h-0.5 rounded-full"
                        style={{ background: link.color }} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {/* Sound toggles */}
            <button onClick={toggleSfx} title={sfxEnabled ? "SFX On" : "SFX Off"}
              className="p-2 rounded-xl transition-all"
              style={{ color: sfxEnabled ? "#a855f7" : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" }}>
              {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={toggleMusic} title={musicEnabled ? "Music On" : "Music Off"}
              className="p-2 rounded-xl transition-all"
              style={{ color: musicEnabled ? "#a855f7" : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" }}>
              <Music2 className="w-4 h-4" />
            </button>
            <Link href="/join">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-black transition-all hover:scale-105 hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)", boxShadow: "0 0 16px rgba(255,204,2,0.3)" }}>
                <Zap className="w-4 h-4" />
                {t.nav.enterPin}
              </button>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/settings">
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border cursor-pointer hover:border-purple-500/40 transition-all"
                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avatar"
                        className="w-7 h-7 rounded-full border-2 object-cover"
                        style={{ borderColor: "#7c3aed" }}
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black text-white shrink-0"
                        style={{ borderColor: "#7c3aed", background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                        {user?.displayName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1">
                        <div className="text-xs font-black leading-none" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{user?.displayName?.split(" ")[0]}</div>
                        <VerifiedBadge role={user?.role ?? ""} size="sm" />
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "#a855f7" }}>{user?.role}</div>
                    </div>
                  </div>
                </Link>
                <Link href="/settings">
                  <button className="p-2 rounded-xl transition-all hover:bg-white/5"
                    style={{ color: "rgba(255,255,255,0.3)" }} title="Settings">
                    <Settings className="w-4 h-4" />
                  </button>
                </Link>
                <button onClick={handleLogout}
                  className="p-2 rounded-xl text-sm transition-all hover:bg-red-500/10"
                  style={{ color: "rgba(255,255,255,0.35)" }}>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/auth">
                <button className="px-4 py-2 rounded-xl text-sm font-black text-white border transition-all hover:border-purple-500/50 hover:bg-purple-500/10"
                  style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                  {t.nav.signIn}
                </button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
            onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t overflow-hidden"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", background: isDark ? "rgba(6,6,18,0.97)" : "rgba(255,255,255,0.98)" }}
          >
            <div className="px-4 py-5 flex flex-col gap-2">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{
                      color: isActive(link.href) ? link.color : isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      background: isActive(link.href) ? `${link.color}15` : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    }}>
                    <span style={{ color: isActive(link.href) ? link.color : isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}>{link.icon}</span>
                    {link.label}
                  </div>
                </Link>
              ))}

              <div className="h-px w-full my-2" style={{ background: "rgba(255,255,255,0.07)" }} />

              <Link href="/join" onClick={() => setMobileOpen(false)}>
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-black"
                  style={{ background: "linear-gradient(135deg, #ffcc02 0%, #ff9500 100%)" }}>
                  <Zap className="w-4 h-4" /> {t.nav.enterPinToPlay}
                </button>
              </Link>

              {isAuthenticated && (
                <Link href="/settings" onClick={() => setMobileOpen(false)}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{ color: isActive("/settings") ? "#a855f7" : "rgba(255,255,255,0.6)", background: isActive("/settings") ? "#a855f715" : "rgba(255,255,255,0.03)" }}>
                    <Settings className="w-4 h-4" style={{ color: isActive("/settings") ? "#a855f7" : "rgba(255,255,255,0.3)" }} />
                    {t.nav.settings}
                  </div>
                </Link>
              )}

              {isAuthenticated ? (
                <button onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-red-400 border"
                  style={{ borderColor: "rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.05)" }}>
                  <LogOut className="w-4 h-4" /> {t.nav.logout}
                </button>
              ) : (
                <Link href="/auth" onClick={() => setMobileOpen(false)}>
                  <button className="w-full py-3 rounded-xl font-bold text-sm text-white border"
                    style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                    {t.nav.signIn}
                  </button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
