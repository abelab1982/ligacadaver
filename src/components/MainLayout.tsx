import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Trophy } from "lucide-react";
import { Team, initialTeams } from "@/data/teams";
import { Header } from "./Header";
import { FixtureView } from "./FixtureView";
import { StandingsView } from "./StandingsView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewType = "fixture" | "tabla";

export const MainLayout = () => {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [activeTab, setActiveTab] = useState<ViewType>("tabla");

  const handleUpdateTeam = (id: string, field: keyof Team, value: number) => {
    setTeams(prev => prev.map(team => 
      team.id === id ? { ...team, [field]: value } : team
    ));
  };

  const handleMatchResult = (homeId: string, awayId: string, homeScore: number, awayScore: number) => {
    setTeams(prev => prev.map(team => {
      if (team.id === homeId) {
        const won = homeScore > awayScore ? 1 : 0;
        const drawn = homeScore === awayScore ? 1 : 0;
        const lost = homeScore < awayScore ? 1 : 0;
        return {
          ...team,
          played: team.played + 1,
          won: team.won + won,
          drawn: team.drawn + drawn,
          lost: team.lost + lost,
          goalsFor: team.goalsFor + homeScore,
          goalsAgainst: team.goalsAgainst + awayScore,
        };
      }
      if (team.id === awayId) {
        const won = awayScore > homeScore ? 1 : 0;
        const drawn = homeScore === awayScore ? 1 : 0;
        const lost = awayScore < homeScore ? 1 : 0;
        return {
          ...team,
          played: team.played + 1,
          won: team.won + won,
          drawn: team.drawn + drawn,
          lost: team.lost + lost,
          goalsFor: team.goalsFor + awayScore,
          goalsAgainst: team.goalsAgainst + homeScore,
        };
      }
      return team;
    }));
  };

  const handleReset = () => {
    setTeams(initialTeams);
  };

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
                <FixtureView teams={teams} onMatchResult={handleMatchResult} />
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
                  onUpdateTeam={handleUpdateTeam} 
                  onReset={handleReset} 
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
                <FixtureView teams={teams} onMatchResult={handleMatchResult} />
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
                  onUpdateTeam={handleUpdateTeam} 
                  onReset={handleReset} 
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
