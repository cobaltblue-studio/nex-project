import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { localizedNotificationCopy } from "@/lib/notificationDisplay";
import { clsx } from "clsx";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  trackId: number | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  unreadCount: number;
  items: NotificationItem[];
};

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const dateLocale = i18n.language?.startsWith("ko") ? "ko-KR" : "en-US";

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all", {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-sm border border-white/15 text-zinc-300 hover:text-primary hover:border-primary/40 transition-all"
        aria-label={t("notifications.aria")}
        data-testid="button-notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-black text-[9px] font-black leading-4 text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label={t("notifications.close")}
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-[min(92vw,360px)] max-h-[70vh] overflow-auto rounded-xl border border-primary/25 bg-black/95 shadow-2xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{t("notifications.title")}</p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary"
                >
                  {t("notifications.markAllRead")}
                </button>
              ) : null}
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11px] text-zinc-500">{t("notifications.empty")}</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {items.map((n) => {
                  const copy = localizedNotificationCopy(n, t);
                  return (
                  <li key={n.id}>
                    <Link
                      href={n.href || (n.trackId ? `/track/${n.trackId}` : "/")}
                      onClick={() => {
                        if (!n.readAt) markReadMutation.mutate(n.id);
                        setOpen(false);
                      }}
                      className={clsx(
                        "block px-3 py-3 hover:bg-white/5 transition-colors",
                        !n.readAt && "bg-primary/5",
                      )}
                    >
                      <p className="text-xs font-bold text-white">{copy.title}</p>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{copy.body}</p>
                      <p className="text-[9px] text-zinc-600 mt-1 uppercase tracking-widest">
                        {new Date(n.createdAt).toLocaleString(dateLocale)}
                      </p>
                    </Link>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
