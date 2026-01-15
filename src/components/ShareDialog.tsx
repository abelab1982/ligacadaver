import React, { useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import { toBlob, toPng } from "html-to-image";
import { AlertCircle, Download, Link, Loader2, Share2, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamStats } from "@/hooks/useLeagueEngine";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TeamStats[];
  showPredictions: boolean;
}

const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
};

const getZoneColor = (position: number): string => {
  if (position === 1) return "#f59e0b";
  if (position >= 2 && position <= 4) return "#22c55e";
  if (position >= 5 && position <= 8) return "#3b82f6";
  if (position >= 16) return "#ef4444";
  return "transparent";
};

type CaptureTarget = "preview" | "export" | "debug";

type NodeSummary = {
  id: string | null;
  className: string | null;
  clientWidth: number;
  clientHeight: number;
  rect: { x: number; y: number; width: number; height: number };
  offsetParentExists: boolean;
  isConnected: boolean;
  computedOverflow: string;
  computedOverflowY: string;
};

const summarizeNode = (node: HTMLElement | null): NodeSummary | null => {
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  const style = window.getComputedStyle(node);
  return {
    id: node.id || null,
    className: node.className ? String(node.className) : null,
    clientWidth: node.clientWidth,
    clientHeight: node.clientHeight,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    offsetParentExists: !!node.offsetParent,
    isConnected: node.isConnected,
    computedOverflow: style.overflow,
    computedOverflowY: style.overflowY,
  };
};

const raf = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const waitForCaptureReady = async (): Promise<void> => {
  // Two frames to allow layout/paint to settle
  await raf();
  await raf();

  // If fonts are still loading, wait (best-effort)
  const fonts = (document as any).fonts;
  if (fonts?.ready?.then) {
    try {
      await fonts.ready;
    } catch {
      // ignore
    }
  }

  // One extra frame after fonts ready
  await raf();
};

const cleanProblematicStylesForExport = (root: HTMLElement) => {
  // Remove common style features that break rasterization or create huge blur regions
  const nodes = root.querySelectorAll<HTMLElement>("*");
  nodes.forEach((el) => {
    // only inline overrides so we don't change the app's normal UI
    el.style.filter = "none";
    (el.style as any).backdropFilter = "none";
    el.style.transform = "none";
    el.style.boxShadow = "none";
  });
};

function ShareCard({
  teams,
  showPredictions,
  currentDate,
  refProp,
}: {
  teams: TeamStats[];
  showPredictions: boolean;
  currentDate: string;
  refProp?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={refProp}
      className="w-full p-4 rounded-xl"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white mb-1">⚽ Mi Predicción 2026</h2>
        <p className="text-xs text-slate-400">{currentDate}</p>
      </div>

      <div className="bg-slate-900/50 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1.5 px-2 text-left w-8">#</th>
              <th className="py-1.5 px-2 text-left">Equipo</th>
              <th className="py-1.5 px-2 text-center">PJ</th>
              <th className="py-1.5 px-2 text-center">DG</th>
              <th className="py-1.5 px-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => {
              const position = index + 1;
              const played = showPredictions ? team.predictedPlayed : team.played;
              const gd = showPredictions ? team.predictedGoalDifference : team.goalDifference;
              const points = showPredictions ? team.predictedPoints : team.points;
              const zoneColor = getZoneColor(position);

              return (
                <tr
                  key={team.id}
                  className="border-b border-slate-800/50"
                  style={{ borderLeftColor: zoneColor, borderLeftWidth: 3 }}
                >
                  <td className="py-1 px-2 text-slate-300 font-medium">{position}</td>
                  <td className="py-1 px-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                        style={{
                          backgroundColor: team.primaryColor,
                          color: getContrastColor(team.primaryColor),
                        }}
                      >
                        {team.abbreviation.slice(0, 2)}
                      </div>
                      <span className="text-white truncate text-[11px]">{team.name}</span>
                    </div>
                  </td>
                  <td className="py-1 px-2 text-center text-slate-400">{played}</td>
                  <td className="py-1 px-2 text-center">
                    <span
                      className={
                        gd > 0 ? "text-green-400" : gd < 0 ? "text-red-400" : "text-slate-400"
                      }
                    >
                      {gd > 0 ? `+${gd}` : gd}
                    </span>
                  </td>
                  <td className="py-1 px-2 text-center text-amber-400 font-bold">{points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-center">
        <p className="text-[10px] text-slate-500">Creado con Calculadora Liga 1 2026</p>
      </div>
    </div>
  );
}

