import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Lock, Minus, Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Match, TeamStats } from "@/hooks/useLeagueEngine";
import { useState, useEffect } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FixtureViewProps {
  matches: Match[];
  currentRound: number;
  totalRounds: number;
  onRoundChange: (round: number) => void;
  onUpdatePrediction: (matchId: string, home: number | null, away: number | null) => void;
  onConfirmResult: (matchId: string, home: number, away: number) => void;
  getTeamById: (id: string) => TeamStats | undefined;
}



interface GoalStepperProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const GoalStepper = ({ value, onChange, disabled }: GoalStepperProps) => {
  const handleDecrement = () => {
    if (value > 0) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < 15) onChange(value + 1);
  };

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted/50 hover:bg-muted text-foreground"
        onClick={handleDecrement}
        disabled={disabled || value <= 0}
      >
        <Minus className="w-3 h-3 md:w-2.5 md:h-2.5" />
      </Button>
      <motion.div 
        key={value}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className="w-6 h-6 md:w-5 md:h-5 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-sm md:text-xs font-bold text-primary"
      >
        {value}
      </motion.div>
      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted/50 hover:bg-muted text-foreground"
        onClick={handleIncrement}
        disabled={disabled || value >= 15}
      >
        <Plus className="w-3 h-3 md:w-2.5 md:h-2.5" />
      </Button>
    </div>
  );
};

interface MatchCardProps {
  match: Match;
  homeTeam: TeamStats;
  awayTeam: TeamStats;
  onUpdatePrediction: (matchId: string, home: number | null, away: number | null) => void;
  onConfirmResult: (matchId: string, home: number, away: number) => void;
}

