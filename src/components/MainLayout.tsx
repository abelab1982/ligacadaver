import { motion } from "framer-motion";
import { Calendar, Trophy, Share2, Loader2, BarChart } from "lucide-react";
import { Header } from "./Header";
import { FixtureView } from "./FixtureView";
import { StandingsView } from "./StandingsView";
import { ShareDialog } from "./ShareDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLiveLeagueEngine, TournamentTab } from "@/hooks/useLiveLeagueEngine";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useOdds } from "@/hooks/useOdds";
import { initialTeams } from "@/data/teams";
import { Seo } from "@/components/Seo";
import { staticRoutes, homeFaq, SITE_URL } from "@/data/seoRoutes.mjs";
import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trackShareClick } from "@/lib/gtm";

type MobileView = "fixture" | "tabla";

const tournamentLabels: Record<TournamentTab, string> = {
  A: "Apertura",
  C: "Clausura",
  ACC: "Acumulada",
};

const homeRoute = staticRoutes.find((route) => route.path === "/");

/** Stable team ordering for the simulation, independent of the live table order. */
const simulationTeamIds = initialTeams.map((team) => team.id);

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Calculadora Liga 1 2026",
    url: SITE_URL,
    applicationCategory: "SportsApplication",
    operatingSystem: "Any",
    inLanguage: "es-PE",
    offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homeFaq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
];

