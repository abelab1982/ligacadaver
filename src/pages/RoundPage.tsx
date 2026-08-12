import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { ArrowLeft, Calculator } from "lucide-react";
import { Header } from "@/components/Header";
import { Seo, SITE_URL } from "@/components/Seo";
import { TeamLogo } from "@/components/TeamLogo";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { useFixtures } from "@/hooks/useFixtures";
import { initialTeams } from "@/data/teams";
import { teamIdToSlug } from "@/data/teamSlugs";
import fixtureData from "@/data/fixture.json";
import NotFound from "./NotFound";
import {
  TOTAL_ROUNDS,
  buildRoundRoute,
  tournaments,
} from "@/data/seoRoutes.mjs";

/**
 * One page per matchday — the counterpart to the pre-rendered HTML that
 * scripts/prerender.mjs writes for /apertura/fecha-N and /clausura/fecha-N.
 * Without this route React would render the 404 page over that HTML.
 */
interface RoundPageProps {
  tournament: "apertura" | "clausura";
}

const RoundPage = ({ tournament: tournamentSlug }: RoundPageProps) => {
  // The segment is "fecha-15": React Router v6 cannot split that itself, so the
  // whole segment arrives as one param and is parsed here.
  const { round: roundParam } = useParams<{ round: string }>();

  const match = /^fecha-(\d{1,2})$/.exec(roundParam ?? "");
  const round = match ? Number(match[1]) : NaN;
  const tournament = tournaments[tournamentSlug];
  const isValid = Number.isInteger(round) && round >= 1 && round <= TOTAL_ROUNDS;

  const { fixtures } = useFixtures();

  // The Apertura calendar also ships in fixture.json, so the page has something
  // to show before (or without) the network request.
  const localPairings = useMemo(() => {
    if (tournamentSlug !== "apertura") return [];
    const entry = fixtureData.matches.find((m) => m.round === round);
    return entry ? entry.matches : [];
  }, [tournamentSlug, round]);

  const roundMatches = useMemo(() => {
    if (!isValid) return [];
    const live = fixtures.filter(
      (f) => f.round === round && f.tournament === tournament.code
    );
    if (live.length > 0) return live;
    return localPairings.map((m) => ({
      id: m.id,
      round,
      homeId: m.homeId,
      awayId: m.awayId,
      homeScore: null,
      awayScore: null,
      status: "NS" as const,
      isLocked: false,
      kickOff: null,
      tournament: tournament.code as "A" | "C",
      homePrediction: null,
      awayPrediction: null,
    }));
  }, [isValid, fixtures, round, tournament, localPairings]);

  // An out-of-range matchday is a genuine 404, not a redirect to the home page:
  // a soft-404 would get the URL indexed as a duplicate of the calculator.
  if (!isValid) return <NotFound />;

  const seo = buildRoundRoute(tournamentSlug, round, localPairings);
  const team = (id: string) => initialTeams.find((t) => t.id === id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `Fecha ${round} - ${tournament.label} 2026`,
    description: seo.description,
    url: `${SITE_URL}${seo.path}`,
    superEvent: { "@type": "SportsOrganization", name: "Liga 1", url: SITE_URL },
  };

  const otherSlug = tournamentSlug === "apertura" ? "clausura" : "apertura";

  return (
    <div className="h-full overflow-y-auto bg-background">
      <Seo
        title={seo.title}
        description={seo.description}
        path={seo.path}
        jsonLd={jsonLd}
      />
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> Volver a la calculadora
        </Link>

        <h1 className="text-2xl font-bold">{seo.heading}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-5">{seo.intro}</p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 text-primary px-3 py-2 text-sm font-medium hover:bg-primary/20 transition-colors mb-6"
        >
          <Calculator className="w-4 h-4" />
          Simular esta fecha en la calculadora
        </Link>

        <ul className="space-y-2">
          {roundMatches.map((match) => {
            const home = team(match.homeId);
            const away = team(match.awayId);
            const played = match.status !== "NS";
            return (
              <li
                key={match.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2.5"
              >
                <div className="flex-1 flex items-center gap-2 justify-end min-w-0 text-right">
                  <Link
                    to={`/equipos/${teamIdToSlug[match.homeId] ?? ""}`}
                    className="text-sm leading-tight hover:text-primary transition-colors"
                  >
                    {home?.name ?? match.homeId}
                  </Link>
                  {home && (
                    <TeamLogo
                      teamId={home.id}
                      teamName={home.name}
                      abbreviation={home.abbreviation}
                      primaryColor={home.primaryColor}
                      size="sm"
                    />
                  )}
                </div>

                <div className="flex flex-col items-center gap-0.5 w-16 shrink-0">
                  <span className="font-bold tabular-nums">
                    {played ? `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}` : "vs"}
                  </span>
                  <MatchStatusBadge status={match.status} />
                </div>

                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {away && (
                    <TeamLogo
                      teamId={away.id}
                      teamName={away.name}
                      abbreviation={away.abbreviation}
                      primaryColor={away.primaryColor}
                      size="sm"
                    />
                  )}
                  <Link
                    to={`/equipos/${teamIdToSlug[match.awayId] ?? ""}`}
                    className="text-sm leading-tight hover:text-primary transition-colors"
                  >
                    {away?.name ?? match.awayId}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        {roundMatches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no está publicado el calendario de esta fecha.
          </p>
        )}

        <nav aria-label={`Fechas del ${tournament.label}`} className="mt-8">
          <h2 className="text-sm font-semibold mb-2">
            Todas las fechas del {tournament.label}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                to={`/${tournamentSlug}/fecha-${n}`}
                aria-current={n === round ? "page" : undefined}
                className={`rounded px-2 py-1 text-xs border transition-colors ${
                  n === round
                    ? "border-primary text-primary bg-primary/10 font-semibold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </Link>
            ))}
          </div>
          <Link
            to={`/${otherSlug}/fecha-1`}
            className="inline-block mt-3 text-xs text-primary hover:underline"
          >
            Ver las fechas del {tournaments[otherSlug].label}
          </Link>
        </nav>
      </main>
    </div>
  );
};

export default RoundPage;
