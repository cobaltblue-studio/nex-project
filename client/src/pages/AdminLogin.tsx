import { useEffect, useMemo } from "react";
import { buildApiUrl } from "@/lib/apiOrigin";

function getLoginUrl() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || "/admin";
  return buildApiUrl(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
}

export default function AdminLogin() {
  const loginUrl = useMemo(() => getLoginUrl(), []);

  useEffect(() => {
    // Auto-start auth for quick admin recovery.
    window.location.href = loginUrl;
  }, [loginUrl]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
      <p className="text-lg font-bold text-white uppercase tracking-wider">Admin Login</p>
      <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
        Redirecting to authentication...
      </p>
      <a
        href={loginUrl}
        className="inline-block text-[10px] font-bold uppercase tracking-widest border border-primary/30 text-primary px-5 py-2 rounded-sm bg-primary/5 hover:bg-primary/20 transition-all"
      >
        Continue
      </a>
    </div>
  );
}
