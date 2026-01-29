import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { RotateCcw, Eye, EyeOff, Tv, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TeamStats } from "@/hooks/useLeagueEngine";
import { getStatusBadge } from "@/data/teams";
import { TeamLogo } from "@/components/TeamLogo";
import { Footer } from "./Footer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StandingsViewProps {
  teams: TeamStats[];
  showPredictions: boolean;
  onTogglePredictions: () => void;
  onReset: () => void;
  onResetPredictions: () => void;
  stats: {
    roundsPlayed: number;
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

// Position zone colors based on user requirements
const getZoneIndicator = (position: number): { color: string; label: string } => {
  if (position === 1) return { color: "bg-amber-500", label: "Campeón" };
  if (position >= 2 && position <= 4) return { color: "bg-green-500", label: "Libertadores" };
  if (position >= 5 && position <= 8) return { color: "bg-blue-500", label: "Sudamericana" };
  if (position >= 16) return { color: "bg-red-500", label: "Descenso" };
  return { color: "bg-transparent", label: "" };
};

interface TeamRowProps {
  team: TeamStats;
  position: number;
  showPredictions: boolean;
}

const TeamRow = ({ team, position, showPredictions }: TeamRowProps) => {
  const statusBadge = getStatusBadge(team.status);
  const zone = getZoneIndicator(position);
  
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
      layoutId={team.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      className="border-b border-border/30 hover:bg-muted/20 transition-colors group"
    >
      {/* Zone Indicator + Position */}
      <td className="py-2.5 px-0 relative">
        <div className="flex items-center">
          {/* Color bar indicator */}
          <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full ${zone.color}`} />
          <div className="pl-3 flex items-center justify-center min-w-[40px]">
            <motion.span 
              key={position}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="font-bold text-sm"
            >
              {position}
            </motion.span>
          </div>
        </div>
      </td>

      {/* Team */}
      <td className="py-2.5 px-2">
        <div className="flex items-center gap-2">
          <TeamLogo
            teamId={team.id}
            teamName={team.name}
            abbreviation={team.abbreviation}
            primaryColor={team.primaryColor}
            size="sm"
          />
          <span className="text-sm font-medium truncate">{team.name}</span>
        </div>
      </td>

      {/* Stats */}
      <td className="py-2.5 px-1 text-center text-sm text-muted-foreground">{played}</td>
      <td className="py-2.5 px-1 text-center text-sm text-green-400 hidden md:table-cell">{won}</td>
      <td className="py-2.5 px-1 text-center text-sm text-yellow-400 hidden md:table-cell">{drawn}</td>
      <td className="py-2.5 px-1 text-center text-sm text-red-400 hidden md:table-cell">{lost}</td>
      <td className="py-2.5 px-1 text-center text-sm hidden lg:table-cell">{gf}</td>
      <td className="py-2.5 px-1 text-center text-sm hidden lg:table-cell">{ga}</td>
      <td className="py-2.5 px-1 text-center text-sm font-medium">
        <span className={gd > 0 ? "text-green-400" : gd < 0 ? "text-red-400" : "text-muted-foreground"}>
          {gd > 0 ? `+${gd}` : gd}
        </span>
      </td>
      

      {/* Points */}
      <td className="py-2.5 px-2 text-center">
        <motion.span
          key={points}
          initial={{ scale: 1.4, color: "hsl(var(--primary))" }}
          animate={{ scale: 1, color: "hsl(var(--primary))" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="font-bold text-primary text-lg tabular-nums"
        >
          {points}
        </motion.span>
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
  const [streamerMode, setStreamerMode] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleToggleStreamerMode = () => {
    if (streamerMode) {
      // Turning off streamer mode
      setStreamerMode(false);
      setIsRevealed(false);
    } else {
      // Turning on streamer mode
      setStreamerMode(true);
      setIsRevealed(false);
    }
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border bg-card/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Fechas: </span>
              <span className="font-bold">{stats.roundsPlayed}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Goles: </span>
              <span className="font-bold">{stats.totalGoals}</span>
            </div>
            <div className="text-sm hidden sm:block">
              <span className="text-muted-foreground">Promedio/Fecha: </span>
              <span className="font-bold">{stats.averageGoals}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={streamerMode ? "default" : "ghost"}
                    size="sm"
                    onClick={handleToggleStreamerMode}
                    className={`gap-1 text-xs ${streamerMode ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                  >
                    <Tv className="w-4 h-4" />
                    <span className="hidden sm:inline">Streamer</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{streamerMode ? "Desactivar Modo Streamer" : "Activar Modo Streamer"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 cursor-help">
                <span className="w-1 h-3 rounded-full bg-amber-500"></span>
                Campeón
              </span>
            </TooltipTrigger>
            <TooltipContent>Campeón Liga 1</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 cursor-help">
                <span className="w-1 h-3 rounded-full bg-green-500"></span>
                Libertadores
              </span>
            </TooltipTrigger>
            <TooltipContent>Copa Libertadores (2º-4º)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 cursor-help">
                <span className="w-1 h-3 rounded-full bg-blue-500"></span>
                Sudamericana
              </span>
            </TooltipTrigger>
            <TooltipContent>Copa Sudamericana (5º-8º)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 cursor-help">
                <span className="w-1 h-3 rounded-full bg-red-500"></span>
                Descenso
              </span>
            </TooltipTrigger>
            <TooltipContent>Zona de Descenso (16º-18º)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Table with Streamer Mode Overlay */}
      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        {/* Blur overlay for Streamer Mode */}
        <AnimatePresence>
          {streamerMode && !isRevealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 backdrop-blur-md bg-background/60"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <EyeOff className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">Resultados Ocultos</h3>
                <p className="text-muted-foreground text-sm">Modo Streamer activado</p>
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  size="lg"
                  onClick={handleReveal}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Revelar Tabla Final
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration animation when revealed */}
        <AnimatePresence>
          {streamerMode && isRevealed && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
            >
              {/* Confetti-like particles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    y: "50%",
                    x: `${Math.random() * 100}%`,
                    scale: 0,
                    rotate: 0
                  }}
                  animate={{ 
                    y: ["50%", "-20%"],
                    scale: [0, 1, 0.5],
                    rotate: [0, 360],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 1.5,
                    delay: i * 0.05,
                    ease: "easeOut"
                  }}
                  className={`absolute w-3 h-3 rounded-full ${
                    i % 4 === 0 ? "bg-amber-400" :
                    i % 4 === 1 ? "bg-green-400" :
                    i % 4 === 2 ? "bg-purple-400" :
                    "bg-pink-400"
                  }`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <table className="w-full">
          <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 px-2 text-center w-12">#</th>
              <th className="py-2 px-2 text-left">Equipo</th>
              <th className="py-2 px-1 text-center">PJ</th>
              <th className="py-2 px-1 text-center hidden md:table-cell">G</th>
              <th className="py-2 px-1 text-center hidden md:table-cell">E</th>
              <th className="py-2 px-1 text-center hidden md:table-cell">P</th>
              <th className="py-2 px-1 text-center hidden lg:table-cell">GF</th>
              <th className="py-2 px-1 text-center hidden lg:table-cell">GC</th>
              <th className="py-2 px-1 text-center">DG</th>
              
              <th className="py-2 px-2 text-center">Pts</th>
            </tr>
          </thead>
          <LayoutGroup>
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
          </LayoutGroup>
        </table>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};