export const MainLayout = () => {
  const [mobileView, setMobileView] = useState<MobileView>("fixture");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const appConfig = useAppConfig();

  const {
    teams,
    currentRound,
    totalRounds,
    showPredictions,
    stats,
    loading,
    error,
    activeTournament,
    setActiveTournament,
    setCurrentRound,
    setShowPredictions,
    updatePrediction,
    confirmMatchResult,
    resetPredictions,
    getTeamById,
    getMatchesByRound,
    getTeamsByTournament,
    getStatsByTournament,
    updateFairPlay,
    fixtures,
    aperturaFixtures,
    clausuraFixtures,
    predictions,
  } = useLiveLeagueEngine({
    defaultRoundA: appConfig.defaultRoundA,
    defaultRoundC: appConfig.defaultRoundC,
  });

  const currentMatches = getMatchesByRound(currentRound);

  // The odds always describe the table on screen; team strength is rated from
  // the whole season so a freshly-started Clausura still has real ratings.
  const scopedFixtures = useMemo(() => {
    if (activeTournament === "A") return aperturaFixtures;
    if (activeTournament === "C") return clausuraFixtures;
    return fixtures;
  }, [activeTournament, aperturaFixtures, clausuraFixtures, fixtures]);

  const { odds, simulatedMatches, computing: oddsComputing } = useOdds({
    teamIds: simulationTeamIds,
    fixtures: scopedFixtures,
    strengthFixtures: fixtures,
    predictions,
    enabled: !loading && !error,
  });

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando fixtures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-destructive font-medium">Error al cargar datos</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const fixtureLabel = activeTournament === 'ACC' ? 'Fixture - Apertura' : `Fixture - ${tournamentLabels[activeTournament]}`;
  const standingsLabel = activeTournament === 'ACC' ? 'Tabla Acumulada' : `Tabla - ${tournamentLabels[activeTournament]}`;

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <Seo
        title={homeRoute?.title ?? "Calculadora Liga 1 2026"}
        description={homeRoute?.description ?? ""}
        path="/"
        jsonLd={homeJsonLd}
      />
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-screen">
        <Header />

        {/* The app shell is all tabs and tables, so the page heading lives here
            for screen readers and for the document outline crawlers build. */}
        <h1 className="sr-only">
          Calculadora Liga 1 2026: tabla de posiciones del Apertura, Clausura y acumulada
        </h1>

        {/* Tournament Tabs */}
        <div className="border-b border-border bg-card/50">
          <Tabs value={activeTournament} onValueChange={(v) => setActiveTournament(v as TournamentTab)} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-10 bg-transparent rounded-none">
              <TabsTrigger 
                value="A" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-1 text-xs md:text-sm"
              >
                <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Apertura
              </TabsTrigger>
              <TabsTrigger 
                value="C"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-1 text-xs md:text-sm"
              >
                <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Clausura
              </TabsTrigger>
              <TabsTrigger 
                value="ACC"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-1 text-xs md:text-sm"
              >
                <BarChart className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Acumulada
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile Sub-Tabs (Fixture/Tabla) - Only visible on mobile */}
        <div className="md:hidden border-b border-border bg-card/30">
          <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as MobileView)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-10 bg-transparent rounded-none">
              <TabsTrigger 
                value="fixture" 
                className="data-[state=active]:bg-muted/50 data-[state=active]:text-foreground rounded-none border-b border-transparent data-[state=active]:border-muted-foreground/30 gap-1.5 text-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                Fixture
              </TabsTrigger>
              <TabsTrigger 
                value="tabla"
                className="data-[state=active]:bg-muted/50 data-[state=active]:text-foreground rounded-none border-b border-transparent data-[state=active]:border-muted-foreground/30 gap-1.5 text-xs"
              >
                <Trophy className="w-3.5 h-3.5" />
                Tabla
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop: Split View */}
          <div className="hidden md:flex flex-1">
            {/* Left Panel - Fixture */}
            <div className="w-1/2 border-r border-border flex flex-col">
              <div className="px-4 py-3 border-b border-border bg-card/30 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">{fixtureLabel}</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                {activeTournament !== 'ACC' ? (
                  <FixtureView 
                    matches={currentMatches}
                    currentRound={currentRound}
                    totalRounds={totalRounds}
                    onRoundChange={setCurrentRound}
                    onUpdatePrediction={updatePrediction}
                    onConfirmResult={confirmMatchResult}
                    getTeamById={getTeamById}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                    <div>
                      <BarChart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p>La tabla acumulada suma los resultados de Apertura y Clausura.</p>
                      <p className="mt-1 text-xs">Selecciona Apertura o Clausura para ver el fixture.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Standings */}
            <div className="w-1/2 flex flex-col">
              <div className="px-4 py-3 border-b border-border bg-card/30 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">{standingsLabel}</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <StandingsView 
                  teams={teams}
                  showPredictions={showPredictions}
                  onTogglePredictions={() => setShowPredictions(!showPredictions)}
                  onReset={resetPredictions}
                  onResetPredictions={resetPredictions}
                  stats={stats}
                  odds={odds}
                  simulatedMatches={simulatedMatches}
                  oddsComputing={oddsComputing}
                />
              </div>
            </div>
          </div>

          {/* Mobile: Tab Content */}
          <div className="md:hidden flex-1 overflow-hidden">
            {mobileView === "fixture" ? (
              <motion.div
                key={`fixture-${activeTournament}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                {activeTournament !== 'ACC' ? (
                  <FixtureView 
                    matches={currentMatches}
                    currentRound={currentRound}
                    totalRounds={totalRounds}
                    onRoundChange={setCurrentRound}
                    onUpdatePrediction={updatePrediction}
                    onConfirmResult={confirmMatchResult}
                    getTeamById={getTeamById}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                    <div>
                      <BarChart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p>Selecciona Apertura o Clausura para ver el fixture.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`tabla-${activeTournament}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <StandingsView 
                  teams={teams}
                  showPredictions={showPredictions}
                  onTogglePredictions={() => setShowPredictions(!showPredictions)}
                  onReset={resetPredictions}
                  onResetPredictions={resetPredictions}
                  stats={stats}
                  odds={odds}
                  simulatedMatches={simulatedMatches}
                  oddsComputing={oddsComputing}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Floating Action Button - Share */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
                className="fixed bottom-6 right-6 z-50"
              >
                <Button
                  size="lg"
                  className="w-14 h-14 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                  onClick={() => {
                    trackShareClick("fab_button");
                    setShareDialogOpen(true);
                  }}
                >
                  <Share2 className="w-6 h-6" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Compartir Tabla</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Share Dialog */}
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          teams={teams}
          showPredictions={showPredictions}
        />
      </div>
    </div>
  );
};
