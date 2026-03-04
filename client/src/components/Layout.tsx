import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Trophy, UserPlus, User, LogOut, Disc3 } from "lucide-react";
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
    { path: "/join", icon: UserPlus, label: "Join" },
    { path: "/profile/me", icon: User, label: "Profile" },
  ];

  // Map routes to PPT background images
  const getBgImage = () => {
    if (location === "/") return "/ppt/home.png";
    if (location === "/board") return "/ppt/board.png";
    if (location === "/join") return "/ppt/join.png";
    if (location.startsWith("/profile")) return "/ppt/profile.png";
    return null;
  };

  const bgImage = getBgImage();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-x-hidden">
      {/* PPT Background Layer */}
      {bgImage && (
        <div 
          className="fixed inset-0 z-0 bg-no-repeat bg-center bg-cover md:bg-contain opacity-80"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}

      {/* Dark Overlay for readability if needed */}
      <div className="fixed inset-0 z-[1] bg-black/40 pointer-events-none" />

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-primary neon-text font-display font-bold text-2xl tracking-widest">
          <Disc3 className="w-6 h-6 animate-[spin_10s_linear_infinite]" />
          NEO
        </Link>
        {!isLoading && !isAuthenticated && (
          <a href="/api/login" className="text-xs font-bold uppercase border border-primary/50 text-primary px-3 py-1.5 rounded-full bg-primary/10">
            Login
          </a>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10 pt-16 pb-24 md:pt-0 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] border-t border-white/10 bg-black/80 backdrop-blur-2xl z-50 flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path === "/profile/me" && location.startsWith("/profile"));
          return (
            <Link key={item.path} href={item.path} className={clsx(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <item.icon className={clsx("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]")} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 w-12 h-1 bg-primary shadow-[0_0_15px_rgba(0,240,255,1)] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Desktop Navigation (Condensed) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 border-r border-white/10 bg-black/60 backdrop-blur-xl z-50">
        <Link href="/" className="mb-12 text-primary">
          <Disc3 className="w-10 h-10 animate-[spin_10s_linear_infinite]" />
        </Link>
        <nav className="flex flex-col gap-10">
          {navItems.map((item) => {
             const isActive = location === item.path || (item.path === "/profile/me" && location.startsWith("/profile"));
             return (
               <Link key={item.path} href={item.path} className="relative group">
                 <item.icon className={clsx(
                   "w-7 h-7 transition-all duration-300",
                   isActive ? "text-primary drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]" : "text-muted-foreground group-hover:text-white"
                 )} />
                 {isActive && (
                   <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_15px_rgba(0,240,255,1)]" />
                 )}
               </Link>
             );
          })}
        </nav>
        
        {!isLoading && isAuthenticated && (
          <button 
            onClick={() => logout()}
            className="mt-auto p-3 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-6 h-6" />
          </button>
        )}
      </aside>
    </div>
  );
}
