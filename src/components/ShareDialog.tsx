import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { Share2, Download, X, Loader2, AlertCircle, Copy, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const getZoneColor = (position: number): string => {
  if (position === 1) return "#f59e0b";
  if (position >= 2 && position <= 4) return "#22c55e";
  if (position >= 5 && position <= 8) return "#3b82f6";
  if (position >= 16) return "#ef4444";
  return "transparent";
};

export const ShareDialog = ({ open, onOpenChange, teams, showPredictions }: ShareDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Check if Web Share API is available
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const currentDate = new Date().toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const generateImage = useCallback(async () => {
    if (!previewRef.current) {
      console.error("[ShareDialog] previewRef is null");
      setGenerationError("Error interno: referencia no disponible");
      return;
    }
    
    setIsGenerating(true);
    setGenerationError(null);
    console.log("[ShareDialog] Starting image generation...");
    
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#0f172a",
        skipFonts: true, // Skip font loading to avoid CORS issues
        cacheBust: true, // Avoid cache issues
      });
      console.log("[ShareDialog] Image generated successfully, length:", dataUrl.length);
      setImageData(dataUrl);
    } catch (error) {
      console.error("[ShareDialog] Error generating image:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setGenerationError(`No se pudo generar la imagen: ${errorMessage}`);
      toast({
        title: "Error al generar imagen",
        description: "Intenta de nuevo o descarga una captura de pantalla",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const handleDownload = useCallback(() => {
    if (!imageData) return;
    
    const link = document.createElement("a");
    link.download = `prediccion-liga1-2026-${Date.now()}.png`;
    link.href = imageData;
    link.click();
    
    toast({
      title: "¡Descargado!",
      description: "La imagen se ha guardado correctamente",
    });
  }, [imageData, toast]);

  const handleShare = useCallback(async () => {
    if (!imageData) return;
    
    try {
      const blob = await (await fetch(imageData)).blob();
      const file = new File([blob], "prediccion-liga1-2026.png", { type: "image/png" });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Mi Predicción Liga 1 2026",
          text: "¡Mira mi predicción para la Liga 1 2026!",
          files: [file],
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast({
          title: "¡Copiado!",
          description: "La imagen se ha copiado al portapapeles",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
      // Try URL share as fallback
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Mi Predicción Liga 1 2026",
            text: "¡Mira mi predicción para la Liga 1 2026!",
          });
        } catch {
          toast({
            title: "No disponible",
            description: "Descarga la imagen para compartir",
          });
        }
      }
    }
  }, [imageData, toast]);

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

  const handleRetry = useCallback(() => {
    setGenerationError(null);
    setImageData(null);
    setTimeout(generateImage, 100);
  }, [generateImage]);

  // Generate image when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (newOpen) {
      setImageData(null);
      setGenerationError(null);
      setTimeout(generateImage, 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Compartir Tabla
          </DialogTitle>
          <DialogDescription>
            Genera una imagen de tu predicción para compartir
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 relative">
          {/* Preview Container - This gets converted to image */}
          <div 
            ref={previewRef}
            className="w-full p-4 rounded-xl"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
            }}
          >
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-1">
                ⚽ Mi Predicción 2026
              </h2>
              <p className="text-xs text-slate-400">{currentDate}</p>
            </div>

            {/* Mini Table */}
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
                        <td className="py-1 px-2 text-slate-300 font-medium">
                          {position}
                        </td>
                        <td className="py-1 px-2">
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                              style={{ 
                                backgroundColor: team.primaryColor,
                                color: getContrastColor(team.primaryColor)
                              }}
                            >
                              {team.abbreviation.slice(0, 2)}
                            </div>
                            <span className="text-white truncate text-[11px]">
                              {team.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-1 px-2 text-center text-slate-400">{played}</td>
                        <td className="py-1 px-2 text-center">
                          <span className={gd > 0 ? "text-green-400" : gd < 0 ? "text-red-400" : "text-slate-400"}>
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

            {/* Footer */}
            <div className="mt-3 text-center">
              <p className="text-[10px] text-slate-500">
                Creado con Calculadora Liga 1 2026
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isGenerating && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generando imagen...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {generationError && !isGenerating && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive">{generationError}</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="px-0 h-auto text-destructive"
                    onClick={handleRetry}
                  >
                    Intentar de nuevo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success indicator */}
          {imageData && !isGenerating && (
            <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-500 text-center">
                ✓ Imagen lista para descargar o compartir
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-4 border-t border-border">
          {/* Primary actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleDownload}
              disabled={!imageData || isGenerating}
            >
              <Download className="w-4 h-4" />
              Descargar PNG
            </Button>
            
            {canShare ? (
              <Button
                className="flex-1 gap-2"
                onClick={handleShare}
                disabled={!imageData || isGenerating}
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="flex-1 gap-2"
                onClick={handleCopyLink}
              >
                <Link className="w-4 h-4" />
                Copiar Link
              </Button>
            )}
          </div>

          {/* Status info */}
          {isGenerating && (
            <p className="text-xs text-muted-foreground text-center">
              Preparando imagen...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
