import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Music, Disc3, LogOut, ChevronDown, Send, Swords, ShieldCheck, Users, CircleUserRound, Sparkles, Video, TrendingUp, Radio, BarChart3 } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { isCreatorStudioRole } from "@shared/constants";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { useTranslation } from "react-i18next";

interface LayoutProps {
  children: ReactNode;
}

type Profile = {
  id: number;
  username: string;
  role: string;
  country: string | null;
  followerCount?: number;
};

type UiBranchKey = "guest" | "member" | "creator" | "admin";
type UiBranchRule = {
  showLoginButton: boolean;
  showUserMenu: boolean;
  showAdminPanelNav: boolean;
  showSubmitTrackNav: boolean;
};

// UI decision table: role/auth state -> what appears in header/nav.
const UI_BRANCH_TABLE: Record<UiBranchKey, UiBranchRule> = {
  guest: {
    showLoginButton: true,
    showUserMenu: false,
    showAdminPanelNav: false,
    showSubmitTrackNav: false,
  },
  member: {
    showLoginButton: false,
    showUserMenu: true,
    showAdminPanelNav: false,
    showSubmitTrackNav: true,
  },
  creator: {
    showLoginButton: false,
    showUserMenu: true,
    showAdminPanelNav: false,
    showSubmitTrackNav: true,
  },
  admin: {
    showLoginButton: false,
    showUserMenu: true,
    showAdminPanelNav: true,
    showSubmitTrackNav: true,
  },
};

