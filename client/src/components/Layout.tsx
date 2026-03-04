import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, PlusCircle, User, LogOut, Disc3, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated, logout, isLoading } = useAuth();

  const navItems = [
    { path: "/", icon: Home, label: "Board" },
    { path: "/submit", icon: PlusCircle, label: "Submit" },
    { path: "/profile/me", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-20 flex flex-col">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-20 fixed left-0 top-0 bottom-0 border-r border-white/10 bg-background/80 backdrop-blur-xl z-50 py-6 items-center">
        <Link href="/" className="mb-10 text-primary hover:neon-text transition-all duration-300">
          <Disc3 className="w-10 h-10 animate-[spin_10s_linear_infinite]" />
        </Link>
        
        <nav className="flex-1 flex flex-col gap-8 w-full items-center">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path} className="relative group w-full flex justify-center">
                <div className={clsx(
                  "p-3 rounded-xl transition-all duration-300",
                  isActive ? "bg-primary/20 text-primary" : "text-muted-foreground group-hover:text-foreground group-hover:bg-white/5"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-md shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {!isLoading && (
          <div className="mt-auto">
            {isAuthenticated ? (
              <button 
                onClick={() => logout()}
                className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut className="w-6 h-6" />
              </button>
            ) : (
              <a href="/api/login" className="p-3 text-primary hover:bg-primary/10 rounded-xl transition-all block">
                <User className="w-6 h-6" />
              </a>
            )}
          </div>
        )}
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-background/80 backdrop-blur-xl z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-primary neon-text font-display font-bold text-2xl tracking-widest">
          <Disc3 className="w-6 h-6 animate-[spin_10s_linear_infinite]" />
          NEO
        </Link>
        {!isLoading && !isAuthenticated && (
          <a href="/api/login" className="text-xs font-bold uppercase border border-primary/50 text-primary px-3 py-1.5 rounded-full bg-primary/10">
            Join
          </a>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 mt-16 md:mt-0 relative z-10">
        {!isLoading && !isAuthenticated && location !== '/join' && (
          <div className="mb-8 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-4 backdrop-blur-sm">
            <ShieldAlert className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display font-bold text-lg text-primary tracking-wide">AUTHENTICATION REQUIRED</h3>
              <p className="text-sm text-foreground/80 mt-1 mb-3">Join the NEX League System to submit works and build your AI Craft Score.</p>
              <div className="flex gap-3">
                <Link href="/join" className="text-xs font-bold uppercase bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
                  Learn More
                </Link>
                <a href="/api/login" className="text-xs font-bold uppercase bg-primary text-black hover:bg-primary/80 px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                  Connect Account
                </a>
              </div>
            </div>
          </div>
        )}
        
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] border-t border-white/10 bg-background/90 backdrop-blur-2xl z-50 flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path} className={clsx(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              {isActive && <div className="absolute top-0 w-8 h-0.5 bg-primary shadow-[0_0_10px_rgba(0,240,255,0.8)]" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
