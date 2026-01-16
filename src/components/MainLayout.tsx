import { motion } from "framer-motion";
import { Calendar, Trophy, Share2 } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FixtureView } from "./FixtureView";
import { StandingsView } from "./StandingsView";
import { ShareDialog } from "./ShareDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLeagueEngine } from "@/hooks/useLeagueEngine";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trackShareClick } from "@/lib/gtm";

type ViewType = "fixture" | "tabla";

export const MainLayout = () => {
  const [activeTab, setActiveTab] = useState<ViewType>("fixture");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
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
    updateFairPlay,
  } = useLeagueEngine();

  const currentMatches = getMatchesByRound(currentRound);

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
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
                Fixture - Apertura
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
                <h2 className="font-semibold">Fixture - Apertura</h2>
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
                <h2 className="font-semibold">Tabla de Posiciones - Apertura</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <StandingsView 
                  teams={teams}
                  showPredictions={showPredictions}
                  onTogglePredictions={() => setShowPredictions(!showPredictions)}
                  onReset={resetPredictions}
                  onResetPredictions={resetPredictions}
                  onUpdateFairPlay={updateFairPlay}
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
                  onUpdateFairPlay={updateFairPlay}
                  stats={stats}
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
