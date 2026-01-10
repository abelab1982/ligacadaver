import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Match, TeamStats } from "@/hooks/useLeagueEngine";
import { useState, useEffect } from "react";

interface FixtureViewProps {
  matches: Match[];
  currentRound: number;
  totalRounds: number;
  onRoundChange: (round: number) => void;
  onUpdatePrediction: (matchId: string, home: number | null, away: number | null) => void;
  onConfirmResult: (matchId: string, home: number, away: number) => void;
  getTeamById: (id: string) => TeamStats | undefined;
}

const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

interface MatchCardProps {
  match: Match;
  homeTeam: TeamStats;
  awayTeam: TeamStats;
  onUpdatePrediction: (matchId: string, home: number | null, away: number | null) => void;
  onConfirmResult: (matchId: string, home: number, away: number) => void;
}

const MatchCard = ({ match, homeTeam, awayTeam, onUpdatePrediction, onConfirmResult }: MatchCardProps) => {
  const [localHome, setLocalHome] = useState<string>(
    match.homePrediction !== null && match.homePrediction !== undefined 
      ? String(match.homePrediction) 
      : ""
  );
  const [localAway, setLocalAway] = useState<string>(
    match.awayPrediction !== null && match.awayPrediction !== undefined 
      ? String(match.awayPrediction) 
      : ""
  );

  // Sync with external state
  useEffect(() => {
    setLocalHome(
      match.homePrediction !== null && match.homePrediction !== undefined 
        ? String(match.homePrediction) 
        : ""
    );
    setLocalAway(
      match.awayPrediction !== null && match.awayPrediction !== undefined 
        ? String(match.awayPrediction) 
        : ""
    );
  }, [match.homePrediction, match.awayPrediction]);

  const isPlayed = match.status === "played";
  const hasPrediction = localHome !== "" && localAway !== "";

  const handleHomeChange = (value: string) => {
    const numValue = value === "" ? "" : value.replace(/\D/g, "").slice(0, 2);
    setLocalHome(numValue);
    const numericValue = numValue === "" ? null : parseInt(numValue, 10);
    const awayValue = localAway === "" ? null : parseInt(localAway, 10);
    onUpdatePrediction(match.id, numericValue, awayValue);
  };

  const handleAwayChange = (value: string) => {
    const numValue = value === "" ? "" : value.replace(/\D/g, "").slice(0, 2);
    setLocalAway(numValue);
    const homeValue = localHome === "" ? null : parseInt(localHome, 10);
    const numericValue = numValue === "" ? null : parseInt(numValue, 10);
    onUpdatePrediction(match.id, homeValue, numericValue);
  };

  const handleConfirm = () => {
    if (hasPrediction) {
      onConfirmResult(match.id, parseInt(localHome, 10), parseInt(localAway, 10));
    }
  };

  return (
    <Card className={`p-3 transition-all duration-200 ${
      isPlayed 
        ? "bg-muted/30 border-muted" 
        : "bg-card/50 border-border hover:border-primary/30"
    }`}>
      <div className="flex items-center gap-2">
        {/* Home Team */}
        <div className="flex-1 flex items-center gap-2 justify-end">
          <span className="text-xs text-muted-foreground truncate max-w-[80px] md:max-w-none">
            {homeTeam.name}
          </span>
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
            style={{ 
              backgroundColor: homeTeam.primaryColor,
              color: getContrastColor(homeTeam.primaryColor)
            }}
          >
            {homeTeam.abbreviation}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1 px-2">
          {isPlayed ? (
            <>
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-sm font-bold">
                {match.homeScore}
              </div>
              <Lock className="w-3 h-3 text-muted-foreground mx-1" />
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-sm font-bold">
                {match.awayScore}
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                value={localHome}
                onChange={(e) => handleHomeChange(e.target.value)}
                className="w-8 h-8 rounded bg-background border border-border text-center text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="-"
              />
              <span className="text-muted-foreground text-xs">vs</span>
              <input
                type="text"
                inputMode="numeric"
                value={localAway}
                onChange={(e) => handleAwayChange(e.target.value)}
                className="w-8 h-8 rounded bg-background border border-border text-center text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="-"
              />
            </>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
            style={{ 
              backgroundColor: awayTeam.primaryColor,
              color: getContrastColor(awayTeam.primaryColor)
            }}
          >
            {awayTeam.abbreviation}
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[80px] md:max-w-none">
            {awayTeam.name}
          </span>
        </div>

        {/* Confirm Button */}
        {!isPlayed && (
          <Button
            size="icon"
            variant={hasPrediction ? "default" : "ghost"}
            className="w-7 h-7 shrink-0"
            disabled={!hasPrediction}
            onClick={handleConfirm}
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Status indicator */}
      {isPlayed && (
        <div className="mt-2 text-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Resultado Final
          </span>
        </div>
      )}
    </Card>
  );
};

export const FixtureView = ({
  matches,
  currentRound,
  totalRounds,
  onRoundChange,
  onUpdatePrediction,
  onConfirmResult,
  getTeamById,
}: FixtureViewProps) => {
  const playedCount = matches.filter(m => m.status === "played").length;
  const pendingCount = matches.length - playedCount;

  return (
    <div className="h-full flex flex-col">
      {/* Round Navigation */}
      <div className="p-3 border-b border-border bg-card/30">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRoundChange(Math.max(1, currentRound - 1))}
            disabled={currentRound === 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="text-center">
            <h3 className="font-bold text-lg">Fecha {currentRound}</h3>
            <div className="flex gap-3 text-xs text-muted-foreground justify-center">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {playedCount} jugados
              </span>
              <span>{pendingCount} pendientes</span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRoundChange(Math.min(totalRounds, currentRound + 1))}
            disabled={currentRound === totalRounds}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Matches List */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRound}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {matches.map((match) => {
              const homeTeam = getTeamById(match.homeId);
              const awayTeam = getTeamById(match.awayId);
              
              if (!homeTeam || !awayTeam) return null;

              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  onUpdatePrediction={onUpdatePrediction}
                  onConfirmResult={onConfirmResult}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
