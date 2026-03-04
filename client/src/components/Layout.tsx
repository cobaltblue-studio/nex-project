import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Trophy, UserPlus, User, LogOut, Disc3, PlusSquare } from "lucide-react";
import { clsx } from "clsx";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated, logout, isLoading } = useAuth();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/board", icon: Trophy, label: "Board" },
    { path: "/submit", icon: PlusSquare, label: "Submit" },
    { path: "/join", icon: UserPlus, label: "Join" },
    { path: "/profile/me", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-x-hidden font-sans">
      {/* Background radial glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl z-50 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-primary neon-text font-display font-bold text-xl tracking-tighter">
          <Disc3 className="w-5 h-5 animate-[spin_8s_linear_infinite]" />
          NEO
        </Link>
        {!isLoading && !isAuthenticated && (
          <a href="/api/login" className="text-[10px] font-bold uppercase tracking-widest border border-primary/30 text-primary px-3 py-1.5 rounded-sm bg-primary/5 hover:bg-primary/10 transition-all">
            Connect
          </a>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10 pt-16 pb-24 md:pt-0 md:pl-20">
        <div className="max-w-5xl mx-auto p-6 md:p-12">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] border-t border-white/5 bg-black/60 backdrop-blur-2xl z-50 flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path === "/profile/me" && location.startsWith("/profile"));
          return (
            <Link key={item.path} href={item.path} className={clsx(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-all relative",
              isActive ? "text-primary" : "text-zinc-500 hover:text-zinc-300"
            )}>
              <item.icon className={clsx("w-5 h-5 transition-transform", isActive && "scale-110 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]")} />
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]">{item.label}</span>
              {isActive && (
                <div className="absolute -top-[1px] w-10 h-[2px] bg-primary shadow-[0_0_12px_rgba(0,240,255,1)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Desktop Navigation (Vertical) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-10 border-r border-white/5 bg-black/40 backdrop-blur-xl z-50">
        <Link href="/" className="mb-14 text-primary group">
          <Disc3 className="w-8 h-8 animate-[spin_10s_linear_infinite] group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
        </Link>
        <nav className="flex flex-col gap-10">
          {navItems.map((item) => {
             const isActive = location === item.path || (item.path === "/profile/me" && location.startsWith("/profile"));
             return (
               <Link key={item.path} href={item.path} className="relative group flex items-center justify-center w-12 h-12">
                 <item.icon className={clsx(
                   "w-6 h-6 transition-all duration-300",
                   isActive ? "text-primary drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]" : "text-zinc-500 group-hover:text-white"
                 )} />
                 {isActive && (
                   <div className="absolute -left-[22px] w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_15px_rgba(0,240,255,1)]" />
                 )}
                 <div className="absolute left-16 bg-black/90 border border-white/10 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                   {item.label}
                 </div>
               </Link>
             );
          })}
        </nav>
        
        {!isLoading && isAuthenticated && (
          <button 
            onClick={() => logout()}
            className="mt-auto p-4 text-zinc-500 hover:text-red-500 transition-colors group relative"
          >
            <LogOut className="w-5 h-5" />
            <div className="absolute left-16 bg-black/90 border border-white/10 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Logout
            </div>
          </button>
        )}
      </aside>
    </div>
  );
}
