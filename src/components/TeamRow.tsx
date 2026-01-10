import { motion } from "framer-motion";
import { Team, calculatePoints, calculateGoalDifference, getStatusBadge } from "@/data/teams";
import { Input } from "@/components/ui/input";

interface TeamRowProps {
  team: Team;
  position: number;
  onUpdate: (id: string, field: keyof Team, value: number) => void;
}

const getPositionClass = (position: number, totalTeams: number): string => {
  if (position === 1) return "position-champion";
  if (position <= 3) return "position-libertadores";
  if (position <= 6) return "position-sudamericana";
  if (position > totalTeams - 2) return "position-relegation";
  return "";
};

export const TeamRow = ({ team, position, onUpdate }: TeamRowProps) => {
  const points = calculatePoints(team);
  const goalDiff = calculateGoalDifference(team);
  const statusBadge = getStatusBadge(team.status);

  const handleInputChange = (field: keyof Team, value: string) => {
    const numValue = parseInt(value) || 0;
    onUpdate(team.id, field, Math.max(0, numValue));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      className={`team-row grid grid-cols-12 gap-2 md:gap-4 items-center p-3 md:p-4 rounded-lg bg-card hover:bg-secondary/50 ${getPositionClass(position, 18)}`}
    >
      {/* Position */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="stat-display text-muted-foreground w-8 h-8 flex items-center justify-center rounded-full bg-muted">
          {position}
        </span>
      </div>

      {/* Team Info */}
      <div className="col-span-4 md:col-span-3 flex items-center gap-2 md:gap-3 min-w-0">
        <div
          className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-bold text-xs md:text-sm shrink-0"
          style={{ 
            backgroundColor: team.primaryColor,
            color: getContrastColor(team.primaryColor)
          }}
        >
          {team.abbreviation}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm md:text-base truncate">{team.name}</p>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground truncate">{team.city}</span>
            {statusBadge && (
              <span className={`${statusBadge.class} hidden md:inline-block`}>
                {statusBadge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Inputs - Mobile Optimized */}
      <div className="col-span-5 md:col-span-6 grid grid-cols-5 gap-1 md:gap-2">
        <div className="flex flex-col items-center">
          <span className="text-[10px] md:text-xs text-muted-foreground mb-1">PJ</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={team.played || ""}
            onChange={(e) => handleInputChange("played", e.target.value)}
            className="stat-input"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] md:text-xs text-muted-foreground mb-1">G</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={team.won || ""}
            onChange={(e) => handleInputChange("won", e.target.value)}
            className="stat-input"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] md:text-xs text-muted-foreground mb-1">E</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={team.drawn || ""}
            onChange={(e) => handleInputChange("drawn", e.target.value)}
            className="stat-input"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] md:text-xs text-muted-foreground mb-1">P</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={team.lost || ""}
            onChange={(e) => handleInputChange("lost", e.target.value)}
            className="stat-input"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] md:text-xs text-muted-foreground mb-1">DG</span>
          <span className={`stat-input flex items-center justify-center font-bold ${goalDiff > 0 ? 'text-success' : goalDiff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
          </span>
        </div>
      </div>

      {/* Points */}
      <div className="col-span-2 flex flex-col items-center justify-center">
        <span className="text-[10px] md:text-xs text-muted-foreground mb-1 md:hidden">PTS</span>
        <motion.span
          key={points}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="stat-display text-xl md:text-2xl text-primary"
        >
          {points}
        </motion.span>
      </div>
    </motion.div>
  );
};

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
