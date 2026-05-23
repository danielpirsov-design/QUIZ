import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, RefreshCw, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const DIGITS = 6;

export default function VerifyPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(""));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sentMsg, setSentMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/auth");
    if (!isLoading && user?.emailVerified) setLocation("/dashboard");
  }, [isLoading, user, setLocation]);

  // Don't auto-send on mount — let user click the button

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  async function sendCode() {
    setResending(true);
    setSentMsg("");
    setError("");
    try {
      const r = await fetch(`${BASE}/api/auth/send-code`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (data.alreadyVerified) { setLocation("/dashboard"); return; }
      if (data.sent) {
        setSentMsg(`Code sent to ${data.email}`);
        setResendCooldown(60);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
          setResendCooldown(c => { if (c <= 1) { clearInterval(cooldownRef.current!); return 0; } return c - 1; });
        }, 1000);
      }
    } catch { setError("Failed to send code. Try again."); }
    finally { setResending(false); }
  }

  const handleDigit = useCallback((idx: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError("");
    if (char && idx < DIGITS - 1) inputRefs.current[idx + 1]?.focus();
    // Auto-submit when all filled
    if (char && next.every(d => d !== "") && next.filter(d => d).length === DIGITS) {
      submitCode(next.join(""));
    }
  }, [digits]);

  const handleKeyDown = useCallback((idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter" && digits.every(d => d)) {
      submitCode(digits.join(""));
    }
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (pasted.length === 0) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
    if (pasted.length === DIGITS) submitCode(pasted);
  }, [digits]);

  async function submitCode(code: string) {
    if (submitting || success) return;
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch(`${BASE}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await r.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setLocation("/dashboard"), 1800);
      } else {
        setError(data.error || "Invalid code. Please try again.");
        setDigits(Array(DIGITS).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch { setError("Something went wrong. Try again."); }
    finally { setSubmitting(false); }
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060612" }}>
      <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #060612 0%, #0f0726 50%, #060612 100%)" }}>

      {/* Glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl -top-20 -left-20"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        <div className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl -bottom-20 -right-20"
          style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div key="success"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center relative z-10">
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 3, duration: 0.4 }}>
              <CheckCircle className="w-24 h-24 text-green-400 mb-6" />
            </motion.div>
            <h1 className="text-4xl font-display font-black text-white mb-2">Verified!</h1>
            <p className="text-white/60 font-bold">Redirecting you now...</p>
          </motion.div>
        ) : (
          <motion.div key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm relative z-10">

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30"
                style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)" }}>
                <Shield className="w-8 h-8 text-white" />
              </motion.div>
            </div>

            <h1 className="text-3xl font-display font-black text-white text-center mb-2">
              Verify your email
            </h1>
            <p className="text-white/50 text-center text-sm font-medium mb-8">
              {user?.email ? (
                <>Enter the 6-digit code sent to <span className="text-purple-300 font-bold">{user.email}</span></>
              ) : "Enter the 6-digit code sent to your email"}
            </p>

            {/* Sent message */}
            <AnimatePresence>
              {sentMsg && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-center text-green-400 text-xs font-bold mb-4">
                  ✓ {sentMsg}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Digit inputs */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {Array(DIGITS).fill(null).map((_, i) => (
                <motion.input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[i]}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  whileFocus={{ scale: 1.08 }}
                  className="w-12 h-14 text-center font-black text-2xl rounded-xl outline-none transition-all"
                  style={{
                    background: digits[i] ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)",
                    border: `2px solid ${digits[i] ? "#a855f7" : "rgba(255,255,255,0.12)"}`,
                    color: "#fff",
                    caretColor: "#a855f7",
                    boxShadow: digits[i] ? "0 0 0 3px rgba(168,85,247,0.2)" : "none",
                  }}
                />
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-center text-red-400 text-sm font-bold mb-4">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => digits.every(d => d) && submitCode(digits.join(""))}
              disabled={submitting || !digits.every(d => d)}
              className="w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all mb-4"
              style={{
                background: digits.every(d => d) ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "rgba(255,255,255,0.06)",
                color: digits.every(d => d) ? "#fff" : "rgba(255,255,255,0.3)",
                opacity: submitting ? 0.7 : 1,
                boxShadow: digits.every(d => d) ? "0 4px 20px rgba(168,85,247,0.4)" : "none",
              }}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" />Verify</>}
            </motion.button>

            {/* Resend */}
            <div className="text-center">
              <button
                onClick={sendCode}
                disabled={resending || resendCooldown > 0}
                className="text-sm font-bold transition-all flex items-center gap-1.5 mx-auto"
                style={{ color: resendCooldown > 0 ? "rgba(255,255,255,0.25)" : "#a855f7" }}>
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
