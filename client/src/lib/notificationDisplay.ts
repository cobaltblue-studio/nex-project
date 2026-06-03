import type { TFunction } from "i18next";

type NotificationRow = {
  type: string;
  title: string;
  body: string;
};

function quotedTitleFromBody(body: string): string {
  const m = body.match(/"([^"]+)"/) ?? body.match(/「([^」]+)」/);
  return m?.[1]?.trim() ?? "";
}

/** Map server-stored English notification copy to active UI language. */
export function localizedNotificationCopy(
  n: NotificationRow,
  t: TFunction,
): { title: string; body: string } {
  const title = quotedTitleFromBody(n.body) || "…";

  switch (n.type) {
    case "track_liked":
      return {
        title: t("notifications.trackLikedTitle"),
        body: t("notifications.trackLikedBody", { title }),
      };
    case "track_approved": {
      let dest = t("notifications.destNex");
      if (n.body.includes("Music Video")) dest = t("notifications.destMv");
      else if (n.body.includes("Music chart")) dest = t("notifications.destChart");
      else if (n.body.includes("Battle pool")) dest = t("notifications.destBattle");
      return {
        title: t("notifications.trackApprovedTitle"),
        body: t("notifications.trackApprovedBody", { title, dest }),
      };
    }
    case "track_rejected":
      return {
        title: t("notifications.trackRejectedTitle"),
        body: t("notifications.trackRejectedBody", { title }),
      };
    default:
      return { title: n.title, body: n.body };
  }
}
