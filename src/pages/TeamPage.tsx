import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { ArrowLeft, MapPin, Building2, Mountain } from "lucide-react";
import { getTeamIdFromSlug, teamIdToSlug } from "@/data/teamSlugs";
import { initialTeams, getStatusBadge } from "@/data/teams";
import { TeamLogo } from "@/components/TeamLogo";
import { useFixtures } from "@/hooks/useFixtures";
import { useLiveLeagueEngine } from "@/hooks/useLiveLeagueEngine";

const TeamPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const teamId = slug ? getTeamIdFromSlug(slug) : null;
  const team = initialTeams.find((t) => t.id === teamId);
  const { fixtures } = useFixtures();
  const engine = useLiveLeagueEngine();

  // Get team stats from the engine (Apertura)
  const teamStats = useMemo(() => {
    if (!engine || !teamId) return null;
    const teams = engine.teams;
    return teams.find((t: { id: string }) => t.id === teamId) || null;
  }, [engine, teamId]);

  // Get team position
  const position = useMemo(() => {
    if (!engine || !teamId) return null;
    const teams = engine.teams;
    const idx = teams.findIndex((t: { id: string }) => t.id === teamId);
    return idx >= 0 ? idx + 1 : null;
  }, [engine, teamId]);

  // Get team fixtures
  const teamFixtures = useMemo(() => {
    if (!teamId) return [];
    return fixtures
      .filter((f) => f.homeId === teamId || f.awayId === teamId)
      .sort((a, b) => a.round - b.round);
  }, [fixtures, teamId]);

  const upcomingFixtures = useMemo(
    () => teamFixtures.filter((f) => f.status === "NS").slice(0, 5),
    [teamFixtures]
  );

  const recentResults = useMemo(
    () => teamFixtures.filter((f) => f.status === "FT").slice(-5).reverse(),
    [teamFixtures]
  );

  if (!team || !teamId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">Equipo no encontrado</p>
          <Link to="/" className="text-primary underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(team.status);
  const getTeamName = (id: string) => initialTeams.find((t) => t.id === id)?.name || id;
  const getTeamAbbr = (id: string) => initialTeams.find((t) => t.id === id)?.abbreviation || id;
  const getTeamColor = (id: string) => initialTeams.find((t) => t.id === id)?.primaryColor || "#666";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-3 h-3" /> Volver a la tabla
          </Link>
          
          <div className="flex items-center gap-4">
            <TeamLogo teamId={team.id} teamName={team.name} abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="lg" />
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {statusBadge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {statusBadge.label}
                  </span>
                )}
                {position && teamStats && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                    #{position} \u2022 {teamStats.points} pts
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Club Info */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informaci\u00f3n del Club</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-lg border border-border p-3 text-center">
              <MapPin className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Ciudad</p>
              <p className="text-sm font-medium">{team.city}</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-3 text-center">
              <Building2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Estadio</p>
              <p className="text-sm font-medium">{team.stadium}</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-3 text-center">
              <Mountain className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Altitud</p>
              <p className="text-sm font-medium">{team.altitude}m</p>
            </div>
          </div>
        </section>

        {/* Stats Table */}
        {teamStats && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estad\u00edsticas - Apertura 2026</h2>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-4 gap-0 text-center">
                {[
                  { label: "PJ", value: teamStats.played },
                  { label: "PG", value: teamStats.won },
                  { label: "PE", value: teamStats.drawn },
                  { label: "PP", value: teamStats.lost },
                ].map((s) => (
                  <div key={s.label} className="p-3 border-b border-border">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                ))}
                {[
                  { label: "GF", value: teamStats.goalsFor },
                  { label: "GC", value: teamStats.goalsAgainst },
                  { label: "DG", value: teamStats.goalDifference, color: teamStats.goalDifference > 0 ? "text-green-400" : teamStats.goalDifference < 0 ? "text-red-400" : "" },
                  { label: "PTS", value: teamStats.points, color: "text-primary" },
                ].map((s) => (
                  <div key={s.label} className="p-3">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color || ""}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Fixtures */}
        {upcomingFixtures.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pr\u00f3ximos Partidos</h2>
            <div className="space-y-2">
              {upcomingFixtures.map((f) => {
                const isHome = f.homeId === teamId;
                const rivalId = isHome ? f.awayId : f.homeId;
                const rivalSlug = teamIdToSlug[rivalId];
                return (
                  <div key={f.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">F{f.round}</span>
                      <TeamLogo teamId={rivalId} teamName={getTeamName(rivalId)} abbreviation={getTeamAbbr(rivalId)} primaryColor={getTeamColor(rivalId)} size="sm" />
                      {rivalSlug ? (
                        <Link to={`/equipos/${rivalSlug}`} className="text-sm font-medium hover:text-primary">
                          {isHome ? "vs" : "@"} {getTeamName(rivalId)}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">{isHome ? "vs" : "@"} {getTeamName(rivalId)}</span>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {isHome ? "Local" : "Visita"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Results */}
        {recentResults.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resultados Recientes</h2>
            <div className="space-y-2">
              {recentResults.map((f) => {
                const isHome = f.homeId === teamId;
                const rivalId = isHome ? f.awayId : f.homeId;
                const teamGoals = isHome ? f.homeScore : f.awayScore;
                const rivalGoals = isHome ? f.awayScore : f.homeScore;
                const result = teamGoals !== null && rivalGoals !== null
                  ? teamGoals > rivalGoals ? "W" : teamGoals < rivalGoals ? "L" : "D"
                  : null;
                const resultColor = result === "W" ? "text-green-400" : result === "L" ? "text-red-400" : "text-yellow-400";
                const resultBg = result === "W" ? "bg-green-400/10" : result === "L" ? "bg-red-400/10" : "bg-yellow-400/10";
                const rivalSlug = teamIdToSlug[rivalId];
                return (
                  <div key={f.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">F{f.round}</span>
                      <TeamLogo teamId={rivalId} teamName={getTeamName(rivalId)} abbreviation={getTeamAbbr(rivalId)} primaryColor={getTeamColor(rivalId)} size="sm" />
                      {rivalSlug ? (
                        <Link to={`/equipos/${rivalSlug}`} className="text-sm font-medium hover:text-primary">
                          {isHome ? "vs" : "@"} {getTeamName(rivalId)}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">{isHome ? "vs" : "@"} {getTeamName(rivalId)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{teamGoals} - {rivalGoals}</span>
                      {result && (
                        <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${resultColor} ${resultBg}`}>
                          {result}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* All Teams Links */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Todos los Equipos</h2>
          <div className="grid grid-cols-3 gap-2">
            {initialTeams.map((t) => {
              const tSlug = teamIdToSlug[t.id];
              const isActive = t.id === teamId;
              return (
                <Link
                  key={t.id}
                  to={`/equipos/${tSlug}`}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${isActive ? "border-primary bg-primary/10 font-bold" : "border-border hover:border-primary/50"}`}
                >
                  <TeamLogo teamId={t.id} teamName={t.name} abbreviation={t.abbreviation} primaryColor={t.primaryColor} size="xs" />
                  <span className="truncate">{t.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TeamPage;
