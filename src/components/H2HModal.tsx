import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Swords, ChevronDown, ChevronUp, Calendar, RefreshCw, TrendingUp, Loader2, ExternalLink } from "lucide-react";
import { useH2H, H2HFixture } from "@/hooks/useH2H";
import { useTeamRecentForm } from "@/hooks/useTeamRecentForm";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { TeamLogo } from "@/components/TeamLogo";
import { initialTeams } from "@/data/teams";

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

// Helper to get ONLY future fixtures (date > today AND no score)
function getFutureFixtures(fixtures: H2HFixture[]): H2HFixture[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  return fixtures
    .filter(f => {
      // Must have no score
      if (f.homeGoals !== null && f.awayGoals !== null) return false;
      
      // Date must be in the future (strictly after today)
      const fixtureDate = new Date(f.date);
      fixtureDate.setHours(0, 0, 0, 0);
      return fixtureDate.getTime() >= today.getTime();
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Note: Team recent form is now fetched via useTeamRecentForm hook from backend API

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
    <div className={`flex items-center gap-2 min-w-0 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <TeamLogo 
        teamId={teamId} 
        teamName={teamName} 
        abbreviation={abbr}
        primaryColor="#374151"
        size="sm" 
      />
      <div className={`min-w-0 ${side === "right" ? "text-right" : "text-left"}`}>
        <div className="text-xs font-semibold text-foreground leading-tight truncate">{abbr}</div>
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

// Next match section (for future fixtures) - only shows CONFIRMED future dates
function NextMatchSection({ fixture, homeTeamName, awayTeamName }: { 
  fixture: H2HFixture | null; 
  homeTeamName: string;
  awayTeamName: string;
}) {
  const homeAbbr = getAbbr(homeTeamName);
  const awayAbbr = getAbbr(awayTeamName);
  
  // No confirmed future fixture - show neutral "Por confirmar" style
  if (!fixture) {
    return (
      <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium mb-2">
          <Calendar className="w-3 h-3" />
          Próximo partido
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{homeAbbr}</span>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground italic">
              Por confirmar
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{awayAbbr}</span>
        </div>
      </div>
    );
  }
  
  // Has a confirmed future fixture - show highlighted style
  const fixtureHomeAbbr = getAbbr(fixture.homeTeam);
  const fixtureAwayAbbr = getAbbr(fixture.awayTeam);
  
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium mb-2">
        <Calendar className="w-3 h-3" />
        Próximo partido
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{fixtureHomeAbbr}</span>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">
            {format(new Date(fixture.date), "dd MMM yyyy", { locale: es })}
          </div>
        </div>
        <span className="text-xs font-medium">{fixtureAwayAbbr}</span>
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
            <div className="text-base font-bold text-primary">
              {lastMatch.homeGoals}-{lastMatch.awayGoals}
            </div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              Último enfrentamiento<br/>{format(new Date(lastMatch.date), "dd/MM/yy")}
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

// Last 5 form section (H2H)
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
          <div className="text-[10px] text-muted-foreground mb-1">{getAbbr(homeTeamName)}</div>
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
          <div className="text-[9px] text-muted-foreground/70 mt-1">Forma H2H</div>
        </div>
        
        {/* Away team perspective */}
        <div className="flex-1 text-right">
          <div className="text-[10px] text-muted-foreground mb-1">{getAbbr(awayTeamName)}</div>
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
          <div className="text-[9px] text-muted-foreground/70 mt-1">Forma H2H</div>
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
    <div className={`flex items-center gap-2 border-b border-border/50 last:border-0 ${isFirst ? "py-3 bg-primary/5 rounded-lg px-2 -mx-2" : "py-2"}`}>
      {/* Date + Label for first */}
      <div className="shrink-0 w-16">
        {isFirst && (
          <div className="text-[9px] text-primary font-semibold mb-0.5">Último enfrentamiento</div>
        )}
        <div className={`text-muted-foreground ${isFirst ? "text-[10px]" : "text-[10px]"}`}>
          {format(new Date(fixture.date), "dd MMM yy", { locale: es })}
        </div>
      </div>
      
      {/* Teams and score */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className={`${isFirst ? "text-sm font-medium" : "text-xs"} ${fixture.winner === "home" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
          {homeAbbr}
        </span>
        
        <div className={`bg-background px-2.5 py-1 rounded font-bold min-w-[48px] text-center shadow-sm ${isFirst ? "text-lg" : "text-sm"}`}>
          {fixture.homeGoals} - {fixture.awayGoals}
        </div>
        
        <span className={`${isFirst ? "text-sm font-medium" : "text-xs"} ${fixture.winner === "away" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
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
    <div className="space-y-1 min-w-0">
      <div className="text-xs font-medium text-muted-foreground">Historial ({total} partidos)</div>
      
      <div className="min-w-0">
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

// ============================================
// NEW: Fallback sections when no H2H exists
// ============================================

// Team recent form card (uses backend API for real match data)
function TeamRecentFormCard({ 
  apiTeamId, 
  teamId,
  teamName 
}: { 
  apiTeamId: number;
  teamId: string; 
  teamName: string;
}) {
  const abbr = getAbbr(teamName);
  const team = initialTeams.find(t => t.id === teamId);
  const { data: form, loading, error } = useTeamRecentForm(apiTeamId);
  
  const hasData = form && form.matchesPlayed > 0;
  const avgGoalsFor = hasData ? (form.goalsFor / form.matchesPlayed).toFixed(1) : "-";
  const avgGoalsAgainst = hasData ? (form.goalsAgainst / form.matchesPlayed).toFixed(1) : "-";
  
  return (
    <div className="flex-1 bg-card/50 rounded-lg p-3 min-w-0">
      {/* Header with logo and name */}
      <div className="flex items-center gap-2 mb-3">
        <TeamLogo 
          teamId={teamId} 
          teamName={teamName} 
          abbreviation={abbr}
          primaryColor={team?.primaryColor || "#374151"}
          size="sm" 
        />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">{abbr}</div>
          <div className="text-[10px] text-muted-foreground truncate">{teamName}</div>
        </div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-3">
          <p className="text-[10px] text-red-400">Error al cargar</p>
        </div>
      )}
      
      {/* Data available */}
      {!loading && !error && hasData && (
        <>
          {/* Form chips */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] text-muted-foreground">Forma reciente</span>
              {form.isPartial && (
                <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1 rounded">Parcial</span>
              )}
            </div>
            <div className="flex gap-1">
              {form.results.map((result, idx) => (
                <ResultChip key={idx} result={result} />
              ))}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center bg-background/50 rounded px-2 py-1.5">
              <div className="text-sm font-bold text-green-400">{avgGoalsFor}</div>
              <div className="text-[9px] text-muted-foreground">GF/partido</div>
            </div>
            <div className="text-center bg-background/50 rounded px-2 py-1.5">
              <div className="text-sm font-bold text-red-400">{avgGoalsAgainst}</div>
              <div className="text-[9px] text-muted-foreground">GC/partido</div>
            </div>
          </div>
        </>
      )}
      
      {/* No data available */}
      {!loading && !error && !hasData && (
        <div className="text-center py-4">
          <p className="text-[11px] text-muted-foreground italic">
            Sin datos suficientes
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            No hay partidos recientes disponibles
          </p>
        </div>
      )}
    </div>
  );
}

// No H2H fallback state with team forms
function NoH2HFallback({ 
  homeTeamId, 
  homeTeamName, 
  homeApiId,
  awayTeamId, 
  awayTeamName,
  awayApiId,
  nextMatch 
}: { 
  homeTeamId: string; 
  homeTeamName: string;
  homeApiId: number;
  awayTeamId: string;
  awayTeamName: string;
  awayApiId: number;
  nextMatch: H2HFixture | null;
}) {
  return (
    <div className="space-y-4">
      {/* Next match section */}
      <NextMatchSection 
        fixture={nextMatch} 
        homeTeamName={homeTeamName} 
        awayTeamName={awayTeamName} 
      />
      
      {/* No H2H message */}
      <div className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
        <Swords className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Sin enfrentamientos directos registrados entre estos equipos
        </p>
      </div>
      
      {/* Team forms header */}
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <TrendingUp className="w-3.5 h-3.5" />
        Rendimiento reciente de cada equipo
      </div>
      
      {/* Two team form cards - fetch from backend API */}
      <div className="flex gap-3">
        <TeamRecentFormCard apiTeamId={homeApiId} teamId={homeTeamId} teamName={homeTeamName} />
        <TeamRecentFormCard apiTeamId={awayApiId} teamId={awayTeamId} teamName={awayTeamName} />
      </div>
    </div>
  );
}

// Error state
function ErrorState({ error, onRetry, rateLimited }: { error: string; onRetry?: () => void; rateLimited?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <AlertCircle className={`w-10 h-10 ${rateLimited ? "text-amber-500/70" : "text-destructive/70"}`} />
      <div>
        <p className={`font-medium text-sm ${rateLimited ? "text-amber-500" : "text-destructive"}`}>
          {rateLimited ? "Mucho tráfico" : "Error al cargar"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
      </div>
      {onRetry && !rateLimited && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      )}
      {rateLimited && (
        <p className="text-[10px] text-muted-foreground/70 animate-pulse">
          Podrás reintentar en unos segundos...
        </p>
      )}
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
  const { data, loading, error, rateLimited, fetchH2H, reset, retry } = useH2H();

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

  const nextMatch = futureFixtures[0] || null;
  const hasPlayedMatches = playedFixtures.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[340px] sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0"
        aria-labelledby="h2h-dialog-title"
        aria-describedby="h2h-dialog-description"
      >
        {/* Sticky Header - always visible */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50 bg-background shrink-0">
          <DialogTitle 
            id="h2h-dialog-title"
            className="flex items-center justify-center gap-2 text-sm font-semibold pr-8"
          >
            <Swords className="w-4 h-4 text-primary" />
            Head to Head
          </DialogTitle>
          
          {/* Team cards */}
          <div className="flex items-center justify-between mt-3 min-w-0">
            <TeamMiniCard teamId={homeTeamId} teamName={homeTeamName} side="left" />
            <span className="text-xs font-bold text-muted-foreground shrink-0">VS</span>
            <TeamMiniCard teamId={awayTeamId} teamName={awayTeamName} side="right" />
          </div>
          
          {/* Screen reader description */}
          <span id="h2h-dialog-description" className="sr-only">
            Estadísticas de enfrentamientos entre {homeTeamName} y {awayTeamName}
          </span>
        </DialogHeader>

        {/* Scrollable Body - only scrollable container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain px-4 py-4 pb-28 md:pb-24 space-y-4 min-w-0">
          {loading && <LoadingSkeleton />}
          
          {error && <ErrorState error={error} onRetry={retry} rateLimited={rateLimited} />}
          
          {data && !hasPlayedMatches && (
            <NoH2HFallback 
              homeTeamId={homeTeamId}
              homeTeamName={homeTeamName}
              homeApiId={homeApiId}
              awayTeamId={awayTeamId}
              awayTeamName={awayTeamName}
              awayApiId={awayApiId}
              nextMatch={nextMatch}
            />
          )}
          
          {/* Has H2H matches - show full stats */}
          {data && hasPlayedMatches && (
            <>
              {/* Next match section - shows "Por confirmar" if no future match */}
              <NextMatchSection 
                fixture={nextMatch} 
                homeTeamName={homeTeamName} 
                awayTeamName={awayTeamName} 
              />
              
              {/* Stats sections */}
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
          
          {/* Footer with relative timestamp */}
          {data?.cachedAt && (
            <div className="flex items-center justify-center">
              <p className="text-[10px] text-muted-foreground/60">
                Actualizado {formatDistanceToNow(new Date(data.cachedAt), { addSuffix: true, locale: es })}
              </p>
            </div>
          )}
        </div>

        {/* Sticky Betsson CTA Footer */}
        {data && (
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3 shrink-0 safe-area-inset-bottom">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground text-center">
                ¿Quieres ver las cuotas?
              </p>
              <a
                href="https://record.betsson.com/_5ti98aEiuzvO_1XdENIyd2Nd7ZgqdRLk/2/"
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                Ver cuotas en Betsson
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="text-center space-y-0.5">
                <p className="text-[9px] text-muted-foreground/70 leading-tight">
                  18+ | SFTG Limited | MINCETUR | Licencias: 11002586010000 y 21002586010000
                </p>
                <p className="text-[9px] text-muted-foreground/70">
                  Juega con responsabilidad.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
