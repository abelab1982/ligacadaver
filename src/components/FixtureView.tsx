import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Team } from "@/data/teams";

interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

interface FixtureViewProps {
  teams: Team[];
  onMatchResult: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
}

export const FixtureView = ({ teams, onMatchResult }: FixtureViewProps) => {
  const [currentRound, setCurrentRound] = useState(1);
  const totalRounds = 34;

  return (
    <div className="h-full flex flex-col">
      {/* Round Navigation */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentRound(Math.max(1, currentRound - 1))}
          disabled={currentRound === 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">Fecha {currentRound}</span>
          <span className="text-sm text-muted-foreground">/ {totalRounds}</span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentRound(Math.min(totalRounds, currentRound + 1))}
          disabled={currentRound === totalRounds}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Matches List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRound}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Placeholder matches - 9 matches per round */}
            {Array.from({ length: 9 }).map((_, idx) => {
              const homeTeam = teams[idx * 2] || teams[0];
              const awayTeam = teams[idx * 2 + 1] || teams[1];
              
              return (
                <MatchCard
                  key={idx}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  onResult={(homeScore, awayScore) => 
                    onMatchResult(homeTeam.id, awayTeam.id, homeScore, awayScore)
                  }
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Add */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Agregar Partido Personalizado
        </Button>
      </div>
    </div>
  );
};

interface MatchCardProps {
  homeTeam: Team;
  awayTeam: Team;
  onResult: (homeScore: number, awayScore: number) => void;
}

const MatchCard = ({ homeTeam, awayTeam, onResult }: MatchCardProps) => {
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [isPlayed, setIsPlayed] = useState(false);

  const handleConfirm = () => {
    const home = parseInt(homeScore) || 0;
    const away = parseInt(awayScore) || 0;
    onResult(home, away);
    setIsPlayed(true);
  };

  return (
    <Card className={`p-3 transition-all ${isPlayed ? 'bg-success/10 border-success/30' : 'bg-card hover:bg-secondary/30'}`}>
      <div className="flex items-center gap-2">
        {/* Home Team */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
            style={{ 
              backgroundColor: homeTeam.primaryColor,
              color: getContrastColor(homeTeam.primaryColor)
            }}
          >
            {homeTeam.abbreviation}
          </div>
          <span className="text-sm font-medium truncate">{homeTeam.name}</span>
        </div>

        {/* Score Inputs */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            disabled={isPlayed}
            className="w-10 h-10 text-center bg-muted border border-border rounded-md text-lg font-bold focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
          <span className="text-muted-foreground font-bold">-</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            disabled={isPlayed}
            className="w-10 h-10 text-center bg-muted border border-border rounded-md text-lg font-bold focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
        </div>

        {/* Away Team */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-sm font-medium truncate text-right">{awayTeam.name}</span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
            style={{ 
              backgroundColor: awayTeam.primaryColor,
              color: getContrastColor(awayTeam.primaryColor)
            }}
          >
            {awayTeam.abbreviation}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      {(homeScore !== "" || awayScore !== "") && !isPlayed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 pt-3 border-t border-border"
        >
          <Button 
            size="sm" 
            className="w-full"
            onClick={handleConfirm}
          >
            Confirmar Resultado
          </Button>
        </motion.div>
      )}
    </Card>
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
