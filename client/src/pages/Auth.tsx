import { useMemo } from "react";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { Link, useSearch } from "wouter";
import { getLoginUrl } from "@/lib/loginRedirect";

export default function Auth() {
  const search = useSearch();
  const loginHref = useMemo(() => {
    const params = new URLSearchParams(search);
    const rt = params.get("returnTo");
    return getLoginUrl(rt ?? undefined);
  }, [search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto py-20 px-4 text-center space-y-8"
    >
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary">NEX</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-tight">
          Sign in
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Continue with your account. After signing in you&apos;ll return to the page you were viewing.
        </p>
      </div>
      <a
        href={loginHref}
        data-testid="button-auth-continue"
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] bg-primary text-black font-bold uppercase tracking-widest text-[11px] px-8 py-4 rounded-sm hover:brightness-110 transition-all"
      >
        <LogIn className="w-4 h-4" />
        Continue to login
      </a>
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
        <Link href="/" className="text-zinc-500 hover:text-primary transition-colors">
          Back to home
        </Link>
      </p>
    </motion.div>
  );
}
