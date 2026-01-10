import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Team, initialTeams, calculatePoints, calculateGoalDifference } from "@/data/teams";
import { TeamRow } from "./TeamRow";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trophy, ChevronDown, ChevronUp, Goal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const StandingsTable = () => {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
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

  const handleUpdateTeam = (id: string, field: keyof Team, value: number) => {
    setTeams(prev => prev.map(team => 
      team.id === id ? { ...team, [field]: value } : team
    ));
  };

  const handleReset = () => {
    setTeams(initialTeams);
  };

  const handleOpenGoalDialog = (team: Team) => {
    setSelectedTeam(team);
    setGoalDialogOpen(true);
  };

  const handleGoalUpdate = (field: 'goalsFor' | 'goalsAgainst', value: string) => {
    if (!selectedTeam) return;
    const numValue = parseInt(value) || 0;
    handleUpdateTeam(selectedTeam.id, field, Math.max(0, numValue));
    setSelectedTeam(prev => prev ? { ...prev, [field]: Math.max(0, numValue) } : null);
  };

  const totalGoals = useMemo(() => {
    return teams.reduce((acc, team) => acc + team.goalsFor, 0);
  }, [teams]);

  const totalMatches = useMemo(() => {
    return teams.reduce((acc, team) => acc + team.played, 0) / 2;
  }, [teams]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Liga 1 2026</h1>
            <p className="text-sm text-muted-foreground">Calculadora de Posiciones</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-4 text-sm text-muted-foreground mr-4">
            <span>⚽ {totalGoals} goles</span>
            <span>📅 {totalMatches} partidos</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden md:inline">Reiniciar</span>
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm mb-4 p-3 rounded-lg bg-card">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary"></div>
          <span>Campeón</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success"></div>
          <span>Libertadores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-accent"></div>
          <span>Sudamericana</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive"></div>
          <span>Descenso</span>
        </div>
      </div>

      {/* Desktop Column Headers */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm text-muted-foreground font-medium">
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
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedTeams.map((team, index) => (
            <div key={team.id} className="relative group">
              <TeamRow
                team={team}
                position={index + 1}
                onUpdate={handleUpdateTeam}
              />
              {/* Goal Edit Button */}
              <button
                onClick={() => handleOpenGoalDialog(team)}
                className="absolute right-16 md:right-24 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-secondary hover:bg-muted"
              >
                <Goal className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </AnimatePresence>
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

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