const MatchCard = ({ match, homeTeam, awayTeam, onUpdatePrediction, onConfirmResult }: MatchCardProps) => {
  const [localHome, setLocalHome] = useState<number>(
    match.homePrediction !== null && match.homePrediction !== undefined 
      ? match.homePrediction 
      : 0
  );
  const [localAway, setLocalAway] = useState<number>(
    match.awayPrediction !== null && match.awayPrediction !== undefined 
      ? match.awayPrediction 
      : 0
  );
  const [hasInteracted, setHasInteracted] = useState(
    match.homePrediction !== null || match.awayPrediction !== null
  );

  useEffect(() => {
    if (match.homePrediction !== null && match.homePrediction !== undefined) {
      setLocalHome(match.homePrediction);
      setHasInteracted(true);
    }
    if (match.awayPrediction !== null && match.awayPrediction !== undefined) {
      setLocalAway(match.awayPrediction);
      setHasInteracted(true);
    }
    if (match.homePrediction === null && match.awayPrediction === null) {
      setLocalHome(0);
      setLocalAway(0);
      setHasInteracted(false);
    }
  }, [match.homePrediction, match.awayPrediction]);

  const isPlayed = match.status === "played";

  const handleHomeChange = (value: number) => {
    setLocalHome(value);
    setHasInteracted(true);
    onUpdatePrediction(match.id, value, localAway);
  };

  const handleAwayChange = (value: number) => {
    setLocalAway(value);
    setHasInteracted(true);
    onUpdatePrediction(match.id, localHome, value);
  };

  const handleConfirm = () => {
    if (hasInteracted) {
      onConfirmResult(match.id, localHome, localAway);
    }
  };

  return (
    <Card className={`p-2 md:p-2 transition-all duration-200 ${
      isPlayed 
        ? "bg-muted/30 border-muted" 
        : "bg-card/50 border-border hover:border-primary/30"
    }`}>

      {/* Mobile Layout: Vertical Stack */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Teams Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex-1 flex items-center gap-2">
            <TeamLogo
              teamId={homeTeam.id}
              teamName={homeTeam.name}
              abbreviation={homeTeam.abbreviation}
              primaryColor={homeTeam.primaryColor}
              size="md"
            />
            <span className="text-sm font-medium leading-tight">
              {homeTeam.name}
            </span>
          </div>
          
          <span className="text-muted-foreground font-bold">VS</span>
          
          {/* Away Team */}
          <div className="flex-1 flex items-center gap-2 justify-end">
            <span className="text-sm font-medium leading-tight text-right">
              {awayTeam.name}
            </span>
            <TeamLogo
              teamId={awayTeam.id}
              teamName={awayTeam.name}
              abbreviation={awayTeam.abbreviation}
              primaryColor={awayTeam.primaryColor}
              size="md"
            />
          </div>
        </div>

        {/* Score Row */}
        <div className="flex items-center justify-center gap-2">
          {isPlayed ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-3xl font-bold">
                {match.homeScore}
              </div>
              <div className="flex flex-col items-center">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                  Final
                </span>
              </div>
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-3xl font-bold">
                {match.awayScore}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <GoalStepper value={localHome} onChange={handleHomeChange} />
              <span className="text-muted-foreground text-lg font-bold">-</span>
              <GoalStepper value={localAway} onChange={handleAwayChange} />
              <Button
                size="icon"
                variant={hasInteracted ? "default" : "ghost"}
                className="w-10 h-10 shrink-0 ml-2"
                onClick={handleConfirm}
              >
                <Check className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout: Compact Horizontal */}
      <div className="hidden md:flex items-center gap-1">
        
        {/* Home Team */}
        <div className="flex-1 flex items-center gap-1.5 justify-end min-w-0">
          <span className="text-[11px] font-medium truncate">
            {homeTeam.name}
          </span>
          <TeamLogo
            teamId={homeTeam.id}
            teamName={homeTeam.name}
            abbreviation={homeTeam.abbreviation}
            primaryColor={homeTeam.primaryColor}
            size="sm"
          />
        </div>

        {/* Score */}
        <div className="flex items-center gap-0.5 px-1">
          {isPlayed ? (
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-sm font-bold">
                {match.homeScore}
              </div>
              <Lock className="w-2.5 h-2.5 text-muted-foreground" />
              <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-sm font-bold">
                {match.awayScore}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <GoalStepper value={localHome} onChange={handleHomeChange} />
              <span className="text-muted-foreground text-[10px] font-medium">-</span>
              <GoalStepper value={localAway} onChange={handleAwayChange} />
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <TeamLogo
            teamId={awayTeam.id}
            teamName={awayTeam.name}
            abbreviation={awayTeam.abbreviation}
            primaryColor={awayTeam.primaryColor}
            size="sm"
          />
          <span className="text-[11px] font-medium truncate">
            {awayTeam.name}
          </span>
        </div>

        {/* Confirm Button */}
        {!isPlayed && (
          <Button
            size="icon"
            variant={hasInteracted ? "default" : "ghost"}
            className="w-6 h-6 shrink-0"
            onClick={handleConfirm}
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      
      {/* Status indicator - Desktop only */}
      {isPlayed && (
        <div className="hidden md:block mt-1 text-center">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Final
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

  // Generate random results for all pending matches
  const handleMagicWand = () => {
    matches.forEach((match) => {
      if (match.status === "pending") {
        const homeScore = Math.floor(Math.random() * 5);
        const awayScore = Math.floor(Math.random() * 5);
        onUpdatePrediction(match.id, homeScore, awayScore);
      }
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Round Navigation - Compact on desktop */}
      <div className="p-2 md:py-1.5 md:px-2 border-b border-border bg-card/30">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 md:w-6 md:h-6"
            onClick={() => onRoundChange(Math.max(1, currentRound - 1))}
            disabled={currentRound === 1}
          >
            <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
          
          <div className="text-center flex items-center gap-2">
            <div>
              <h3 className="font-bold text-lg md:text-base">Fecha {currentRound}</h3>
              <div className="flex gap-3 text-xs md:text-[10px] text-muted-foreground justify-center">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 md:w-2.5 md:h-2.5" />
                  {playedCount} jugados
                </span>
                <span>{pendingCount} pendientes</span>
              </div>
            </div>
            
            {/* Magic Wand Button */}
            {pendingCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 md:w-6 md:h-6 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                      onClick={handleMagicWand}
                    >
                      <Wand2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Autocompletar resultados aleatorios</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 md:w-6 md:h-6"
            onClick={() => onRoundChange(Math.min(totalRounds, currentRound + 1))}
            disabled={currentRound === totalRounds}
          >
            <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>

      {/* Matches List - Compact spacing on desktop */}
      <div className="flex-1 overflow-y-auto p-2 md:p-1.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRound}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 md:space-y-1"
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
