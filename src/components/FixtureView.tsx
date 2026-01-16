import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Minus, Plus, Wand2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Match, TeamStats } from "@/hooks/useLeagueEngine";
import { useState, useEffect, useRef } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import { Footer } from "./Footer";
import { H2HModal } from "./H2HModal";
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
  value: number | null;
  onChange: (value: number) => void;
  onActivate: () => void;
  disabled?: boolean;
}

const GoalStepper = ({ value, onChange, onActivate, disabled }: GoalStepperProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDecrement = () => {
    if (value !== null && value > 0) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value === null) {
      onActivate();
    } else if (value < 15) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || (/^\d+$/.test(val) && parseInt(val) <= 15)) {
      setInputValue(val);
    }
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    if (inputValue !== "") {
      const numVal = Math.min(15, Math.max(0, parseInt(inputValue) || 0));
      if (value === null) {
        onActivate();
      }
      onChange(numVal);
    }
    setInputValue("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  const handleValueClick = () => {
    if (value !== null && !disabled) {
      setIsEditing(true);
      setInputValue(value.toString());
    } else if (value === null) {
      onActivate();
    }
  };

  return (
    <div className="flex items-center gap-1 md:gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10 md:w-5 md:h-5 rounded-full bg-muted/50 hover:bg-muted text-foreground"
        onClick={handleDecrement}
        disabled={disabled || value === null || value <= 0}
      >
        <Minus className="w-5 h-5 md:w-2.5 md:h-2.5" />
      </Button>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          autoFocus
          className="w-10 h-10 md:w-5 md:h-5 rounded bg-primary/20 border border-primary text-center text-lg md:text-xs font-bold text-primary outline-none"
        />
      ) : (
        <motion.div 
          key={value ?? "empty"}
          initial={{ scale: value !== null ? 1.3 : 1 }}
          animate={{ scale: 1 }}
          onClick={handleValueClick}
          className={`w-10 h-10 md:w-5 md:h-5 rounded flex items-center justify-center text-lg md:text-xs font-bold cursor-pointer transition-colors ${
            value !== null 
              ? "bg-primary/10 border border-primary/30 text-primary" 
              : "bg-muted/30 border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-primary/50 hover:text-primary/50"
          }`}
        >
          {value !== null ? value : "–"}
        </motion.div>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10 md:w-5 md:h-5 rounded-full bg-muted/50 hover:bg-muted text-foreground"
        onClick={handleIncrement}
        disabled={disabled || (value !== null && value >= 15)}
      >
        <Plus className="w-5 h-5 md:w-2.5 md:h-2.5" />
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
  onH2HClick: (homeTeam: TeamStats, awayTeam: TeamStats) => void;
}

