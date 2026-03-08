import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Music, Video, Disc3, LogOut, ChevronDown, Send, Swords, TrendingUp, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: ReactNode;
}

type AdminCheck = { isAdmin: boolean; email: string | null };
type Profile = {
  id: number;
  username: string;
  role: string;
  country: string | null;
  followerCount?: number;
};

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated, logout, isLoading } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: adminCheck } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const isAdmin = adminCheck?.isAdmin === true;
  const roleLabel = isAdmin ? "ADMIN" : "LISTENER";
  const country = profile?.country?.toUpperCase() ?? null;
  const roleDisplay = country ? `${roleLabel} · ${country}` : roleLabel;

  const navItems = [
    { path: "/", icon: Home, label: "HOME" },
    { path: "/music", icon: Music, label: "MUSIC" },
    { path: "/music-video", icon: Video, label: "MUSIC VIDEO" },
    { path: "/battle", icon: Swords, label: "BATTLE" },
    { path: "/rising", icon: TrendingUp, label: "RISING" },
    { path: "/submit-track", icon: Send, label: "SUBMIT TRACK" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 right-0 h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl z-50 flex items-center justify-between px-8 md:px-12">
        <Link href="/" className="flex items-center gap-3 text-primary neon-text font-display font-bold text-2xl tracking-tighter group">
          <Disc3 className="w-6 h-6 animate-[spin_8s_linear_infinite] group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
          NEO
        </Link>

        <nav className="hidden md:flex items-center gap-12">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path} className={clsx(
                "text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative py-2",
                isActive ? "text-primary" : "text-zinc-500 hover:text-white"
              )}>
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-0 right-0 h-px bg-primary shadow-[0_0_10px_rgba(0,240,255,1)]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center">
          {!isLoading && !isAuthenticated && (
            <a
              href="/api/login"
              data-testid="button-login"
              className="text-[10px] font-bold uppercase tracking-widest border border-primary/30 text-primary px-5 py-2 rounded-sm bg-primary/5 hover:bg-primary/20 transition-all"
            >
              LOGIN
            </a>
          )}

          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                data-testid="button-user-menu"
                className="flex items-center gap-2.5 group"
              >
                <div className="text-right">
                  <p
                    data-testid="text-role-display"
                    className={clsx(
                      "text-[10px] font-black uppercase tracking-[0.25em] leading-none",
                      isAdmin ? "text-primary" : "text-white"
                    )}
                  >
                    {isLoading ? "—" : roleDisplay}
                  </p>
                  {isAdmin && (
                    <p className="text-[8px] font-bold text-primary/40 uppercase tracking-widest mt-0.5 leading-none">
                      Platform Admin
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <ShieldCheck className="w-4 h-4 text-primary/60 shrink-0" strokeWidth={2} />
                )}
                <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-[#0A0A0A] border border-white/10 rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[220px] py-2 overflow-hidden">

                    {/* Role header */}
                    <div className={clsx(
                      "px-4 py-3 border-b border-white/5",
                      isAdmin ? "bg-primary/5" : ""
                    )}>
                      <div className="flex items-center gap-2">
                        {isAdmin && <ShieldCheck className="w-3 h-3 text-primary" strokeWidth={2} />}
                        <p
                          data-testid="text-dropdown-role"
                          className={clsx(
                            "text-[11px] font-black uppercase tracking-[0.25em]",
                            isAdmin ? "text-primary" : "text-white"
                          )}
                        >
                          {roleLabel}
                        </p>
                      </div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">
                        {country ?? "No country set"}
                      </p>
                      {profile?.username && (
                        <p className="text-[9px] text-zinc-600 mt-0.5 lowercase tracking-wider">
                          @{profile.username}
                        </p>
                      )}
                    </div>

                    {/* Admin Panel link — only for admin */}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div
                          data-testid="link-admin-panel"
                          className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white hover:bg-primary/10 transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Admin Panel
                        </div>
                      </Link>
                    )}

                    <div className={clsx("border-t border-white/5 mt-1 pt-1", isAdmin ? "" : "")}>
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        data-testid="button-logout"
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
                      >
                        <LogOut className="w-3 h-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full relative z-10 pt-28 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 border-t border-white/5 bg-black/80 backdrop-blur-2xl z-50 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path} className={clsx(
              "flex flex-col items-center gap-1.5 transition-all",
              isActive ? "text-primary" : "text-zinc-500"
            )}>
              <item.icon className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
