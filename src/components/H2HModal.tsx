import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle, Swords, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useH2H, H2HData, H2HFixture } from "@/hooks/useH2H";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TeamLogo } from "@/components/TeamLogo";

interface H2HModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeApiId: number;
  awayApiId: number;
}

// Helper to get team abbreviation (first 3 chars)
function getAbbr(name: string): string {
  const abbrevMap: Record<string, string> = {
    "Universitario": "UNI",
    "Alianza Lima": "ALI",
    "Sporting Cristal": "CRI",
    "FBC Melgar": "MEL",
    "Cusco FC": "CUS",
    "Cienciano": "CIE",
    "Dep. Garcilaso": "GAR",
    "ADT": "ADT",
    "Sport Huancayo": "SHU",
    "UTC": "UTC",
    "Comerciantes U.": "COM",
    "FC Cajamarca": "FCC",
    "Los Chankas": "CHA",
    "Atlético Grau": "GRA",
    "Alianza Atlético": "AAS",
    "Sport Boys": "SBA",
    "Juan Pablo II": "JPI",
    "Dep. Moquegua": "MOQ",
  };
  return abbrevMap[name] || name.substring(0, 3).toUpperCase();
}

// Helper to filter played fixtures (with scores) and sort by date DESC
function getPlayedFixtures(fixtures: H2HFixture[]): H2HFixture[] {
  return fixtures
    .filter(f => f.homeGoals !== null && f.awayGoals !== null && f.homeGoals >= 0 && f.awayGoals >= 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Helper to get future fixtures (no score yet)
function getFutureFixtures(fixtures: H2HFixture[]): H2HFixture[] {
  return fixtures
    .filter(f => f.homeGoals === null || f.awayGoals === null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Result chip component
function ResultChip({ result, size = "sm" }: { result: "V" | "E" | "D"; size?: "sm" | "md" }) {
  const colors = {
    V: "bg-green-500/20 text-green-400 border-green-500/30",
    E: "bg-muted text-muted-foreground border-muted",
    D: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  
  const sizeClasses = size === "sm" 
    ? "w-5 h-5 text-[10px]" 
    : "w-6 h-6 text-xs";
  
  return (
    <span className={`inline-flex items-center justify-center rounded-full border font-bold ${colors[result]} ${sizeClasses}`}>
      {result}
    </span>
  );
}

// Team mini card for header
function TeamMiniCard({ teamId, teamName, side }: { teamId: string; teamName: string; side: "left" | "right" }) {
  const abbr = getAbbr(teamName);
  
  return (
    <div className={`flex items-center gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <TeamLogo 
        teamId={teamId} 
        teamName={teamName} 
        abbreviation={abbr}
        primaryColor="#374151"
        size="sm" 
      />
      <div className={`${side === "right" ? "text-right" : "text-left"}`}>
        <div className="text-xs font-semibold text-foreground leading-tight">{abbr}</div>
        <div className="text-[10px] text-muted-foreground leading-tight truncate max-w-[80px]">{teamName}</div>
      </div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="space-y-1">
            <div className="w-10 h-3 bg-muted rounded" />
            <div className="w-16 h-2 bg-muted rounded" />
          </div>
        </div>
        <div className="w-8 h-4 bg-muted rounded" />
        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="space-y-1">
            <div className="w-10 h-3 bg-muted rounded" />
            <div className="w-16 h-2 bg-muted rounded" />
          </div>
        </div>
      </div>
      <div className="h-8 bg-muted rounded-lg" />
      <div className="h-3 bg-muted rounded-full" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 bg-muted rounded-lg" />
        <div className="h-16 bg-muted rounded-lg" />
        <div className="h-16 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

// Next match section (for future fixtures)
function NextMatchSection({ fixture, homeApiId }: { fixture: H2HFixture; homeApiId: number }) {
  const isRequestedHomeTeamHome = fixture.homeId === homeApiId;
  const homeAbbr = getAbbr(fixture.homeTeam);
  const awayAbbr = getAbbr(fixture.awayTeam);
  
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium mb-2">
        <Calendar className="w-3 h-3" />
        Próximo partido
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{homeAbbr}</span>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">
            {format(new Date(fixture.date), "dd MMM yyyy", { locale: es })}
          </div>
        </div>
        <span className="text-xs font-medium">{awayAbbr}</span>
      </div>
    </div>
  );
}

// Summary row and progress bar
function SummarySection({ playedFixtures, homeTeamName, awayTeamName, homeApiId }: { 
  playedFixtures: H2HFixture[]; 
  homeTeamName: string; 
  awayTeamName: string;
  homeApiId: number;
}) {
  // Calculate stats from played fixtures only
  const stats = useMemo(() => {
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    
    playedFixtures.forEach(fixture => {
      const isHomeTeamHome = fixture.homeId === homeApiId;
      
      if (fixture.winner === "draw") {
        draws++;
      } else if ((fixture.winner === "home" && isHomeTeamHome) || (fixture.winner === "away" && !isHomeTeamHome)) {
        homeWins++;
      } else {
        awayWins++;
      }
    });
    
    return { homeWins, awayWins, draws, total: playedFixtures.length };
  }, [playedFixtures, homeApiId]);
  
  const total = stats.total;
  
  // Calculate percentages
  const homePct = total > 0 ? (stats.homeWins / total) * 100 : 0;
  const drawPct = total > 0 ? (stats.draws / total) * 100 : 0;
  const awayPct = total > 0 ? (stats.awayWins / total) * 100 : 0;
  
  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex items-center justify-between text-sm bg-card/50 rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-green-400">{stats.homeWins}</span>
          <span className="text-muted-foreground text-xs">victorias</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-muted-foreground">{stats.draws}</span>
          <span className="text-muted-foreground text-xs">empates</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-red-400">{stats.awayWins}</span>
          <span className="text-muted-foreground text-xs">victorias</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex">
        {homePct > 0 && (
          <div 
            className="h-full bg-green-500 transition-all" 
            style={{ width: `${homePct}%` }} 
          />
        )}
        {drawPct > 0 && (
          <div 
            className="h-full bg-muted-foreground/40 transition-all" 
            style={{ width: `${drawPct}%` }} 
          />
        )}
        {awayPct > 0 && (
          <div 
            className="h-full bg-red-500 transition-all" 
            style={{ width: `${awayPct}%` }} 
          />
        )}
      </div>
      
      {/* Labels under bar */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>{getAbbr(homeTeamName)} {Math.round(homePct)}%</span>
        <span>{Math.round(drawPct)}%</span>
        <span>{getAbbr(awayTeamName)} {Math.round(awayPct)}%</span>
      </div>
    </div>
  );
}

// KPIs section
function KPIsSection({ playedFixtures, homeTeamName, awayTeamName, homeApiId }: { 
  playedFixtures: H2HFixture[]; 
  homeTeamName: string; 
  awayTeamName: string;
  homeApiId: number;
}) {
  const total = playedFixtures.length;
  
  // Calculate stats from played fixtures
  const { homeWins, awayWins, draws, totalGoals } = useMemo(() => {
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    let totalGoals = 0;
    
    playedFixtures.forEach(fixture => {
      const isHomeTeamHome = fixture.homeId === homeApiId;
      totalGoals += (fixture.homeGoals || 0) + (fixture.awayGoals || 0);
      
      if (fixture.winner === "draw") {
        draws++;
      } else if ((fixture.winner === "home" && isHomeTeamHome) || (fixture.winner === "away" && !isHomeTeamHome)) {
        homeWins++;
      } else {
        awayWins++;
      }
    });
    
    return { homeWins, awayWins, draws, totalGoals };
  }, [playedFixtures, homeApiId]);
  
  // Average goals per match
  const avgGoals = total > 0 ? (totalGoals / total).toFixed(1) : "0";
  
  // Last match (first in sorted array)
  const lastMatch = playedFixtures[0];
  
  // Dominance calculation
  const homePct = total > 0 ? Math.round((homeWins / total) * 100) : 0;
  const awayPct = total > 0 ? Math.round((awayWins / total) * 100) : 0;
  const drawPct = total > 0 ? Math.round((draws / total) * 100) : 0;
  
  let dominanceText = "";
  let dominanceColor = "text-muted-foreground";
  
  if (homePct > awayPct && homePct > drawPct && homePct >= 40) {
    dominanceText = `${getAbbr(homeTeamName)} (${homePct}%)`;
    dominanceColor = "text-green-400";
  } else if (awayPct > homePct && awayPct > drawPct && awayPct >= 40) {
    dominanceText = `${getAbbr(awayTeamName)} (${awayPct}%)`;
    dominanceColor = "text-red-400";
  } else {
    dominanceText = "Equilibrado";
  }
  
  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Avg goals */}
      <div className="bg-card/50 rounded-lg p-2.5 text-center">
        <div className="text-lg font-bold text-primary">{avgGoals}</div>
        <div className="text-[9px] text-muted-foreground leading-tight">Prom. goles<br/>por partido</div>
      </div>
      
      {/* Last match */}
      <div className="bg-card/50 rounded-lg p-2.5 text-center">
        {lastMatch ? (
          <>
            <div className="text-sm font-bold">
              {lastMatch.homeGoals}-{lastMatch.awayGoals}
            </div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              Último<br/>{format(new Date(lastMatch.date), "dd/MM/yy")}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">-</div>
        )}
      </div>
      
      {/* Dominance */}
      <div className="bg-card/50 rounded-lg p-2.5 text-center">
        <div className={`text-xs font-bold ${dominanceColor}`}>
          {dominanceText}
        </div>
        <div className="text-[9px] text-muted-foreground leading-tight">
          Dominio<br/>histórico
        </div>
      </div>
    </div>
  );
}

// Last 5 form section
function Last5Section({ playedFixtures, homeTeamName, awayTeamName, homeApiId }: { 
  playedFixtures: H2HFixture[]; 
  homeTeamName: string; 
  awayTeamName: string;
  homeApiId: number;
}) {
  // Get last 5 played fixtures
  const last5 = playedFixtures.slice(0, 5);
  
  if (last5.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Últimos {last5.length} enfrentamientos</div>
      
      <div className="flex justify-between gap-4">
        {/* Home team perspective */}
        <div className="flex-1">
          <div className="text-[10px] text-muted-foreground mb-1.5">{getAbbr(homeTeamName)}</div>
          <div className="flex gap-1">
            {last5.map((fixture, idx) => {
              // Determine result from homeTeam perspective
              const isHomeTeamHome = fixture.homeId === homeApiId;
              let result: "V" | "E" | "D";
              
              if (fixture.winner === "draw") {
                result = "E";
              } else if ((fixture.winner === "home" && isHomeTeamHome) || (fixture.winner === "away" && !isHomeTeamHome)) {
                result = "V";
              } else {
                result = "D";
              }
              
              return <ResultChip key={idx} result={result} />;
            })}
          </div>
        </div>
        
        {/* Away team perspective */}
        <div className="flex-1 text-right">
          <div className="text-[10px] text-muted-foreground mb-1.5">{getAbbr(awayTeamName)}</div>
          <div className="flex gap-1 justify-end">
            {last5.map((fixture, idx) => {
              // Determine result from awayTeam perspective
              const isAwayTeamHome = fixture.homeId !== homeApiId;
              let result: "V" | "E" | "D";
              
              if (fixture.winner === "draw") {
                result = "E";
              } else if ((fixture.winner === "home" && !isAwayTeamHome) || (fixture.winner === "away" && isAwayTeamHome)) {
                result = "V";
              } else {
                result = "D";
              }
              
              return <ResultChip key={idx} result={result} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Single fixture row
function FixtureRow({ fixture, homeApiId, isFirst }: { fixture: H2HFixture; homeApiId: number; isFirst: boolean }) {
  const isRequestedHomeTeamHome = fixture.homeId === homeApiId;
  const homeAbbr = getAbbr(fixture.homeTeam);
  const awayAbbr = getAbbr(fixture.awayTeam);
  
  return (
    <div className={`flex items-center gap-2 border-b border-border/50 last:border-0 ${isFirst ? "py-2.5" : "py-2"}`}>
      {/* Date + Label for first */}
      <div className="shrink-0 w-16">
        {isFirst && (
          <div className="text-[9px] text-primary font-medium mb-0.5">Último encuentro</div>
        )}
        <div className={`text-muted-foreground ${isFirst ? "text-[10px]" : "text-[10px]"}`}>
          {format(new Date(fixture.date), "dd MMM yy", { locale: es })}
        </div>
      </div>
      
      {/* Teams and score */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className={`${isFirst ? "text-xs" : "text-xs"} ${fixture.winner === "home" ? "font-bold" : "text-muted-foreground"}`}>
          {homeAbbr}
        </span>
        
        <div className={`bg-background px-2 py-0.5 rounded font-bold min-w-[44px] text-center ${isFirst ? "text-base" : "text-sm"}`}>
          {fixture.homeGoals} - {fixture.awayGoals}
        </div>
        
        <span className={`${isFirst ? "text-xs" : "text-xs"} ${fixture.winner === "away" ? "font-bold" : "text-muted-foreground"}`}>
          {awayAbbr}
        </span>
      </div>
      
      {/* Local/Visitor chip for requested home team */}
      <div className="w-8 shrink-0 text-right">
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
          isRequestedHomeTeamHome 
            ? "bg-primary/20 text-primary" 
            : "bg-muted text-muted-foreground"
        }`}>
          {isRequestedHomeTeamHome ? "L" : "V"}
        </span>
      </div>
    </div>
  );
}

// History section with expand/collapse
function HistorySection({ playedFixtures, homeApiId }: { playedFixtures: H2HFixture[]; homeApiId: number }) {
  const [expanded, setExpanded] = useState(false);
  const total = playedFixtures.length;
  
  const displayedFixtures = expanded ? playedFixtures : playedFixtures.slice(0, 3);
  const hasMore = total > 3;
  
  if (total === 0) return null;
  
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">Historial ({total} partidos)</div>
      
      <div className={`${expanded ? "max-h-48 overflow-y-auto" : ""}`}>
        {displayedFixtures.map((fixture, index) => (
          <FixtureRow 
            key={fixture.id} 
            fixture={fixture} 
            homeApiId={homeApiId} 
            isFirst={index === 0}
          />
        ))}
      </div>
      
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Ocultar historial
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Ver todos ({total})
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <Swords className="w-10 h-10 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-sm">Sin enfrentamientos</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          No hay partidos registrados entre estos equipos
        </p>
      </div>
    </div>
  );
}

// Error state
function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <AlertCircle className="w-10 h-10 text-destructive/70" />
      <div>
        <p className="font-medium text-sm text-destructive">Error al cargar</p>
        <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
      </div>
    </div>
  );
}

export function H2HModal({ 
  open, 
  onOpenChange, 
  homeTeamName, 
  awayTeamName, 
  homeTeamId,
  awayTeamId,
  homeApiId, 
  awayApiId 
}: H2HModalProps) {
  const { data, loading, error, fetchH2H, reset } = useH2H();

  useEffect(() => {
    if (open && homeApiId && awayApiId) {
      fetchH2H(homeApiId, awayApiId);
    }
    
    if (!open) {
      reset();
    }
  }, [open, homeApiId, awayApiId, fetchH2H, reset]);

  // Process fixtures: separate played vs future, sort by date DESC
  const { playedFixtures, futureFixtures } = useMemo(() => {
    if (!data) return { playedFixtures: [], futureFixtures: [] };
    
    return {
      playedFixtures: getPlayedFixtures(data.fixtures),
      futureFixtures: getFutureFixtures(data.fixtures),
    };
  }, [data]);

  const nextMatch = futureFixtures[0];
  const hasPlayedMatches = playedFixtures.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Swords className="w-4 h-4 text-primary" />
            Head to Head
          </DialogTitle>
          
          {/* Team cards */}
          <div className="flex items-center justify-between mt-3">
            <TeamMiniCard teamId={homeTeamId} teamName={homeTeamName} side="left" />
            <span className="text-xs font-bold text-muted-foreground">VS</span>
            <TeamMiniCard teamId={awayTeamId} teamName={awayTeamName} side="right" />
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          {loading && <LoadingSkeleton />}
          
          {error && <ErrorState error={error} />}
          
          {data && !hasPlayedMatches && !nextMatch && <EmptyState />}
          
          {data && (hasPlayedMatches || nextMatch) && (
            <>
              {/* Next match section */}
              {nextMatch && (
                <NextMatchSection fixture={nextMatch} homeApiId={homeApiId} />
              )}
              
              {/* Stats sections - only if we have played matches */}
              {hasPlayedMatches && (
                <>
                  <SummarySection 
                    playedFixtures={playedFixtures} 
                    homeTeamName={homeTeamName} 
                    awayTeamName={awayTeamName}
                    homeApiId={homeApiId}
                  />
                  <KPIsSection 
                    playedFixtures={playedFixtures} 
                    homeTeamName={homeTeamName} 
                    awayTeamName={awayTeamName}
                    homeApiId={homeApiId}
                  />
                  <Last5Section 
                    playedFixtures={playedFixtures} 
                    homeTeamName={homeTeamName} 
                    awayTeamName={awayTeamName} 
                    homeApiId={homeApiId} 
                  />
                  <HistorySection playedFixtures={playedFixtures} homeApiId={homeApiId} />
                </>
              )}
            </>
          )}
        </div>
        
        {/* Footer with timestamp */}
        {data?.cachedAt && (
          <div className="px-4 pb-3 pt-0">
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Actualizado: {format(new Date(data.cachedAt), "dd/MM/yy HH:mm")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
