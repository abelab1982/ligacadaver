import { type BenchPlayer } from "./TeamSearch";
import { X } from "lucide-react";

interface BenchPanelProps {
  players: BenchPlayer[];
  isOpen: boolean;
  selectedIndex: number | null;
  onSelect: (benchIndex: number) => void;
  onClose: () => void;
}

export const BenchPanel = ({
  players,
  isOpen,
  selectedIndex,
  onSelect,
  onClose,
}: BenchPanelProps) => {
  if (!isOpen || players.length === 0) return null;

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Suplentes ({players.length})
        </span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-muted">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2 max-h-[120px] overflow-y-auto">
        {players.map((p, i) => {
          const lastName = p.name.split(" ").pop() || p.name;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border transition-all ${
                selectedIndex === i
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-muted/30 text-foreground hover:bg-muted/60"
              }`}
            >
              <span className="font-bold text-[9px] text-muted-foreground w-4 text-center">
                {p.number || "–"}
              </span>
              <span className="font-medium">{lastName}</span>
              <span className="text-[8px] text-muted-foreground">{p.pos}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
