import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveHomeWeekBackground, type HomeWeekBg } from "@/lib/homeWeekBackground";

/**
 * Full-viewport Home atmosphere — portaled to document.body so Layout's
 * max-w-7xl / overflow-x-hidden cannot letterbox the image.
 */
export function HomeWeekBackgroundLayer() {
  const [bg] = useState<HomeWeekBg>(() => resolveHomeWeekBackground());
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMount(document.body);
  }, []);

  if (!mount) return null;

  return createPortal(
    <div
      className="nex-home-page-bg nex-home-page-bg--viewport"
      aria-hidden
      data-testid="home-week-bg"
      data-bg-day={bg.day}
      data-bg-id={bg.id}
    >
      <picture className="nex-home-page-bg-picture">
        <source srcSet={bg.webp} type="image/webp" />
        <img
          src={bg.jpg}
          alt=""
          className="nex-home-page-bg-media nex-home-page-bg-drift"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className="nex-home-page-bg-scrim" />
    </div>,
    mount,
  );
}
