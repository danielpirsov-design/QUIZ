import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, Loader2, Search, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const ROLES = ["student", "teacher", "creator", "owner"] as const;
type Role = (typeof ROLES)[number];

const ROLE_META: Record<Role, { label: string; color: string; bg: string }> = {
  student:  { label: "Student",  color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  teacher:  { label: "Teacher",  color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  creator:  { label: "Creator",  color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  owner:    { label: "Owner",    color: "#1d6ef5", bg: "rgba(29,110,245,0.1)"  },
};

interface AdminUser {
  id: number;
  displayName: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
}

function RoleDropdown({ user, onSet, openUp = false }: { user: AdminUser; onSet: (role: Role) => void; openUp?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = ROLE_META[user.role] ?? ROLE_META.student;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
      >
        {meta.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className={`absolute right-0 z-50 rounded-xl overflow-hidden shadow-2xl ${openUp ? "bottom-full mb-1" : "top-full mt-1"}`}
              style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.08)", minWidth: "130px" }}
            >
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => { setOpen(false); if (r !== user.role) onSet(r); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-left transition-colors hover:bg-white/5"
                  style={{ color: ROLE_META[r].color, background: r === user.role ? "rgba(255,255,255,0.04)" : undefined }}
                >
                  {ROLE_META[r].label}
                  {r === user.role && <span className="ml-auto text-[10px] opacity-50">current</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/admin/users`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load users");
      return r.json();
    },
  });

  const setRoleMut = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: Role }) => {
      const r = await fetch(`${BASE_URL}/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error("Failed to update role");
      return r.json() as Promise<AdminUser>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminUser[]>(["admin-users"], old =>
        old?.map(u => u.id === updated.id ? updated : u) ?? []
      );
      toast({ title: `${updated.displayName} is now ${updated.role}` });
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5 text-sm font-bold"
            style={{ background: "rgba(29,110,245,0.1)", borderColor: "rgba(29,110,245,0.25)", color: "#1d6ef5" }}>
            <Shield className="w-4 h-4" /> Owner Control Panel
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black mb-3" style={{ color: "#fff" }}>
            User Management
          </h1>
          <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            {users.length} registered players — set roles to grant special access
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1d6ef5" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Users className="w-10 h-10" />
              <p className="font-bold">No users found</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {/* Header row */}
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 text-[11px] font-black uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.25)" }}>
                <span>Player</span>
                <span></span>
                <span>Role</span>
              </div>
              <AnimatePresence initial={false}>
                {filtered.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                          : u.displayName.charAt(0).toUpperCase()
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold" style={{ color: u.id === me?.id ? "#a855f7" : "#fff" }}>
                            {u.displayName}
                          </span>
                          {u.id === me?.id && <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7" }}>you</span>}
                          <VerifiedBadge role={u.role} size="sm" />
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{u.email}</div>
                      </div>
                    </div>

                    <div />

                    {/* Role selector */}
                    <RoleDropdown
                      user={u}
                      onSet={role => setRoleMut.mutate({ id: u.id, role })}
                      openUp={i >= filtered.length - 3}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-3">
          {ROLES.map(r => (
            <div key={r} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: ROLE_META[r].bg, color: ROLE_META[r].color, border: `1px solid ${ROLE_META[r].color}30` }}>
              {r === "owner" || r === "creator" ? <VerifiedBadge role={r} size="sm" /> : null}
              {ROLE_META[r].label}
            </div>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}

export default function AdminRoute() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AdminPage />
    </ProtectedRoute>
  );
}
