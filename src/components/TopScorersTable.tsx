import { useTopScorers } from "@/hooks/useTopScorers";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trophy, Target, Clock, Percent } from "lucide-react";

export const TopScorersTable = () => {
  const { data: scorers, isLoading, error } = useTopScorers();

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Error al cargar los goleadores.
      </div>
    );
  }

  if (isLoading) {
    return <SkeletonTable />;
  }

  if (!scorers || scorers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aún no hay datos de goleadores.</p>
        <p className="text-xs mt-1">Los datos se actualizan automáticamente.</p>
      </div>
    );
  }

  const lastUpdated = scorers[0]?.last_updated;

  return (
    <div>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="text-center hidden sm:table-cell">PJ</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Target className="w-3.5 h-3.5" /> Goles
                  </div>
                </TableHead>
                <TableHead className="text-center hidden sm:table-cell">Asist.</TableHead>
                <TableHead className="text-center hidden md:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Min/Gol
                  </div>
                </TableHead>
                <TableHead className="text-center hidden md:table-cell">Prom.</TableHead>
                <TableHead className="text-center hidden lg:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    <Percent className="w-3.5 h-3.5" /> Penal
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scorers.map((player, idx) => {
                const goalsPerGame = player.games_played > 0
                  ? (player.goals / player.games_played).toFixed(2)
                  : "—";
                const minsPerGoal = player.goals > 0
                  ? Math.round(player.minutes_played / player.goals)
                  : "—";
                const penaltyPct = player.goals > 0
                  ? Math.round((player.penalty_goals / player.goals) * 100)
                  : 0;

                return (
                  <TableRow key={player.player_id} className="group">
                    <TableCell className="text-center font-bold text-muted-foreground">
                      {idx < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0 ? "bg-yellow-500/20 text-yellow-600" :
                          idx === 1 ? "bg-gray-400/20 text-gray-500" :
                          "bg-orange-400/20 text-orange-500"
                        }`}>
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-xs">{idx + 1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {player.player_photo ? (
                            <img
                              src={player.player_photo}
                              alt={player.player_name}
                              className="w-9 h-9 rounded-full object-cover bg-muted"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {player.player_name.charAt(0)}
                            </div>
                          )}
                          {player.team_logo && (
                            <img
                              src={player.team_logo}
                              alt={player.team_name}
                              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background border border-border"
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{player.player_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{player.team_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell text-sm">
                      {player.games_played}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-primary text-lg">{player.goals}</span>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell text-sm">
                      {player.assists}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell text-sm text-muted-foreground">
                      {minsPerGoal}{typeof minsPerGoal === "number" ? "'" : ""}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell text-sm text-muted-foreground">
                      {goalsPerGame}
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell text-sm text-muted-foreground">
                      {penaltyPct}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Datos actualizados por última vez el:{" "}
          {format(new Date(lastUpdated), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
        </p>
      )}
    </div>
  );
};

const SkeletonTable = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="p-4 space-y-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-8" />
        </div>
      ))}
    </div>
  </div>
);
