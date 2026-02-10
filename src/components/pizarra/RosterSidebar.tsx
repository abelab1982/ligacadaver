import { useState } from "react";
import { Search, Users, ChevronRight, ChevronLeft, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { type BenchPlayer } from "./TeamSearch";

interface RosterPlayer {
  name: string;
  number?: number;
  role: string;
  isStarter: boolean;
}

interface RosterSidebarProps {
  starters: { name: string; number?: number; role: string }[];
  bench: BenchPlayer[];
  teamName: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onDragStart: (player: { name: string; number: number; role: string }) => void;
  onPlayerTap: (player: { name: string; number: number; role: string }) => void;
  selectedPitchPlayerIndex: number | null;
}

export const RosterSidebar = ({
  starters,
  bench,
  teamName,
  isOpen,
  onToggle,
  onDragStart,
  onPlayerTap,
  selectedPitchPlayerIndex,
}: RosterSidebarProps) => {
  const [search, setSearch] = useState("");

  const allPlayers: RosterPlayer[] = [
    ...starters.map((p) => ({ ...p, isStarter: true })),
    ...bench.map((p) => ({
      name: p.name,
      number: p.number,
      role: p.pos,
      isStarter: false,
    })),
  ];

  const filtered = search.trim()
    ? allPlayers.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.number?.toString() || "").includes(search)
      )
    : allPlayers;

  const startersFiltered = filtered.filter((p) => p.isStarter);
  const benchFiltered = filtered.filter((p) => !p.isStarter);

  const hasPlayers = allPlayers.length > 0;

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={onToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-card/90 backdrop-blur-sm border border-border border-r-0 rounded-l-lg p-1.5 shadow-lg hover:bg-muted/80 transition-colors"
        style={{ right: isOpen ? "240px" : "0" }}
      >
        {isOpen ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </button>

      {/* Sidebar panel */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-[240px] bg-card/95 backdrop-blur-md border-l border-border z-10 flex flex-col transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {teamName || "Plantilla"}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {allPlayers.length} jugadores
            </span>
          </div>
          {hasPlayers && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar jugador..."
                className="h-7 text-xs pl-7 bg-muted/30 border-border/50"
              />
            </div>
          )}
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!hasPlayers && (
            <div className="p-4 text-center">
              <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[10px] text-muted-foreground">
                Carga un equipo para ver la plantilla
              </p>
            </div>
          )}

          {/* Starters */}
          {startersFiltered.length > 0 && (
            <div>
              <div className="px-3 py-1 bg-primary/5 border-b border-border/30">
                <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">
                  Titulares ({startersFiltered.length})
                </span>
              </div>
              {startersFiltered.map((p, i) => (
                <PlayerRow
                  key={`s-${i}`}
                  player={p}
                  showSwapHint={selectedPitchPlayerIndex !== null}
                  onDragStart={onDragStart}
                  onTap={onPlayerTap}
                />
              ))}
            </div>
          )}

          {/* Bench */}
          {benchFiltered.length > 0 && (
            <div>
              <div className="px-3 py-1 bg-muted/30 border-y border-border/30">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Suplentes ({benchFiltered.length})
                </span>
              </div>
              {benchFiltered.map((p, i) => (
                <PlayerRow
                  key={`b-${i}`}
                  player={p}
                  showSwapHint={selectedPitchPlayerIndex !== null}
                  onDragStart={onDragStart}
                  onTap={onPlayerTap}
                />
              ))}
            </div>
          )}
        </div>

        {selectedPitchPlayerIndex !== null && (
          <div className="px-3 py-1.5 bg-primary/10 border-t border-primary/20 text-center">
            <span className="text-[10px] text-primary font-medium">
              Toca un jugador para cambiarlo
            </span>
          </div>
        )}
      </div>
    </>
  );
};

// Individual player row
function PlayerRow({
  player,
  showSwapHint,
  onDragStart,
  onTap,
}: {
  player: RosterPlayer;
  showSwapHint: boolean;
  onDragStart: (p: { name: string; number: number; role: string }) => void;
  onTap: (p: { name: string; number: number; role: string }) => void;
}) {
  const lastName = player.name.split(" ").pop() || player.name;
  const data = {
    name: player.name,
    number: player.number || 0,
    role: player.role,
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(data));
        e.dataTransfer.effectAllowed = "copy";
        onDragStart(data);
      }}
      onClick={() => {
        if (showSwapHint) onTap(data);
      }}
      className={`flex items-center gap-2 px-3 py-1.5 border-b border-border/20 cursor-grab active:cursor-grabbing hover:bg-muted/40 transition-colors group ${
        showSwapHint ? "cursor-pointer hover:bg-primary/10" : ""
      }`}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0" />
      <span className="text-[10px] font-bold text-muted-foreground w-5 text-center flex-shrink-0">
        {player.number || "–"}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground block truncate">
          {lastName}
        </span>
        <span className="text-[9px] text-muted-foreground">{player.name !== lastName ? player.name.replace(lastName, "").trim() : ""}</span>
      </div>
      <span className="text-[9px] text-muted-foreground/60 font-medium uppercase flex-shrink-0">
        {player.role}
      </span>
    </div>
  );
}
