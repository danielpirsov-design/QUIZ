import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export type User = {
  id: number;
  displayName: string;
  email: string;
  username: string;
  role: string;
  totalPoints: number;
  coins: number;
  xp: number;
  gamesPlayed: number;
  quizzesCreated: number;
  avatarUrl: string | null;
  emailVerified: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, username: string, displayName: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  refresh: async () => {},
  login: async () => null,
  register: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Login failed";
      setUser(data);
      return null;
    } catch {
      return "Connection error";
    }
  };

  const register = async (email: string, username: string, displayName: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, username, displayName, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Registration failed";
      setUser(data);
      return null;
    } catch {
      return "Connection error";
    }
  };

  const logout = async () => {
    await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
