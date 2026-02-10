import { useState, useRef, useCallback } from "react";
import { Download, RotateCcw, Layout, Eraser } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { FootballPitch } from "./FootballPitch";
import { PlayerToken } from "./PlayerToken";
import { FormationSelector } from "./FormationSelector";
import { TeamSearch, type LineupPlayer, type BenchPlayer } from "./TeamSearch";
import { RosterSidebar } from "./RosterSidebar";
import { formations } from "./formations";
import { useToast } from "@/hooks/use-toast";
import { initialTeams } from "@/data/teams";
import type { DrawingTool, DrawingColor, Stroke } from "./DrawingCanvas";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pitchRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("none");
  const [drawingColor, setDrawingColor] = useState<DrawingColor>("#ffffff");
  const [strokeCount, setStrokeCount] = useState(0);
  const [undoSignal, setUndoSignal] = useState(0);
  const [clearSignal, setClearSignal] = useState(0);
  const { toast } = useToast();

  const handleFormationChange = useCallback((key: string) => {
    setFormation(key);
    const newPlayers = buildPlayersFromFormation(key);
    setPlayers(newPlayers);
    setTeamName(null);
    setBench([]);
    setSelectedPlayerIndex(null);
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
    setSidebarOpen(true);
  }, [bench]);

  // Handle substitution from sidebar tap
  const handleSidebarPlayerTap = useCallback(
    (sidebarPlayer: { name: string; number: number; role: string }) => {
      if (selectedPlayerIndex === null) return;

      const replacedPlayer = players[selectedPlayerIndex];

      setPlayers((prev) => {
        const updated = [...prev];
        updated[selectedPlayerIndex] = {
          ...updated[selectedPlayerIndex],
          name: sidebarPlayer.name.split(" ").pop() || sidebarPlayer.name,
          number: sidebarPlayer.number,
          role: sidebarPlayer.role,
        };
        saveState(updated, formation);
        return updated;
      });

      // Swap into bench
      setBench((prev) => {
        const idx = prev.findIndex(
          (p) => p.number === sidebarPlayer.number && p.name === sidebarPlayer.name
        );
        if (idx >= 0) {
          const newBench = [...prev];
          newBench[idx] = {
            name: replacedPlayer.name,
            number: replacedPlayer.number || 0,
            pos: replacedPlayer.role,
          };
          return newBench;
        }
        return prev;
      });

      setSelectedPlayerIndex(null);
      toast({ title: `${sidebarPlayer.name.split(" ").pop()} entra al campo` });
    },
    [selectedPlayerIndex, formation, players, toast]
  );

  // Handle drop from sidebar onto pitch
  const handlePitchDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/json");
      if (!data || !pitchRef.current) return;

      try {
        const player = JSON.parse(data) as { name: string; number: number; role: string };
        const rect = pitchRef.current.getBoundingClientRect();
        const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

        // Check if this player is already on the pitch by number
        const existingIdx = players.findIndex((p) => p.number === player.number && p.name === (player.name.split(" ").pop() || player.name));
        if (existingIdx >= 0) {
          // Move existing player to the drop position
          setPlayers((prev) => {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], x, y };
            saveState(updated, formation);
            return updated;
          });
          return;
        }

        // Replace the nearest player on pitch or add new
        let nearestIdx = 0;
        let nearestDist = Infinity;
        players.forEach((p, i) => {
          const dist = Math.hypot(p.x - x, p.y - y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        });

        const replacedPlayer = players[nearestIdx];
        setPlayers((prev) => {
          const updated = [...prev];
          updated[nearestIdx] = {
            ...updated[nearestIdx],
            name: player.name.split(" ").pop() || player.name,
            number: player.number,
            role: player.role,
            x,
            y,
          };
          saveState(updated, formation);
          return updated;
        });

        // Swap replaced player into bench
        setBench((prev) => {
          const idx = prev.findIndex(
            (p) => p.number === player.number && p.name === player.name
          );
          if (idx >= 0) {
            const newBench = [...prev];
            newBench[idx] = {
              name: replacedPlayer.name,
              number: replacedPlayer.number || 0,
              pos: replacedPlayer.role,
            };
            return newBench;
          }
          return prev;
        });

        toast({ title: `${player.name.split(" ").pop()} colocado en la cancha` });
      } catch {
        // ignore invalid data
      }
    },
    [players, formation, toast]
  );

  const handleLineupLoaded = useCallback(
    (lineup: LineupPlayer[], name: string, benchPlayers: BenchPlayer[], apiFormation: string | null) => {
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
      setSidebarOpen(true);
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
    setSidebarOpen(false);
    saveState(newPlayers, formation);
  }, [formation]);

  const handleClearPitch = useCallback(() => {
    // Move all current players to bench, clear the pitch
    const allToBench = players
      .filter((p) => p.number != null)
      .map((p) => ({
        name: p.name,
        number: p.number || 0,
        pos: p.role,
      }));
    setBench((prev) => [...allToBench, ...prev]);
    setPlayers([]);
    setSelectedPlayerIndex(null);
    setSidebarOpen(true);
    saveState([], formation);
    // Clear drawings too
    strokesRef.current.length = 0;
    setStrokeCount(0);
    setClearSignal((n) => n + 1);
    toast({ title: "Pizarra limpia" });
  }, [players, formation, toast]);

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

  const teamColor = teamName
    ? initialTeams.find((t) => t.name === teamName)?.primaryColor || "hsl(45, 93%, 47%)"
    : "hsl(45, 93%, 47%)";

  return (
    <div className="flex flex-col h-full relative">
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
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={handleClearPitch} title="Limpiar pizarra">
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </Button>
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

      {/* Pitch + Sidebar */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="h-full overflow-auto flex items-center justify-center p-3 md:p-6"
          style={{ paddingRight: sidebarOpen ? "252px" : undefined }}
        >
          <div ref={exportRef} className="relative w-full max-w-md md:max-w-lg">
            <div
              ref={pitchRef as React.RefObject<HTMLDivElement>}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handlePitchDrop}
            >
              <FootballPitch
                drawingTool={drawingTool}
                drawingColor={drawingColor}
                strokeCount={strokeCount}
                strokesRef={strokesRef}
                undoSignal={undoSignal}
                clearSignal={clearSignal}
                onStrokeAdded={() => setStrokeCount(strokesRef.current.length)}
                onToolChange={setDrawingTool}
                onColorChange={setDrawingColor}
                onUndo={() => {
                  strokesRef.current.pop();
                  setStrokeCount(strokesRef.current.length);
                  setUndoSignal((n) => n + 1);
                }}
                onClear={() => {
                  strokesRef.current.length = 0;
                  setStrokeCount(0);
                  setClearSignal((n) => n + 1);
                }}
              >
                {players.map((player, i) => (
                  <PlayerToken
                    key={`${player.id}-${player.x.toFixed(2)}-${player.y.toFixed(2)}`}
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

        {/* Roster Sidebar */}
        <RosterSidebar
          starters={players.map((p) => ({ name: p.name, number: p.number, role: p.role }))}
          bench={bench}
          teamName={teamName}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          onDragStart={() => {}}
          onPlayerTap={handleSidebarPlayerTap}
          selectedPitchPlayerIndex={selectedPlayerIndex}
        />
      </div>
    </div>
  );
};
