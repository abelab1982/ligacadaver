import { useState, useRef, useCallback } from "react";
import { Download, RotateCcw, Layout } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { FootballPitch } from "./FootballPitch";
import { PlayerToken } from "./PlayerToken";
import { FormationSelector } from "./FormationSelector";
import { TeamSearch, type LineupPlayer, type BenchPlayer } from "./TeamSearch";
import { BenchPanel } from "./BenchPanel";
import { formations } from "./formations";
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

// Parse formation string like "4-2-3-1" into a key
function matchFormation(formationStr: string): string | null {
  const normalized = formationStr.replace(/\s/g, "");
  if (formations[normalized]) return normalized;
  return null;
}

export const TacticalBoard = () => {
  const saved = loadSaved();
  const [formation, setFormation] = useState(saved?.formation ?? "4-3-3");
  const [players, setPlayers] = useState<PlayerState[]>(
    saved?.players ?? buildPlayersFromFormation("4-3-3")
  );
  const [teamName, setTeamName] = useState<string | null>(null);
  const [bench, setBench] = useState<BenchPlayer[]>([]);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);
  const [showBench, setShowBench] = useState(false);
  const pitchRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFormationChange = useCallback((key: string) => {
    setFormation(key);
    const newPlayers = buildPlayersFromFormation(key);
    setPlayers(newPlayers);
    setTeamName(null);
    setBench([]);
    setSelectedPlayerIndex(null);
    setShowBench(false);
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

  const handlePlayerClick = useCallback((index: number) => {
    if (bench.length === 0) return;
    setSelectedPlayerIndex(index);
    setShowBench(true);
  }, [bench]);

  const handleBenchSelect = useCallback(
    (benchIndex: number) => {
      if (selectedPlayerIndex === null) return;
      const benchPlayer = bench[benchIndex];

      setPlayers((prev) => {
        const updated = [...prev];
        const old = updated[selectedPlayerIndex];
        updated[selectedPlayerIndex] = {
          ...old,
          name: benchPlayer.name.split(" ").pop() || benchPlayer.name,
          number: benchPlayer.number,
          role: benchPlayer.pos,
        };
        saveState(updated, formation);
        return updated;
      });

      // Move replaced player to bench
      const replacedPlayer = players[selectedPlayerIndex];
      setBench((prev) => {
        const newBench = [...prev];
        newBench[benchIndex] = {
          name: replacedPlayer.name,
          number: replacedPlayer.number || 0,
          pos: replacedPlayer.role,
        };
        return newBench;
      });

      setSelectedPlayerIndex(null);
      setShowBench(false);
      toast({ title: `${benchPlayer.name.split(" ").pop()} entra al campo` });
    },
    [selectedPlayerIndex, formation, players, toast]
  );

  const handleLineupLoaded = useCallback(
    (lineup: LineupPlayer[], name: string, benchPlayers: BenchPlayer[], apiFormation: string | null) => {
      // Auto-switch formation if API provides one
      let activeFormation = formation;
      if (apiFormation) {
        const matched = matchFormation(apiFormation);
        if (matched) {
          activeFormation = matched;
          setFormation(matched);
        }
      }

      const f = formations[activeFormation];
      const newPlayers: PlayerState[] = lineup.map((lp, i) => {
        let x = f?.positions[i]?.x ?? 50;
        let y = f?.positions[i]?.y ?? 50;

        if (lp.grid) {
          const parts = lp.grid.split(":");
          const row = parseInt(parts[0], 10);
          const col = parseInt(parts[1], 10);
          if (!isNaN(row) && !isNaN(col)) {
            y = 90 - (row - 1) * 18;
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
          name: lp.name.split(" ").pop() || lp.name,
          number: lp.number,
          role: lp.pos,
          x: Math.max(5, Math.min(95, x)),
          y: Math.max(5, Math.min(95, y)),
        };
      });

      setPlayers(newPlayers);
      setTeamName(name);
      setBench(benchPlayers);
      setSelectedPlayerIndex(null);
      setShowBench(false);
      saveState(newPlayers, activeFormation);
      toast({ title: `Alineación de ${name} cargada` });
    },
    [formation, toast]
  );

  const handleReset = useCallback(() => {
    const newPlayers = buildPlayersFromFormation(formation);
    setPlayers(newPlayers);
    setTeamName(null);
    setBench([]);
    setSelectedPlayerIndex(null);
    setShowBench(false);
    saveState(newPlayers, formation);
  }, [formation]);

  const handleExport = useCallback(async () => {
    const node = exportRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#0d3320",
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

  // Get team primary color for tokens
  const teamColor = teamName
    ? initialTeams.find((t) => t.name === teamName)?.primaryColor || "hsl(45, 93%, 47%)"
    : "hsl(45, 93%, 47%)";

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-border bg-card/50 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Layout className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground hidden sm:inline">Pizarra</span>
        </div>

        <FormationSelector value={formation} onChange={handleFormationChange} />

        <div className="hidden md:block border-l border-border h-5" />

        <TeamSearch onLineupLoaded={handleLineupLoaded} />

        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Team name banner */}
      {teamName && (
        <div className="px-3 py-1 bg-primary/10 border-b border-primary/20 text-center">
          <span className="text-xs font-semibold text-primary">{teamName}</span>
          {bench.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-2">
              Toca un jugador para cambiarlo
            </span>
          )}
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
                  color={teamColor}
                  isSelected={selectedPlayerIndex === i}
                  onDragEnd={(x, y) => handleDragEnd(i, x, y)}
                  onClick={() => handlePlayerClick(i)}
                  containerRef={pitchRef as React.RefObject<HTMLDivElement>}
                />
              ))}
            </FootballPitch>
          </div>
        </div>
      </div>

      {/* Bench panel */}
      <BenchPanel
        players={bench}
        isOpen={showBench}
        selectedIndex={null}
        onSelect={handleBenchSelect}
        onClose={() => {
          setShowBench(false);
          setSelectedPlayerIndex(null);
        }}
      />
    </div>
  );
};

// Need this import for teamColor lookup
import { initialTeams } from "@/data/teams";
