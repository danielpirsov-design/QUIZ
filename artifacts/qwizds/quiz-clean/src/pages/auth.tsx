import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AuthPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${BASE}/api/auth/google`;
  };

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden p-4">
        <div className="absolute inset-0 z-0">
          <img
            src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
            alt="Abstract colorful background"
            className="w-full h-full object-cover opacity-50 dark:opacity-20"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-card/80 backdrop-blur-2xl border border-border/50 rounded-[2rem] shadow-2xl p-10 relative z-10 flex flex-col items-center"
        >
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg shadow-primary/30 transform -rotate-6 mb-8">
            <Gamepad2 className="w-10 h-10" />
          </div>

          <h2 className="text-3xl font-display font-bold text-center mb-2 text-foreground">
            Welcome to QUIZDES
          </h2>
          <p className="text-center text-muted-foreground font-medium mb-10">
            Sign in to start creating and playing
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 h-14 rounded-xl border-2 border-border bg-background/70 hover:bg-background hover:border-primary/50 hover:shadow-md transition-all font-semibold text-base shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