/** Top nav is always English (brand / wayfinding), regardless of UI language. */
const HEADER_NAV = {
  home: "HOME",
  new: "NEW",
  music: "MUSIC",
  musicVideo: "MUSIC VIDEO",
  battle: "BATTLE",
  rising: "RISING",
  creators: "CREATORS",
  radio: "RADIO",
  submitTrack: "SUBMIT TRACK",
  adminPanel: "ADMIN PANEL",
} as const;

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isUserAuthenticated = isAuthenticated;
  let returnPath = location && location.startsWith("/") ? location : "/";
  if (returnPath === "/auth" || returnPath.startsWith("/auth?")) returnPath = "/";
  const loginHref = `/auth?returnTo=${encodeURIComponent(returnPath)}`;

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profiles/me"],
    enabled: isUserAuthenticated,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isUserAuthenticated) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = "nex_visit_ping";
    if (sessionStorage.getItem(key) === today) return;
    void fetch("/api/activity/visit", { method: "POST", credentials: "include" })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(key, today);
      })
      .catch(() => {});
  }, [isUserAuthenticated]);

  const isAdmin = user?.role === "admin";
  /** Admin 계정도 크리에이터 인사이트(본인 스냅샷) 경로를 쓸 수 있게 노출 */
  const showInsightsLink =
    isAdmin || isCreatorStudioRole(user?.role) || isCreatorStudioRole(profile?.role);
  const roleLabel = isAdmin
    ? t("layout.roleAdmin")
    : isCreatorStudioRole(user?.role)
      ? t("layout.roleCreator")
      : t("layout.roleListener");
  const uiBranch: UiBranchKey = !isUserAuthenticated
    ? "guest"
    : isAdmin
      ? "admin"
      : isCreatorStudioRole(user?.role)
        ? "creator"
        : "member";
  const ui = UI_BRANCH_TABLE[uiBranch];

  const handleLogout = async () => {
    setUserMenuOpen(false);
    logout();
  };

  const navItems = useMemo(() => {
    const core = [
      { path: "/", icon: Home, label: HEADER_NAV.home },
      { path: "/new", icon: Sparkles, label: HEADER_NAV.new },
      { path: "/music", icon: Music, label: HEADER_NAV.music },
      { path: "/music-video", icon: Video, label: HEADER_NAV.musicVideo },
      { path: "/battle", icon: Swords, label: HEADER_NAV.battle },
      { path: "/rising", icon: TrendingUp, label: HEADER_NAV.rising },
      { path: "/creators", icon: Users, label: HEADER_NAV.creators },
      { path: "/radio", icon: Radio, label: HEADER_NAV.radio },
    ];
    const tail: { path: string; icon: typeof Home; label: string }[] = [];
    if (ui.showSubmitTrackNav) {
      tail.push({ path: "/submit-track", icon: Send, label: HEADER_NAV.submitTrack });
    }
    if (ui.showAdminPanelNav) {
      tail.push({ path: "/admin", icon: ShieldCheck, label: HEADER_NAV.adminPanel });
    }
    return [...core, ...tail];
  }, [ui]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 right-0 h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl z-50 flex items-center justify-between gap-3 px-4 sm:px-8 md:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-primary font-display font-bold tracking-tighter group border-none shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
        >
          <Disc3 className="w-5 h-5 md:w-8 md:h-8 main-logo-icon animate-[spin_8s_linear_infinite]" />
          <span className="text-[1.1rem] md:text-[1.5rem] main-logo-text">NEX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-x-3 lg:gap-x-5 xl:gap-x-6 ml-4 lg:ml-6 min-w-0 flex-1 justify-start max-w-[min(52rem,100%)] overflow-x-auto [scrollbar-width:thin] px-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path} className={clsx(
                "text-[10px] xl:text-[11px] font-bold uppercase tracking-[0.2em] xl:tracking-[0.3em] transition-all relative py-2 whitespace-nowrap",
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

        <div className="flex items-center shrink-0 gap-2 md:gap-3">
          <div className="block">
            <LanguageSwitcher />
          </div>
          {isLoading ? (
            <div
              className="h-9 min-w-[5.5rem] rounded-sm bg-white/[0.06] animate-pulse"
              aria-hidden
            />
          ) : ui.showLoginButton ? (
            <Link href={loginHref}
              data-testid="button-login"
              className="text-[10px] font-bold uppercase tracking-widest border border-primary/30 text-primary px-5 py-2 rounded-sm bg-primary/5 hover:bg-primary/20 transition-all whitespace-nowrap"
            >
              {t("layout.login")}
            </Link>
          ) : null}

          {!isLoading && ui.showUserMenu && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                data-testid="button-user-menu"
                className={clsx(
                  "flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-primary/30 text-primary rounded-sm bg-primary/5 hover:bg-primary/20 transition-all whitespace-nowrap",
                  isAdmin ? "px-2.5 py-2" : "px-4 py-2 gap-2",
                )}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label={isAdmin ? t("layout.accountMenuAria") : t("layout.myPageMenuAria")}
              >
                <CircleUserRound className="w-4 h-4 text-primary shrink-0" />
                {!isAdmin && <span>{t("layout.myPage")}</span>}
                <ChevronDown className={clsx("w-3 h-3 text-primary/80 shrink-0 transition-transform", userMenuOpen && "rotate-180")} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+6px)] z-20 bg-[#0A0A0A] border border-white/10 rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[220px] py-2 overflow-hidden">

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
                      {!isAdmin && profile?.username && (
                        <p className="text-[9px] text-zinc-600 mt-0.5 lowercase tracking-wider">
                          @{profile.username}
                        </p>
                      )}
                    </div>

                    {!isAdmin && (
                      <Link
                        href="/profile/me"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div
                          data-testid="link-my-profile"
                          className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                        >
                          <CircleUserRound className="w-3 h-3" />
                          {t("layout.viewProfile")}
                        </div>
                      </Link>
                    )}
                    {showInsightsLink && (
                      <Link
                        href="/profile/me/analytics"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div
                          data-testid="link-creator-analytics"
                          className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                        >
                          <BarChart3 className="w-3 h-3" />
                          {t("layout.creatorAnalytics")}
                        </div>
                      </Link>
                    )}
                    {!isAdmin && ui.showSubmitTrackNav && (
                      <Link
                        href="/submit-track"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div
                          data-testid="link-submit-track"
                          className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white hover:bg-primary/10 transition-all cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          {t("layout.submitTrackMenu")}
                        </div>
                      </Link>
                    )}

                    {/* Admin Panel link — only for admin */}
                    {ui.showAdminPanelNav && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div
                          data-testid="link-admin-panel"
                          className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white hover:bg-primary/10 transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {t("layout.adminPanelMenu")}
                        </div>
                      </Link>
                    )}

                    <div className={clsx("border-t border-white/5 mt-1 pt-1", isAdmin ? "" : "")}>
                      <button
                        onClick={handleLogout}
                        data-testid="button-logout"
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
                      >
                        <LogOut className="w-3 h-3" />
                        {t("layout.logout")}
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

      {/* Footer */}
      <footer className={`relative z-10 mt-20 mb-20 md:mb-0 border-t border-white/5 bg-black/30 backdrop-blur-sm px-8 md:px-12 py-8${location === "/battle" ? " battle-page-footer" : ""}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">© 2026 NEX</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600 mt-0.5">{t("layout.footerTagline")}</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { href: "/about", label: t("layout.footerAbout") },
              { href: "/data-policy", label: t("layout.footerDataPolicy") },
              { href: "/chart-methodology", label: t("layout.footerMethodology") },
              ...(ui.showSubmitTrackNav ? [{ href: "/submit-track", label: t("layout.footerSubmit") }] as const : []),
              { href: "mailto:d9ckoblack@gmail.com", label: t("layout.footerContact") },
            ].map(({ href, label }) => (
              href.startsWith("mailto:") ? (
                <a
                  key={label}
                  href={href}
                  className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  href={href}
                  className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              )
            ))}
          </nav>
        </div>
      </footer>

      <nav className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 h-20 border-t border-white/5 bg-black/80 backdrop-blur-2xl z-50 flex items-center justify-around px-4">
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
