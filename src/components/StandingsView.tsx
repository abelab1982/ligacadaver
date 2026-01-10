import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamStats } from "@/hooks/useLeagueEngine";
import { getStatusBadge } from "@/data/teams";

interface StandingsViewProps {
  teams: TeamStats[];
  showPredictions: boolean;
  onTogglePredictions: () => void;
  onReset: () => void;
  onResetPredictions: () => void;
  stats: {
    matchesPlayed: number;
    totalGoals: number;
    averageGoals: string;
  };
}

const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const getPositionClass = (position: number): string => {
  if (position === 1) return "position-champion";
  if (position >= 2 && position <= 4) return "position-libertadores";
  if (position >= 5 && position <= 6) return "position-sudamericana";
  if (position >= 16) return "position-relegation";
  return "";
};

const getPositionIndicator = (position: number): string => {
  if (position === 1) return "🏆";
  if (position >= 2 && position <= 4) return "🔵";
  if (position >= 5 && position <= 6) return "🟡";
  if (position >= 16) return "🔴";
  return "";
};

interface TeamRowProps {
  team: TeamStats;
  position: number;
  showPredictions: boolean;
}

const TeamRow = ({ team, position, showPredictions }: TeamRowProps) => {
  const statusBadge = getStatusBadge(team.status);
  const positionClass = getPositionClass(position);
  
  const played = showPredictions ? team.predictedPlayed : team.played;
  const won = showPredictions ? team.predictedWon : team.won;
  const drawn = showPredictions ? team.predictedDrawn : team.drawn;
  const lost = showPredictions ? team.predictedLost : team.lost;
  const gf = showPredictions ? team.predictedGoalsFor : team.goalsFor;
  const ga = showPredictions ? team.predictedGoalsAgainst : team.goalsAgainst;
  const gd = showPredictions ? team.predictedGoalDifference : team.goalDifference;
  const points = showPredictions ? team.predictedPoints : team.points;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${positionClass}`}
    >
      {/* Position */}
      <td className="py-2 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="font-bold text-sm">{position}</span>
          <span className="text-xs">{getPositionIndicator(position)}</span>
        </div>
      </td>

      {/* Team */}
      <td className="py-2 px-2">
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ 
              backgroundColor: team.primaryColor,
              color: getContrastColor(team.primaryColor)
            }}
          >
            {team.abbreviation}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{team.name}</span>
            {statusBadge && (
              <span className={`text-[10px] ${statusBadge.class}`}>
                {statusBadge.label}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Stats */}
      <td className="py-2 px-1 text-center text-sm text-muted-foreground hidden sm:table-cell">{played}</td>
      <td className="py-2 px-1 text-center text-sm text-green-400 hidden md:table-cell">{won}</td>
      <td className="py-2 px-1 text-center text-sm text-yellow-400 hidden md:table-cell">{drawn}</td>
      <td className="py-2 px-1 text-center text-sm text-red-400 hidden md:table-cell">{lost}</td>
      <td className="py-2 px-1 text-center text-sm hidden lg:table-cell">{gf}</td>
      <td className="py-2 px-1 text-center text-sm hidden lg:table-cell">{ga}</td>
      <td className="py-2 px-1 text-center text-sm font-medium">
        <span className={gd > 0 ? "text-green-400" : gd < 0 ? "text-red-400" : "text-muted-foreground"}>
          {gd > 0 ? `+${gd}` : gd}
        </span>
      </td>
      <td className="py-2 px-2 text-center">
        <span className="font-bold text-primary text-lg">{points}</span>
      </td>
    </motion.tr>
  );
};

export const StandingsView = ({
  teams,
  showPredictions,
  onTogglePredictions,
  onReset,
  onResetPredictions,
  stats,
}: StandingsViewProps) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border bg-card/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Partidos: </span>
              <span className="font-bold">{stats.matchesPlayed}</span>
            </div>
            <div className="text-sm hidden sm:block">
              <span className="text-muted-foreground">Goles: </span>
              <span className="font-bold">{stats.totalGoals}</span>
            </div>
            <div className="text-sm hidden sm:block">
              <span className="text-muted-foreground">Promedio: </span>
              <span className="font-bold">{stats.averageGoals}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePredictions}
              className="gap-1 text-xs"
            >
              {showPredictions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {showPredictions ? "Con Predicciones" : "Solo Resultados"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onResetPredictions}
              className="w-8 h-8"
              title="Limpiar Predicciones"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-b border-border bg-card/20 flex flex-wrap gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-champion"></span>
          Campeón
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-libertadores"></span>
          Libertadores
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sudamericana"></span>
          Sudamericana
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-relegation"></span>
          Descenso
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background/95 backdrop-blur-sm">
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 px-2 text-center w-10">#</th>
              <th className="py-2 px-2 text-left">Equipo</th>
              <th className="py-2 px-1 text-center hidden sm:table-cell">PJ</th>
              <th className="py-2 px-1 text-center hidden md:table-cell">G</th>
              <th className="py-2 px-1 text-center hidden md:table-cell">E</th>
              <th className="py-2 px-1 text-center hidden md:table-cell">P</th>
              <th className="py-2 px-1 text-center hidden lg:table-cell">GF</th>
              <th className="py-2 px-1 text-center hidden lg:table-cell">GC</th>
              <th className="py-2 px-1 text-center">DG</th>
              <th className="py-2 px-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {teams.map((team, index) => (
                <TeamRow
                  key={team.id}
                  team={team}
                  position={index + 1}
                  showPredictions={showPredictions}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};
