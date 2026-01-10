import { motion } from "framer-motion";
import { Calendar, Trophy } from "lucide-react";
import { Header } from "./Header";
import { FixtureView } from "./FixtureView";
import { StandingsView } from "./StandingsView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeagueEngine } from "@/hooks/useLeagueEngine";
import { useState } from "react";

type ViewType = "fixture" | "tabla";

export const MainLayout = () => {
  const [activeTab, setActiveTab] = useState<ViewType>("tabla");
  
  const {
    teams,
    currentRound,
    totalRounds,
    showPredictions,
    stats,
    setCurrentRound,
    setShowPredictions,
    updatePrediction,
    confirmMatchResult,
    resetPredictions,
    getTeamById,
    getMatchesByRound,
  } = useLeagueEngine();

  const currentMatches = getMatchesByRound(currentRound);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-screen">
        <Header />

        {/* Mobile Tabs - Only visible on mobile */}
        <div className="md:hidden border-b border-border bg-card/50">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewType)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-12 bg-transparent rounded-none">
              <TabsTrigger 
                value="fixture" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
              >
                <Calendar className="w-4 h-4" />
                Fixture
              </TabsTrigger>
              <TabsTrigger 
                value="tabla"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
              >
                <Trophy className="w-4 h-4" />
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
                <h2 className="font-semibold">Fixture</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <FixtureView 
                  matches={currentMatches}
                  currentRound={currentRound}
                  totalRounds={totalRounds}
                  onRoundChange={setCurrentRound}
                  onUpdatePrediction={updatePrediction}
                  onConfirmResult={confirmMatchResult}
                  getTeamById={getTeamById}
                />
              </div>
            </div>

            {/* Right Panel - Standings */}
            <div className="w-1/2 flex flex-col">
              <div className="px-4 py-3 border-b border-border bg-card/30 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Tabla de Posiciones</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <StandingsView 
                  teams={teams}
                  showPredictions={showPredictions}
                  onTogglePredictions={() => setShowPredictions(!showPredictions)}
                  onReset={resetPredictions}
                  onResetPredictions={resetPredictions}
                  stats={stats}
                />
              </div>
            </div>
          </div>

          {/* Mobile: Tab Content */}
          <div className="md:hidden flex-1 overflow-hidden">
            {activeTab === "fixture" ? (
              <motion.div
                key="fixture"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <FixtureView 
                  matches={currentMatches}
                  currentRound={currentRound}
                  totalRounds={totalRounds}
                  onRoundChange={setCurrentRound}
                  onUpdatePrediction={updatePrediction}
                  onConfirmResult={confirmMatchResult}
                  getTeamById={getTeamById}
                />
              </motion.div>
            ) : (
              <motion.div
                key="tabla"
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
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
