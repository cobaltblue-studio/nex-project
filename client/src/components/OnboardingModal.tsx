import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Disc3, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function sanitizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

export function OnboardingModal() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const safeCurrentUsername = useMemo(
    () => (typeof user?.username === "string" ? user.username.trim() : ""),
    [user?.username],
  );

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setOpen(false);
      return;
    }
    // First-login onboarding: only when auth session has no username yet.
    setOpen(!safeCurrentUsername);
  }, [authLoading, isAuthenticated, safeCurrentUsername]);

  useEffect(() => {
    if (!username) {
      const firstName = (user as any).firstName || "";
      const lastName = (user as any).lastName || "";
      const emailPrefix = (user as any)?.email ? String((user as any).email).split("@")[0] : "";
      const seed = sanitizeUsername(`${firstName}${lastName}`) || sanitizeUsername(emailPrefix) || "nexfan";
      setUsername(seed.slice(0, 20));
    }
  }, [user, username]);

  const handleSubmit = async () => {
    const normalized = sanitizeUsername(username);
    if (normalized.length < 3) {
      toast({
        title: "닉네임을 확인해 주세요",
        description: "닉네임은 영문/숫자/언더스코어로 3자 이상 입력해 주세요.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/profiles", {
        username: normalized,
        role: "listener",
        // Skip forced country modal for first-login onboarding.
        country: "Other",
        aiToolUsed: null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setOpen(false);
      navigate("/");
      toast({
        title: "WELCOME TO NEX",
        description: "가입이 완료되었습니다. 바로 배틀과 투표를 시작해 보세요.",
      });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("409")) {
        toast({
          title: "이미 사용 중인 닉네임",
          description: "다른 닉네임으로 다시 시도해 주세요.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "가입 완료에 실패했습니다",
          description: "잠시 후 다시 시도해 주세요.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md mx-4 bg-[#080808] border border-white/10 rounded-sm shadow-[0_0_80px_rgba(0,240,255,0.08)]"
        >
          <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-white/5">
            <Disc3 className="w-5 h-5 text-primary animate-[spin_6s_linear_infinite] flex-shrink-0" />
            <span className="text-white font-display font-bold text-lg uppercase tracking-widest">
              WELCOME TO NEX
            </span>
          </div>

          <div className="p-8 space-y-5">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-sm">
              <UserPlus className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                First-time setup
              </p>
            </div>
            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest text-center">
              닉네임만 정하면 바로 시작할 수 있어요
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                USERNAME *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                placeholder="e.g. nexfan"
                className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 placeholder:text-zinc-700 font-mono tracking-wide transition-colors"
                maxLength={20}
                data-testid="input-onboarding-username"
                autoFocus
              />
              <p className="text-[10px] text-zinc-600">
                영문 소문자, 숫자, 언더스코어만 사용할 수 있습니다.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleSubmit()}
              disabled={submitting}
              data-testid="button-onboarding-complete"
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "START NEX"
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