export const ShareDialog = ({ open, onOpenChange, teams, showPredictions }: ShareDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [errorStack, setErrorStack] = useState<string | null>(null);
  const [nodeSummary, setNodeSummary] = useState<NodeSummary | null>(null);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [canShare, setCanShare] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);
  const exportRootId = useId();

  const { toast } = useToast();

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("es-PE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const log = useCallback((...args: any[]) => {
    // eslint-disable-next-line no-console
    console.log("[ShareDialog][debug]", ...args);
    setDebugLines((prev) => {
      const next = [...prev, args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")];
      return next.slice(-80);
    });
  }, []);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const getCaptureNode = useCallback(
    (target: CaptureTarget): HTMLElement | null => {
      if (target === "preview") return previewRef.current;
      if (target === "export") return exportRef.current;
      return debugRef.current;
    },
    []
  );

  const captureWithDiagnostics = useCallback(
    async (target: CaptureTarget): Promise<{ dataUrl?: string; blob?: Blob } | null> => {
      const node = getCaptureNode(target);

      log("capture target:", target);
      log("ref.current exists:", !!node);

      const summary = summarizeNode(node);
      setNodeSummary(summary);
      log("node summary:", summary);

      if (!node) {
        setGenerationError("ref.current es null (no existe el nodo a capturar)");
        setErrorStack(null);
        return null;
      }

      const rect = node.getBoundingClientRect();
      const visible = !!node.offsetParent && rect.width > 0 && rect.height > 0;
      log("visible (offsetParent && rect>0):", visible);

      // If the node is inside an overflow container, we prefer the export node.
      const style = window.getComputedStyle(node);
      log("computed overflow:", style.overflow, "overflowY:", style.overflowY);

      await waitForCaptureReady();

      // For export node: strip problematic effects (only affects cloned export DOM)
      if (target === "export") {
        cleanProblematicStylesForExport(node);
      }

      const options = {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#0f172a",
        cacheBust: true,
      } as const;

      log("html-to-image options:", options);

      try {
        // Prefer blob (more reliable for download/share)
        const blob = (await toBlob(node, options)) || undefined;
        if (blob) {
          log("toBlob OK size:", blob.size);
          return { blob };
        }
        log("toBlob returned null -> fallback to toPng");
        const dataUrl = await toPng(node, { ...options, skipFonts: false });
        log("toPng OK length:", dataUrl.length);
        return { dataUrl };
      } catch (err) {
        const e = err as any;
        const msg = e?.message ? String(e.message) : "Error desconocido";
        const stack = e?.stack ? String(e.stack) : null;

        setGenerationError(msg);
        setErrorStack(stack);

        log("CAPTURE ERROR message:", msg);
        if (stack) log("CAPTURE ERROR stack:", stack);

        toast({
          title: "No se pudo exportar",
          description: msg,
          variant: "destructive",
        });

        return null;
      }
    },
    [getCaptureNode, log, toast]
  );

  const ensureImageData = useCallback(async (): Promise<string | null> => {
    setIsGenerating(true);
    setGenerationError(null);
    setErrorStack(null);

    // Always rebuild image from the export node (outside scroll/overflow)
    const res = await captureWithDiagnostics("export");

    try {
      if (res?.dataUrl) {
        setImageData(res.dataUrl);
        return res.dataUrl;
      }

      if (res?.blob) {
        const url = URL.createObjectURL(res.blob);
        setImageData(url);
        return url;
      }

      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [captureWithDiagnostics]);

  const handleDownload = useCallback(async () => {
    // Required change: generate on-demand, do not gate button by imageData
    const url = imageData || (await ensureImageData());

    log("download clicked. imageData existed:", !!imageData, "final url:", !!url);

    if (!url) {
      // generationError is already set + toast displayed, but also keep UI feedback
      return;
    }

    const link = document.createElement("a");
    link.download = `prediccion-liga1-2026-${Date.now()}.png`;
    link.href = url;
    link.click();

    toast({
      title: "¡Descargado!",
      description: "La imagen se ha guardado correctamente",
    });
  }, [ensureImageData, imageData, log, toast]);

  const handleShare = useCallback(async () => {
    const url = imageData || (await ensureImageData());
    log("share clicked. imageData existed:", !!imageData, "final url:", !!url);

    if (!url) return;

    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "prediccion-liga1-2026.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Mi Predicción Liga 1 2026",
          text: "¡Mira mi predicción para la Liga 1 2026!",
          files: [file],
        });
        return;
      }

      toast({
        title: "Compartir no disponible",
        description: "Tu navegador no soporta compartir imágenes. Puedes descargar el PNG.",
      });
    } catch (err) {
      const e = err as any;
      const msg = e?.message ? String(e.message) : "Error compartiendo";
      log("share error:", msg);
      toast({
        title: "Error al compartir",
        description: msg,
        variant: "destructive",
      });
    }
  }, [ensureImageData, imageData, log, toast]);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "¡Link copiado!",
        description: "El enlace se ha copiado al portapapeles",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleRetry = useCallback(async () => {
    setDebugLines([]);
    setImageData(null);
    setGenerationError(null);
    setErrorStack(null);

    await ensureImageData();
  }, [ensureImageData]);

  const handleGenerateDebug = useCallback(async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setErrorStack(null);

    log("=== DEBUG CAPTURE START ===");
    const res = await captureWithDiagnostics("debug");
    log("debug capture result:", { hasBlob: !!res?.blob, hasDataUrl: !!res?.dataUrl });
    log("=== DEBUG CAPTURE END ===");

    setIsGenerating(false);
  }, [captureWithDiagnostics, log]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
      if (newOpen) {
        setDebugLines([]);
        setImageData(null);
        setGenerationError(null);
        setErrorStack(null);
      }
    },
    [onOpenChange]
  );

  return (
    <>
      {/*
        Export container OUTSIDE scroll/overflow: fixed off-screen.
        This is what we actually capture.
      */}
      <div
        id={`export-${exportRootId}`}
        className="pointer-events-none"
        style={{ position: "fixed", left: -99999, top: 0, width: 520 }}
        aria-hidden="true"
      >
        <ShareCard
          refProp={exportRef}
          teams={teams}
          showPredictions={showPredictions}
          currentDate={currentDate}
        />

        {/* Minimal debug node (no scroll/overflow/fancy effects) */}
        <div
          ref={debugRef}
          style={{
            marginTop: 16,
            padding: 16,
            background: "#0f172a",
            color: "#ffffff",
            width: 520,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>DEBUG CARD</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Si esto falla, el problema no es CSS del modal.</div>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            teams: {teams.length} | mode: {showPredictions ? "pred" : "real"}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Compartir Tabla
            </DialogTitle>
            <DialogDescription>Exporta la tabla como PNG (con diagnóstico si falla).</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 relative">
            {/* On-screen preview (NOT the capture source) */}
            <ShareCard
              refProp={previewRef}
              teams={teams}
              showPredictions={showPredictions}
              currentDate={currentDate}
            />

            {isGenerating && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generando imagen...</span>
                </div>
              </div>
            )}

            {(generationError || errorStack) && !isGenerating && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-destructive">{generationError}</p>

                    {nodeSummary && (
                      <pre className="mt-2 text-[11px] leading-snug text-destructive/90 whitespace-pre-wrap break-words">
                        {JSON.stringify(nodeSummary, null, 2)}
                      </pre>
                    )}

                    {errorStack && (
                      <pre className="mt-2 text-[11px] leading-snug text-destructive/90 whitespace-pre-wrap break-words">
                        {errorStack}
                      </pre>
                    )}

                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleRetry} disabled={isGenerating}>
                        Reintentar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleGenerateDebug} disabled={isGenerating}>
                        <Bug className="w-4 h-4 mr-1" />
                        Generar imagen (debug)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {debugLines.length > 0 && (
              <div className="mt-3 p-3 bg-muted/40 border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Diagnóstico (últimas líneas):</p>
                <pre className="text-[11px] leading-snug whitespace-pre-wrap break-words max-h-48 overflow-auto">
                  {debugLines.join("\n")}
                </pre>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleDownload}
                disabled={isGenerating}
              >
                <Download className="w-4 h-4" />
                Descargar PNG
              </Button>

              {canShare ? (
                <Button className="flex-1 gap-2" onClick={handleShare} disabled={isGenerating}>
                  <Share2 className="w-4 h-4" />
                  Compartir
                </Button>
              ) : (
                <Button variant="secondary" className="flex-1 gap-2" onClick={handleCopyLink}>
                  <Link className="w-4 h-4" />
                  Copiar Link
                </Button>
              )}
            </div>

            {isGenerating && (
              <p className="text-xs text-muted-foreground text-center">Preparando imagen (diagnóstico activo)...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
