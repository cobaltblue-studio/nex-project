import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Music, Video, Disc3, LogOut, User, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { NexJoinModal } from "./NexJoinModal";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated, logout, isLoading } = useAuth();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["/api/profiles/me"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const navItems = [
    { path: "/", icon: Home, label: "HOME" },
    { path: "/music", icon: Music, label: "MUSIC" },
    { path: "/music-video", icon: Video, label: "MUSIC VIDEO" },
    { path: "/profile", icon: Disc3, label: "NEX PROFILE" },
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

        <div className="flex items-center gap-3">
          {!isLoading && !isAuthenticated ? (
            <>
              <a
                href="/api/login"
                data-testid="button-login"
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-4 py-2 hover:text-white transition-colors border border-transparent hover:border-white/10 rounded-sm"
              >
                LOGIN
              </a>
              <button
                onClick={() => setJoinModalOpen(true)}
                data-testid="button-join-nex-header"
                className="text-[10px] font-bold uppercase tracking-widest border border-primary/30 text-primary px-5 py-2 rounded-sm bg-primary/5 hover:bg-primary/20 transition-all"
              >
                JOIN NEX
              </button>
            </>
          ) : isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  {profile?.role === "nex" ? (
                    <Disc3 className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
                <span className="hidden sm:block">{profile?.username || "ACCOUNT"}</span>
                {profile?.role === "nex" && (
                  <span className="hidden sm:block text-[8px] text-primary border border-primary/30 px-1 py-0.5 rounded-sm">NEX</span>
                )}
                <ChevronDown className="w-3 h-3" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-20 bg-[#0A0A0A] border border-white/10 rounded-sm shadow-xl min-w-[180px] py-2">
                    {profile && (
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-[10px] font-bold text-white uppercase">{profile.username}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">
                          {profile.role === "nex" ? "NEX Creator" : "Listener"}
                        </p>
                      </div>
                    )}
                    {profile?.role === "nex" && (
                      <Link href={`/profile/${profile.username?.toLowerCase()}`} onClick={() => setUserMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer">
                          My Profile
                        </div>
                      </Link>
                    )}
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all flex items-center gap-2"
                    >
                      <LogOut className="w-3 h-3" />
                      Logout
                    </button>
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

      <NexJoinModal open={joinModalOpen} onClose={() => setJoinModalOpen(false)} />
    </div>
  );
}
