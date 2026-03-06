import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Music, Video, Disc3, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated, logout, isLoading } = useAuth();

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

        <div className="flex items-center gap-6">
          {!isLoading && !isAuthenticated ? (
            <a href="/api/login" className="text-[10px] font-bold uppercase tracking-widest border border-primary/30 text-primary px-5 py-2 rounded-sm bg-primary/5 hover:bg-primary/20 transition-all">
              Connect NEX
            </a>
          ) : isAuthenticated && (
            <button onClick={() => logout()} className="text-zinc-500 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
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
