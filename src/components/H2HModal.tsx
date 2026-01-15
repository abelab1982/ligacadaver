import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, AlertCircle, Trophy, Minus, TrendingUp } from "lucide-react";
import { useH2H, H2HData } from "@/hooks/useH2H";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface H2HModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeTeamName: string;
  awayTeamName: string;
  homeApiId: number;
  awayApiId: number;
}

function ResultBadge({ winner, isHome }: { winner: "home" | "away" | "draw"; isHome: boolean }) {
  if (winner === "draw") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
        E
      </span>
    );
  }
  
  const isWin = (winner === "home" && isHome) || (winner === "away" && !isHome);
  
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
      isWin ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
    }`}>
      {isWin ? "V" : "D"}
    </span>
  );
}

function Last5Streak({ last5, homeTeamName }: { last5: Array<"home" | "away" | "draw">; homeTeamName: string }) {
  return (
    <div className="flex items-center gap-1">
      {last5.map((result, idx) => (
        <div
          key={idx}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            result === "home"
              ? "bg-green-500/20 text-green-500"
              : result === "away"
              ? "bg-red-500/20 text-red-500"
              : "bg-muted text-muted-foreground"
          }`}
          title={result === "home" ? `Victoria ${homeTeamName}` : result === "away" ? "Derrota" : "Empate"}
        >
          {result === "home" ? "V" : result === "away" ? "D" : "E"}
        </div>
      ))}
    </div>
  );
}

function H2HStats({ data, homeTeamName, awayTeamName }: { data: H2HData; homeTeamName: string; awayTeamName: string }) {
  const { stats } = data;
  const totalMatches = stats.total;
  
  const homeWinPct = totalMatches > 0 ? Math.round((stats.homeWins / totalMatches) * 100) : 0;
  const awayWinPct = totalMatches > 0 ? Math.round((stats.awayWins / totalMatches) * 100) : 0;
  const drawPct = totalMatches > 0 ? Math.round((stats.draws / totalMatches) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-green-500/10 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-500">{stats.homeWins}</div>
          <div className="text-xs text-muted-foreground truncate">{homeTeamName}</div>
          <div className="text-xs text-muted-foreground">{homeWinPct}%</div>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <div className="text-2xl font-bold text-muted-foreground">{stats.draws}</div>
          <div className="text-xs text-muted-foreground">Empates</div>
          <div className="text-xs text-muted-foreground">{drawPct}%</div>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-500">{stats.awayWins}</div>
          <div className="text-xs text-muted-foreground truncate">{awayTeamName}</div>
          <div className="text-xs text-muted-foreground">{awayWinPct}%</div>
        </div>
      </div>

      {/* Goals */}
      <div className="flex items-center justify-between bg-card/50 rounded-lg p-3">
        <div className="text-center flex-1">
          <div className="text-lg font-bold">{stats.homeGoals}</div>
          <div className="text-xs text-muted-foreground">Goles</div>
        </div>
        <div className="text-muted-foreground">-</div>
        <div className="text-center flex-1">
          <div className="text-lg font-bold">{stats.awayGoals}</div>
          <div className="text-xs text-muted-foreground">Goles</div>
        </div>
      </div>

      {/* Last 5 */}
      {stats.last5.length > 0 && (
        <div className="flex items-center justify-between bg-card/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>Últimos 5</span>
          </div>
          <Last5Streak last5={stats.last5} homeTeamName={homeTeamName} />
        </div>
      )}
    </div>
  );
}

function FixturesList({ data, homeApiId }: { data: H2HData; homeApiId: number }) {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.fixtures.map((fixture) => {
        const isRequestedHomeTeamAtHome = fixture.homeId === homeApiId;
        
        return (
          <div key={fixture.id} className="flex items-center gap-2 p-2 bg-card/30 rounded-lg text-sm">
            <div className="text-xs text-muted-foreground w-16 shrink-0">
              {format(new Date(fixture.date), "dd MMM yy", { locale: es })}
            </div>
            
            <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
              <span className={`truncate text-right flex-1 ${
                fixture.winner === "home" ? "font-semibold" : ""
              }`}>
                {fixture.homeTeam}
              </span>
              
              <span className="px-2 py-0.5 bg-background rounded font-mono text-xs shrink-0">
                {fixture.homeGoals} - {fixture.awayGoals}
              </span>
              
              <span className={`truncate text-left flex-1 ${
                fixture.winner === "away" ? "font-semibold" : ""
              }`}>
                {fixture.awayTeam}
              </span>
            </div>

            <ResultBadge 
              winner={fixture.winner} 
              isHome={isRequestedHomeTeamAtHome ? fixture.winner === "home" : fixture.winner === "away"} 
            />
          </div>
        );
      })}
    </div>
  );
}

export function H2HModal({ open, onOpenChange, homeTeamName, awayTeamName, homeApiId, awayApiId }: H2HModalProps) {
  const { data, loading, error, fetchH2H, reset } = useH2H();

  useEffect(() => {
    if (open && homeApiId && awayApiId) {
      fetchH2H(homeApiId, awayApiId);
    }
    
    if (!open) {
      reset();
    }
  }, [open, homeApiId, awayApiId, fetchH2H, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-primary" />
            Head to Head
          </DialogTitle>
          <DialogDescription className="text-sm">
            {homeTeamName} vs {awayTeamName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando historial...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Error al cargar</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}

          {data && data.fixtures.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Minus className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Sin enfrentamientos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No hay partidos registrados entre estos equipos
                </p>
              </div>
            </div>
          )}

          {data && data.fixtures.length > 0 && (
            <div className="space-y-4">
              <H2HStats data={data} homeTeamName={homeTeamName} awayTeamName={awayTeamName} />
              
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  Últimos {data.fixtures.length} partidos
                </h4>
                <FixturesList data={data} homeApiId={homeApiId} />
              </div>

              {data.cachedAt && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Actualizado: {format(new Date(data.cachedAt), "dd/MM/yy HH:mm")}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
