import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Send, Eye, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CampaignPreview = {
  campaign: {
    slug: string;
    nameEn: string;
    nameKo: string;
  };
  totalRecipients: number;
  creatorRecipients: number;
  visitorRecipients: number;
  alreadySent: number;
  pending: number;
};

type CampaignRun = {
  id: number;
  campaignSlug: string;
  dryRun: boolean;
  status: string;
  requestedBy: string | null;
  requestedAt: string;
  completedAt: string | null;
  error: string | null;
  summary: Record<string, unknown> | null;
};

type CustomForm = {
  internalTitle: string;
  subjectEn: string;
  subjectKo: string;
  headlineEn: string;
  headlineKo: string;
  bodyEn: string;
  bodyKo: string;
  ctaLabelEn: string;
  ctaLabelKo: string;
  ctaHref: string;
};

const EMPTY_CUSTOM: CustomForm = {
  internalTitle: "",
  subjectEn: "",
  subjectKo: "",
  headlineEn: "",
  headlineKo: "",
  bodyEn: "",
  bodyKo: "",
  ctaLabelEn: "Open NEX",
  ctaLabelKo: "NEX 열기",
  ctaHref: "https://nexmusic.ai",
};

type ConfirmAction =
  | { kind: "template-queue"; slug: string; pending: number; dryRun: boolean }
  | { kind: "custom-queue"; payload: CustomForm; pending: number; dryRun: boolean };

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminAnnouncements({ emailEnabled }: { emailEnabled: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"templates" | "compose">("templates");
  const [custom, setCustom] = useState<CustomForm>(EMPTY_CUSTOM);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<CampaignPreview[]>({
    queryKey: ["/api/admin/announcement-campaigns"],
    retry: false,
  });

  const { data: runs, refetch: refetchRuns } = useQuery<CampaignRun[]>({
    queryKey: ["/api/admin/announcement-campaign-runs"],
    retry: false,
  });

  const customPreview = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/announcement-emails/custom/preview", custom).then((r) => r.json()),
    onSuccess: (data: { pending: number; totalRecipients: number }) => {
      toast({
        title: t("adminAnnouncements.previewOk"),
        description: t("adminAnnouncements.previewDesc", {
          pending: data.pending,
          total: data.totalRecipients,
        }),
      });
    },
    onError: (err: Error) => {
      toast({ title: t("adminAnnouncements.previewFail"), description: err.message, variant: "destructive" });
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["/api/admin/announcement-campaigns"] });
    void refetchRuns();
  };

  const runAction = async (action: ConfirmAction | { kind: "template-test"; slug: string } | { kind: "custom-test" }) => {
    setBusy(action.kind);
    try {
      if (action.kind === "template-test") {
        const res = await apiRequest("POST", `/api/admin/announcement-campaigns/${action.slug}/test`, {});
        if (!res.ok) throw new Error(await res.text());
        toast({ title: t("adminAnnouncements.testOk") });
        return;
      }
      if (action.kind === "custom-test") {
        const res = await apiRequest("POST", "/api/admin/announcement-emails/custom/test", custom);
        if (!res.ok) throw new Error(await res.text());
        toast({ title: t("adminAnnouncements.testOk") });
        return;
      }
      if (action.kind === "template-queue") {
        const res = await apiRequest("POST", `/api/admin/announcement-campaigns/${action.slug}/queue`, {
          dryRun: action.dryRun,
        });
        if (!res.ok) throw new Error(await res.text());
        toast({
          title: action.dryRun ? t("adminAnnouncements.dryRunQueued") : t("adminAnnouncements.sendQueued"),
        });
        invalidate();
        return;
      }
      if (action.kind === "custom-queue") {
        const res = await apiRequest("POST", "/api/admin/announcement-emails/custom/queue", {
          ...action.payload,
          dryRun: action.dryRun,
        });
        if (!res.ok) throw new Error(await res.text());
        toast({
          title: action.dryRun ? t("adminAnnouncements.dryRunQueued") : t("adminAnnouncements.sendQueued"),
        });
        setCustom(EMPTY_CUSTOM);
        invalidate();
      }
    } catch (err) {
      toast({
        title: t("adminAnnouncements.actionFail"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const recentRuns = useMemo(() => runs?.slice(0, 8) ?? [], [runs]);

  const fieldClass =
    "w-full rounded-sm border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="mb-10 border border-violet-400/20 rounded-sm bg-violet-400/[0.04] p-4">
      <div className="flex items-start gap-3 mb-4">
        <Mail className="w-5 h-5 text-violet-300 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-300">
            {t("adminAnnouncements.title")}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-2xl">
            {t("adminAnnouncements.body")}
          </p>
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-2">
            {t("adminAnnouncements.sender")}: NEX Team
          </p>
          {!emailEnabled ? (
            <p className="text-[10px] text-amber-400/90 mt-2">{t("adminAnnouncements.emailDisabled")}</p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["templates", "compose"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border transition-colors ${
              tab === key
                ? "border-violet-400/50 text-violet-200 bg-violet-400/10"
                : "border-white/10 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t(`adminAnnouncements.tab_${key}`)}
          </button>
        ))}
      </div>

      {tab === "templates" ? (
        <div className="space-y-3">
          {campaignsLoading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("adminAnnouncements.loading")}
            </div>
          ) : (
            campaigns?.map((row) => (
              <div
                key={row.campaign.slug}
                className="border border-white/5 rounded-sm p-3 bg-black/20 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white">{row.campaign.nameKo}</p>
                  <p className="text-[10px] text-zinc-500">{row.campaign.nameEn}</p>
                  <p className="text-[9px] text-zinc-600 mt-1 font-mono">{row.campaign.slug}</p>
                  <p className="text-[10px] text-zinc-400 mt-2">
                    {t("adminAnnouncements.stats", {
                      pending: row.pending,
                      sent: row.alreadySent,
                      total: row.totalRecipients,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!emailEnabled || busy != null}
                    onClick={() => void runAction({ kind: "template-test", slug: row.campaign.slug })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                  >
                    {busy === "template-test" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                    {t("adminAnnouncements.test")}
                  </button>
                  <button
                    type="button"
                    disabled={!emailEnabled || busy != null}
                    onClick={() =>
                      setConfirm({
                        kind: "template-queue",
                        slug: row.campaign.slug,
                        pending: row.pending,
                        dryRun: true,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                  >
                    <Eye className="w-3 h-3" />
                    {t("adminAnnouncements.dryRun")}
                  </button>
                  <button
                    type="button"
                    disabled={!emailEnabled || busy != null || row.pending === 0}
                    onClick={() =>
                      setConfirm({
                        kind: "template-queue",
                        slug: row.campaign.slug,
                        pending: row.pending,
                        dryRun: false,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-violet-400/40 text-violet-200 hover:bg-violet-400/10 disabled:opacity-40"
                  >
                    <Send className="w-3 h-3" />
                    {t("adminAnnouncements.sendAll")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            className={fieldClass}
            placeholder={t("adminAnnouncements.internalTitle")}
            value={custom.internalTitle}
            onChange={(e) => setCustom((f) => ({ ...f, internalTitle: e.target.value }))}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={fieldClass} placeholder={t("adminAnnouncements.subjectEn")} value={custom.subjectEn} onChange={(e) => setCustom((f) => ({ ...f, subjectEn: e.target.value }))} />
            <input className={fieldClass} placeholder={t("adminAnnouncements.subjectKo")} value={custom.subjectKo} onChange={(e) => setCustom((f) => ({ ...f, subjectKo: e.target.value }))} />
            <input className={fieldClass} placeholder={t("adminAnnouncements.headlineEn")} value={custom.headlineEn} onChange={(e) => setCustom((f) => ({ ...f, headlineEn: e.target.value }))} />
            <input className={fieldClass} placeholder={t("adminAnnouncements.headlineKo")} value={custom.headlineKo} onChange={(e) => setCustom((f) => ({ ...f, headlineKo: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <textarea className={`${fieldClass} min-h-[120px] resize-y`} placeholder={t("adminAnnouncements.bodyEn")} value={custom.bodyEn} onChange={(e) => setCustom((f) => ({ ...f, bodyEn: e.target.value }))} />
            <textarea className={`${fieldClass} min-h-[120px] resize-y`} placeholder={t("adminAnnouncements.bodyKo")} value={custom.bodyKo} onChange={(e) => setCustom((f) => ({ ...f, bodyKo: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input className={fieldClass} placeholder={t("adminAnnouncements.ctaEn")} value={custom.ctaLabelEn} onChange={(e) => setCustom((f) => ({ ...f, ctaLabelEn: e.target.value }))} />
            <input className={fieldClass} placeholder={t("adminAnnouncements.ctaKo")} value={custom.ctaLabelKo} onChange={(e) => setCustom((f) => ({ ...f, ctaLabelKo: e.target.value }))} />
            <input className={fieldClass} placeholder={t("adminAnnouncements.ctaHref")} value={custom.ctaHref} onChange={(e) => setCustom((f) => ({ ...f, ctaHref: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={!emailEnabled || customPreview.isPending}
              onClick={() => customPreview.mutate()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
            >
              {customPreview.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
              {t("adminAnnouncements.previewCount")}
            </button>
            <button
              type="button"
              disabled={!emailEnabled || busy != null}
              onClick={() => void runAction({ kind: "custom-test" })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
            >
              <FlaskConical className="w-3 h-3" />
              {t("adminAnnouncements.test")}
            </button>
            <button
              type="button"
              disabled={!emailEnabled || busy != null}
              onClick={async () => {
                try {
                  const data = await apiRequest("POST", "/api/admin/announcement-emails/custom/preview", custom).then((r) => r.json());
                  setConfirm({
                    kind: "custom-queue",
                    payload: custom,
                    pending: data.pending ?? 0,
                    dryRun: false,
                  });
                } catch (err) {
                  toast({
                    title: t("adminAnnouncements.previewFail"),
                    description: err instanceof Error ? err.message : String(err),
                    variant: "destructive",
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-violet-400/40 text-violet-200 hover:bg-violet-400/10 disabled:opacity-40"
            >
              <Send className="w-3 h-3" />
              {t("adminAnnouncements.sendAll")}
            </button>
          </div>
        </div>
      )}

      {recentRuns.length > 0 ? (
        <div className="mt-6 border-t border-white/5 pt-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
            {t("adminAnnouncements.recentRuns")}
          </p>
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div key={run.id} className="text-[10px] text-zinc-500 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                <span className="text-zinc-400">#{run.id}</span>
                <span>{run.campaignSlug}</span>
                <span className={run.status === "completed" ? "text-emerald-400" : run.status === "failed" ? "text-red-400" : "text-amber-400"}>
                  {run.status}
                </span>
                {run.dryRun ? <span>dry-run</span> : null}
                <span>{fmtDate(run.requestedAt)}</span>
                {run.summary && typeof run.summary.sent === "number" ? (
                  <span>sent={String(run.summary.sent)}</span>
                ) : null}
                {run.error ? <span className="text-red-400 truncate max-w-full">{run.error}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <AlertDialog open={confirm != null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-display uppercase tracking-widest">
              {confirm?.dryRun ? t("adminAnnouncements.confirmDryRunTitle") : t("adminAnnouncements.confirmSendTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              {confirm
                ? t("adminAnnouncements.confirmBody", { count: confirm.pending })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-white/10 bg-transparent text-zinc-400 hover:text-white">
              {t("adminAnnouncements.cancel")}
            </AlertDialogCancel>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => confirm && void runAction(confirm)}
              className="text-[10px] font-bold uppercase tracking-widest bg-violet-500/15 border border-violet-400/40 text-violet-200 px-4 py-2 rounded-sm hover:bg-violet-500/25 disabled:opacity-40"
            >
              {busy != null ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t("adminAnnouncements.confirm")}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
