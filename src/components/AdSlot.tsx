import { useEffect, useRef } from "react";

/**
 * Google AdSense display unit.
 *
 * Renders nothing at all unless both VITE_ADSENSE_CLIENT (ca-pub-…) and a slot
 * id are configured, so the layout is unchanged until AdSense is actually
 * approved and the environment variables are set in Vercel. The loader script is
 * injected on demand rather than in index.html, which keeps it off the critical
 * path for every visitor who never scrolls to an ad.
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const AD_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const SCRIPT_ID = "adsbygoogle-loader";

const ensureLoader = () => {
  if (!AD_CLIENT || document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
  document.head.appendChild(script);
};

interface AdSlotProps {
  /** Ad unit id from the AdSense dashboard. */
  slot: string;
  format?: string;
  className?: string;
}

export const AdSlot = ({ slot, format = "auto", className }: AdSlotProps) => {
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_CLIENT || !slot || pushed.current) return;
    pushed.current = true;
    ensureLoader();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // An ad blocker or a not-yet-loaded script: nothing to recover from.
    }
  }, [slot]);

  if (!AD_CLIENT || !slot) return null;

  return (
    <div className={className}>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <p className="text-[9px] text-muted-foreground/50 text-center mt-1">Publicidad</p>
    </div>
  );
};
