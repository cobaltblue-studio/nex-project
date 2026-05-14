import i18n from "@/i18n";

/** Toast copy for failed API actions — follows UI language (EN/KO). */
export function apiMutationErrorToast(err: Error): { title: string; description: string } {
  const msg = String(err?.message ?? "");
  const m = msg.match(/^(\d{3}):\s*([\s\S]+)$/);
  const status = m ? Number(m[1]) : null;
  const detail = m ? m[2].trim() : msg.trim();

  if (status === 401) {
    return {
      title: i18n.t("apiErrors.sessionExpiredTitle"),
      description: i18n.t("apiErrors.sessionExpiredDesc"),
    };
  }
  if (status === 409) {
    return {
      title: i18n.t("apiErrors.alreadyLikedTitle"),
      description: i18n.t("apiErrors.alreadyLikedDesc"),
    };
  }
  if (status && status >= 500) {
    return {
      title: i18n.t("apiErrors.serverTitle"),
      description: i18n.t("apiErrors.serverDesc"),
    };
  }
  if (status === 403) {
    return {
      title: i18n.t("apiErrors.forbiddenTitle"),
      description: detail || i18n.t("apiErrors.forbiddenDesc"),
    };
  }
  return {
    title: i18n.t("apiErrors.genericLikeTitle"),
    description: detail || i18n.t("apiErrors.genericLikeDesc"),
  };
}