const MatchCard = ({ match, homeTeam, awayTeam, onUpdatePrediction, onConfirmResult, onH2HClick }: MatchCardProps) => {
  const [localHome, setLocalHome] = useState<number | null>(
    match.homePrediction !== null && match.homePrediction !== undefined 
      ? match.homePrediction 
      : null
  );
  const [localAway, setLocalAway] = useState<number | null>(
    match.awayPrediction !== null && match.awayPrediction !== undefined 
      ? match.awayPrediction 
      : null
  );

  useEffect(() => {
    if (match.homePrediction !== null && match.homePrediction !== undefined) {
      setLocalHome(match.homePrediction);
    } else {
      setLocalHome(null);
    }
    if (match.awayPrediction !== null && match.awayPrediction !== undefined) {
      setLocalAway(match.awayPrediction);
    } else {
      setLocalAway(null);
    }
  }, [match.homePrediction, match.awayPrediction]);

  const isPlayed = match.status === "played";

  // When user activates home score, set home to 0 and away to 0
  const handleHomeActivate = () => {
    setLocalHome(0);
    if (localAway === null) {
      setLocalAway(0);
    }
    onUpdatePrediction(match.id, 0, localAway === null ? 0 : localAway);
  };

  // When user activates away score, set away to 0 and home to 0
  const handleAwayActivate = () => {
    setLocalAway(0);
    if (localHome === null) {
      setLocalHome(0);
    }
    onUpdatePrediction(match.id, localHome === null ? 0 : localHome, 0);
  };

  const handleHomeChange = (value: number) => {
    setLocalHome(value);
    const awayVal = localAway === null ? 0 : localAway;
    if (localAway === null) setLocalAway(0);
    onUpdatePrediction(match.id, value, awayVal);
  };

  const handleAwayChange = (value: number) => {
    setLocalAway(value);
    const homeVal = localHome === null ? 0 : localHome;
    if (localHome === null) setLocalHome(0);
    onUpdatePrediction(match.id, homeVal, value);
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
          
          {/* H2H Stats Button - Mobile */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                  onClick={() => onH2HClick(homeTeam, awayTeam)}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs font-medium">Stats</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver historial, forma y estadísticas del partido</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {match.homeScore}
              </div>
              <span className="text-muted-foreground/50 text-lg font-bold">-</span>
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {match.awayScore}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <GoalStepper value={localHome} onChange={handleHomeChange} onActivate={handleHomeActivate} />
              <span className="text-muted-foreground text-lg font-bold">-</span>
              <GoalStepper value={localAway} onChange={handleAwayChange} onActivate={handleAwayActivate} />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout: Compact Horizontal */}
      <div className="hidden md:flex items-center gap-2">
        
        {/* Home Team */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-xs font-medium truncate">
            {homeTeam.name}
          </span>
          <TeamLogo
            teamId={homeTeam.id}
            teamName={homeTeam.name}
            abbreviation={homeTeam.abbreviation}
            primaryColor={homeTeam.primaryColor}
            size="md"
          />
        </div>

        {/* Score - Centered with fixed width */}
        <div className="flex items-center justify-center w-[120px] shrink-0">
          {isPlayed ? (
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center text-sm font-bold text-muted-foreground">
                {match.homeScore}
              </div>
              <span className="text-muted-foreground/50 text-[10px] font-medium">-</span>
              <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center text-sm font-bold text-muted-foreground">
                {match.awayScore}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <GoalStepper value={localHome} onChange={handleHomeChange} onActivate={handleHomeActivate} />
              <span className="text-muted-foreground text-[10px] font-medium">-</span>
              <GoalStepper value={localAway} onChange={handleAwayChange} onActivate={handleAwayActivate} />
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <TeamLogo
            teamId={awayTeam.id}
            teamName={awayTeam.name}
            abbreviation={awayTeam.abbreviation}
            primaryColor={awayTeam.primaryColor}
            size="md"
          />
          <span className="text-xs font-medium truncate">
            {awayTeam.name}
          </span>
        </div>

        {/* H2H Stats Button - Desktop */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                onClick={() => onH2HClick(homeTeam, awayTeam)}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Stats</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver historial, forma y estadísticas del partido</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
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
  // H2H Modal state
  const [h2hOpen, setH2hOpen] = useState(false);
  const [h2hTeams, setH2hTeams] = useState<{ home: TeamStats; away: TeamStats } | null>(null);

  const handleH2HClick = (homeTeam: TeamStats, awayTeam: TeamStats) => {
    setH2hTeams({ home: homeTeam, away: awayTeam });
    setH2hOpen(true);
  };

  // Count matches with scores (official or predictions)
  const playedCount = matches.filter(m => 
    m.status === "played" || (m.homePrediction !== null && m.awayPrediction !== null)
  ).length;
  const pendingCount = matches.length - playedCount;

  // Autocomplete with draws for matches without results
  const handleAutocompleteDraw = () => {
    matches.forEach((match) => {
      // Only apply to pending matches that don't have predictions yet
      if (match.status === "pending" && match.homePrediction === null && match.awayPrediction === null) {
        onUpdatePrediction(match.id, 0, 0);
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
                <span>{playedCount} jugados</span>
                <span>{pendingCount} pendientes</span>
              </div>
            </div>
            
            {/* Autocomplete with Draws Button */}
            {pendingCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 md:w-6 md:h-6 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                      onClick={handleAutocompleteDraw}
                    >
                      <Wand2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Autocompletar con empates</p>
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
      <div className="flex-1 overflow-y-auto p-2 md:p-1.5 custom-scrollbar">
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
                  onH2HClick={handleH2HClick}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
        
        {/* Footer minimal */}
        <Footer minimal />
      </div>

      {/* H2H Modal */}
      {h2hTeams && (
        <H2HModal
          open={h2hOpen}
          onOpenChange={setH2hOpen}
          homeTeamName={h2hTeams.home.name}
          awayTeamName={h2hTeams.away.name}
          homeTeamId={h2hTeams.home.id}
          awayTeamId={h2hTeams.away.id}
          homeApiId={h2hTeams.home.apiTeamId}
          awayApiId={h2hTeams.away.apiTeamId}
        />
      )}
    </div>
  );
};
