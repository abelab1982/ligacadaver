import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Team, calculatePoints, calculateGoalDifference, getStatusBadge } from "@/data/teams";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw, Goal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface StandingsViewProps {
  teams: Team[];
  onUpdateTeam: (id: string, field: keyof Team, value: number) => void;
  onReset: () => void;
}

export const StandingsView = ({ teams, onUpdateTeam, onReset }: StandingsViewProps) => {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const pointsDiff = calculatePoints(b) - calculatePoints(a);
      if (pointsDiff !== 0) return pointsDiff;
      
      const gdDiff = calculateGoalDifference(b) - calculateGoalDifference(a);
      if (gdDiff !== 0) return gdDiff;
      
      return b.goalsFor - a.goalsFor;
    });
  }, [teams]);

  const totalGoals = teams.reduce((acc, team) => acc + team.goalsFor, 0);
  const totalMatches = teams.reduce((acc, team) => acc + team.played, 0) / 2;

  const handleOpenGoalDialog = (team: Team) => {
    setSelectedTeam(team);
    setGoalDialogOpen(true);
  };

  const handleGoalUpdate = (field: 'goalsFor' | 'goalsAgainst', value: string) => {
    if (!selectedTeam) return;
    const numValue = parseInt(value) || 0;
    onUpdateTeam(selectedTeam.id, field, Math.max(0, numValue));
    setSelectedTeam(prev => prev ? { ...prev, [field]: Math.max(0, numValue) } : null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Stats Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>⚽ {totalGoals} goles</span>
          <span>📅 {totalMatches} partidos</span>
        </div>
        <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          <span className="hidden md:inline">Reiniciar</span>
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 md:gap-4 text-xs p-3 border-b border-border bg-card/30">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary"></div>
          <span>Campeón</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-success"></div>
          <span>Libertadores</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-accent"></div>
          <span>Sudamericana</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-destructive"></div>
          <span>Descenso</span>
        </div>
      </div>

      {/* Desktop Column Headers */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs text-muted-foreground font-medium border-b border-border">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-3">Equipo</div>
        <div className="col-span-6 grid grid-cols-5 text-center">
          <span>PJ</span>
          <span>G</span>
          <span>E</span>
          <span>P</span>
          <span>DG</span>
        </div>
        <div className="col-span-2 text-center">PTS</div>
      </div>

      {/* Teams List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-2">
          <AnimatePresence mode="popLayout">
            {sortedTeams.map((team, index) => (
              <TeamRow
                key={team.id}
                team={team}
                position={index + 1}
                onUpdate={onUpdateTeam}
                onOpenGoals={() => handleOpenGoalDialog(team)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTeam && (
                <>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                    style={{ 
                      backgroundColor: selectedTeam.primaryColor,
                      color: getContrastColor(selectedTeam.primaryColor)
                    }}
                  >
                    {selectedTeam.abbreviation}
                  </div>
                  <span>{selectedTeam.name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTeam && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="goalsFor">Goles a Favor</Label>
                <Input
                  id="goalsFor"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={selectedTeam.goalsFor || ""}
                  onChange={(e) => handleGoalUpdate("goalsFor", e.target.value)}
                  className="text-center text-lg font-bold h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goalsAgainst">Goles en Contra</Label>
                <Input
                  id="goalsAgainst"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={selectedTeam.goalsAgainst || ""}
                  onChange={(e) => handleGoalUpdate("goalsAgainst", e.target.value)}
                  className="text-center text-lg font-bold h-12"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Team Row Component
interface TeamRowProps {
  team: Team;
  position: number;
  onUpdate: (id: string, field: keyof Team, value: number) => void;
  onOpenGoals: () => void;
}

const getPositionClass = (position: number): string => {
  if (position === 1) return "position-champion";
  if (position <= 3) return "position-libertadores";
  if (position <= 6) return "position-sudamericana";
  if (position > 16) return "position-relegation";
  return "";
};

const TeamRow = ({ team, position, onUpdate, onOpenGoals }: TeamRowProps) => {
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
      className={`team-row grid grid-cols-12 gap-1.5 md:gap-3 items-center p-2.5 md:p-3 rounded-lg bg-card hover:bg-secondary/50 group ${getPositionClass(position)}`}
    >
      {/* Position */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="stat-display text-sm text-muted-foreground w-7 h-7 flex items-center justify-center rounded-full bg-muted">
          {position}
        </span>
      </div>

      {/* Team Info */}
      <div className="col-span-4 md:col-span-3 flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-bold text-[10px] md:text-xs shrink-0"
          style={{ 
            backgroundColor: team.primaryColor,
            color: getContrastColor(team.primaryColor)
          }}
        >
          {team.abbreviation}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-xs md:text-sm truncate">{team.name}</p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground truncate">{team.city}</span>
            {statusBadge && (
              <span className={`${statusBadge.class} hidden lg:inline-block text-[10px]`}>
                {statusBadge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Inputs */}
      <div className="col-span-5 md:col-span-6 grid grid-cols-5 gap-0.5 md:gap-1">
        <StatInput
          label="PJ"
          value={team.played}
          onChange={(v) => handleInputChange("played", v)}
        />
        <StatInput
          label="G"
          value={team.won}
          onChange={(v) => handleInputChange("won", v)}
        />
        <StatInput
          label="E"
          value={team.drawn}
          onChange={(v) => handleInputChange("drawn", v)}
        />
        <StatInput
          label="P"
          value={team.lost}
          onChange={(v) => handleInputChange("lost", v)}
        />
        <div className="flex flex-col items-center">
          <span className="text-[9px] md:text-[10px] text-muted-foreground mb-0.5">DG</span>
          <button
            onClick={onOpenGoals}
            className={`w-9 md:w-10 h-8 md:h-9 flex items-center justify-center text-xs md:text-sm font-bold rounded-md bg-muted/50 hover:bg-muted transition-colors ${
              goalDiff > 0 ? 'text-success' : goalDiff < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
          </button>
        </div>
      </div>

      {/* Points */}
      <div className="col-span-2 flex items-center justify-center">
        <motion.span
          key={points}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-lg md:text-xl font-bold text-primary tabular-nums"
        >
          {points}
        </motion.span>
      </div>
    </motion.div>
  );
};

// Stat Input Component
interface StatInputProps {
  label: string;
  value: number;
  onChange: (value: string) => void;
}

const StatInput = ({ label, value, onChange }: StatInputProps) => (
  <div className="flex flex-col items-center">
    <span className="text-[9px] md:text-[10px] text-muted-foreground mb-0.5">{label}</span>
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-9 md:w-10 h-8 md:h-9 text-center text-xs md:text-sm bg-muted border border-border rounded-md 
                 focus:ring-2 focus:ring-primary focus:border-primary 
                 transition-all duration-200 text-foreground font-medium"
    />
  </div>
);

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
