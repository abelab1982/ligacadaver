import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, RotateCcw, Layout } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { FootballPitch } from "./FootballPitch";
import { PlayerToken } from "./PlayerToken";
import { FormationSelector } from "./FormationSelector";
import { TeamSearch, type LineupPlayer } from "./TeamSearch";
import { formations, type FormationPosition } from "./formations";
import { useToast } from "@/hooks/use-toast";

interface PlayerState {
  id: string;
  name: string;
  number?: number;
  role: string;
  x: number;
  y: number;
}

const STORAGE_KEY = "pizarra-state";

function buildPlayersFromFormation(formationKey: string): PlayerState[] {
  const f = formations[formationKey];
  if (!f) return [];
  return f.positions.map((pos, i) => ({
    id: `p-${i}`,
    name: pos.role,
    role: pos.role,
    x: pos.x,
    y: pos.y,
  }));
}

function loadSaved(): { players: PlayerState[]; formation: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(players: PlayerState[], formation: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, formation }));
}

export const TacticalBoard = () => {
  const saved = loadSaved();
  const [formation, setFormation] = useState(saved?.formation ?? "4-3-3");
  const [players, setPlayers] = useState<PlayerState[]>(
    saved?.players ?? buildPlayersFromFormation("4-3-3")
  );
  const [teamName, setTeamName] = useState<string | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFormationChange = useCallback((key: string) => {
    setFormation(key);
    const newPlayers = buildPlayersFromFormation(key);
    setPlayers(newPlayers);
    setTeamName(null);
    saveState(newPlayers, key);
  }, []);

  const handleDragEnd = useCallback(
    (index: number, x: number, y: number) => {
      setPlayers((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], x, y };
        saveState(updated, formation);
        return updated;
      });
    },
    [formation]
  );

  const handleLineupLoaded = useCallback(
    (lineup: LineupPlayer[], name: string) => {
      // Map API lineup to player positions using grid or formation fallback
      const f = formations[formation];
      const newPlayers: PlayerState[] = lineup.map((lp, i) => {
        let x = f?.positions[i]?.x ?? 50;
        let y = f?.positions[i]?.y ?? 50;

        // If API provides grid (e.g. "1:1", "2:3"), use it
        if (lp.grid) {
          const parts = lp.grid.split(":");
          const row = parseInt(parts[0], 10);
          const col = parseInt(parts[1], 10);
          // Rough mapping: row 1=GK(90%), row 4=FW(20%), col spans evenly
          if (!isNaN(row) && !isNaN(col)) {
            y = 90 - (row - 1) * 18;
            // Determine how many in this row to space columns
            const sameRow = lineup.filter(
              (p) => p.grid && p.grid.startsWith(`${row}:`)
            ).length;
            const colIndex = lineup
              .filter((p) => p.grid && p.grid.startsWith(`${row}:`))
              .indexOf(lp);
            x = ((colIndex + 1) / (sameRow + 1)) * 100;
          }
        }

        return {
          id: `p-${i}`,
          name: lp.name.split(" ").pop() || lp.name, // Last name
          number: lp.number,
          role: lp.pos,
          x: Math.max(5, Math.min(95, x)),
          y: Math.max(5, Math.min(95, y)),
        };
      });

      setPlayers(newPlayers);
      setTeamName(name);
      saveState(newPlayers, formation);
      toast({ title: `Alineación de ${name} cargada` });
    },
    [formation, toast]
  );

  const handleReset = useCallback(() => {
    const newPlayers = buildPlayersFromFormation(formation);
    setPlayers(newPlayers);
    setTeamName(null);
    saveState(newPlayers, formation);
  }, [formation]);

  const handleExport = useCallback(async () => {
    const node = exportRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#1a6b30",
      });
      const link = document.createElement("a");
      link.download = `pizarra-${formation}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Imagen exportada" });
    } catch {
      toast({ title: "Error al exportar", variant: "destructive" });
    }
  }, [formation, toast]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-border bg-card/50 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Layout className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground hidden sm:inline">Pizarra Táctica</span>
        </div>

        <FormationSelector value={formation} onChange={handleFormationChange} />

        <div className="hidden md:block border-l border-border h-5" />

        <TeamSearch onLineupLoaded={handleLineupLoaded} />

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1"
            onClick={handleReset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Team name banner */}
      {teamName && (
        <div className="px-3 py-1 bg-primary/10 border-b border-primary/20 text-center">
          <span className="text-xs font-semibold text-primary">{teamName}</span>
        </div>
      )}

      {/* Pitch */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-3 md:p-6">
        <div ref={exportRef} className="relative w-full max-w-md md:max-w-lg">
          <div ref={pitchRef as React.RefObject<HTMLDivElement>}>
            <FootballPitch>
              {players.map((player, i) => (
                <PlayerToken
                  key={player.id}
                  name={player.name}
                  number={player.number}
                  role={player.role}
                  x={player.x}
                  y={player.y}
                  onDragEnd={(x, y) => handleDragEnd(i, x, y)}
                  containerRef={pitchRef as React.RefObject<HTMLDivElement>}
                />
              ))}
            </FootballPitch>
          </div>
        </div>
      </div>
    </div>
  );
};
