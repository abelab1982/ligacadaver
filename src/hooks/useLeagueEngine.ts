import { useState, useCallback, useMemo } from "react";
import { Team, initialTeams } from "@/data/teams";
import fixtureData from "@/data/fixture.json";

export type MatchStatus = "played" | "pending";

export interface Match {
  id: string;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  homePrediction?: number | null;
  awayPrediction?: number | null;
}

export interface Round {
  round: number;
  matches: Match[];
}

export interface TeamStats extends Team {
  points: number;
  goalDifference: number;
  predictedPlayed: number;
  predictedWon: number;
  predictedDrawn: number;
  predictedLost: number;
  predictedGoalsFor: number;
  predictedGoalsAgainst: number;
  predictedPoints: number;
  predictedGoalDifference: number;
  fairPlay: number;
}

const calculateTeamStats = (team: Team, rounds: Round[]) => {
  let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;
  let pPlayed = 0, pWon = 0, pDrawn = 0, pLost = 0, pGoalsFor = 0, pGoalsAgainst = 0;

  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      const isHome = match.homeId === team.id;
      const isAway = match.awayId === team.id;
      if (!isHome && !isAway) return;

      if (match.status === "played" && match.homeScore !== null && match.awayScore !== null) {
        const tg = isHome ? match.homeScore : match.awayScore;
        const og = isHome ? match.awayScore : match.homeScore;
        played++; goalsFor += tg; goalsAgainst += og;
        if (tg > og) won++; else if (tg < og) lost++; else drawn++;
        pPlayed++; pGoalsFor += tg; pGoalsAgainst += og;
        if (tg > og) pWon++; else if (tg < og) pLost++; else pDrawn++;
      }
      
      if (match.status === "pending" && match.homePrediction != null && match.awayPrediction != null) {
        const tg = isHome ? match.homePrediction : match.awayPrediction;
        const og = isHome ? match.awayPrediction : match.homePrediction;
        pPlayed++; pGoalsFor += tg; pGoalsAgainst += og;
        if (tg > og) pWon++; else if (tg < og) pLost++; else pDrawn++;
      }
    });
  });

  return {
    played, won, drawn, lost, goalsFor, goalsAgainst,
    points: won * 3 + drawn,
    goalDifference: goalsFor - goalsAgainst,
    predictedPlayed: pPlayed, predictedWon: pWon, predictedDrawn: pDrawn, predictedLost: pLost,
    predictedGoalsFor: pGoalsFor, predictedGoalsAgainst: pGoalsAgainst,
    predictedPoints: pWon * 3 + pDrawn,
    predictedGoalDifference: pGoalsFor - pGoalsAgainst,
  };
};

const sortTeams = (teams: TeamStats[], usePredictions: boolean): TeamStats[] => {
  return [...teams].sort((a, b) => {
    const aP = usePredictions ? a.predictedPoints : a.points;
    const bP = usePredictions ? b.predictedPoints : b.points;
    const aGD = usePredictions ? a.predictedGoalDifference : a.goalDifference;
    const bGD = usePredictions ? b.predictedGoalDifference : b.goalDifference;
    const aGF = usePredictions ? a.predictedGoalsFor : a.goalsFor;
    const bGF = usePredictions ? b.predictedGoalsFor : b.goalsFor;
    // 1. Points
    if (bP !== aP) return bP - aP;
    // 2. Goal Difference
    if (bGD !== aGD) return bGD - aGD;
    // 3. Goals For
    if (bGF !== aGF) return bGF - aGF;
    // 4. Fair Play (lower is better - fewer cards)
    if (a.fairPlay !== b.fairPlay) return a.fairPlay - b.fairPlay;
    // 5. Alphabetical
    return a.name.localeCompare(b.name);
  });
};

export const useLeagueEngine = () => {
  const [rounds, setRounds] = useState<Round[]>(() =>
    fixtureData.matches.map((r) => ({
      round: r.round,
      matches: r.matches.map((m) => ({ ...m, status: m.status as MatchStatus, homePrediction: null, awayPrediction: null })),
    }))
  );
  const [currentRound, setCurrentRound] = useState(1);
  const [showPredictions, setShowPredictions] = useState(true);
  const [fairPlayScores, setFairPlayScores] = useState<Record<string, number>>(() => 
    Object.fromEntries(initialTeams.map(t => [t.id, 0]))
  );

  const teams = useMemo(() => {
    const stats = initialTeams.map((t) => ({ 
      ...t, 
      ...calculateTeamStats(t, rounds),
      fairPlay: fairPlayScores[t.id] || 0,
    }));
    return sortTeams(stats, showPredictions);
  }, [rounds, showPredictions, fairPlayScores]);

  const updateFairPlay = useCallback((teamId: string, value: number) => {
    setFairPlayScores(prev => ({ ...prev, [teamId]: Math.max(0, value) }));
  }, []);

  const updatePrediction = useCallback((matchId: string, homePrediction: number | null, awayPrediction: number | null) => {
    setRounds((prev) => prev.map((r) => ({ ...r, matches: r.matches.map((m) => m.id === matchId ? { ...m, homePrediction, awayPrediction } : m) })));
  }, []);

  const confirmMatchResult = useCallback((matchId: string, homeScore: number, awayScore: number) => {
    setRounds((prev) => prev.map((r) => ({ ...r, matches: r.matches.map((m) => m.id === matchId ? { ...m, homeScore, awayScore, status: "played" as MatchStatus, homePrediction: null, awayPrediction: null } : m) })));
  }, []);

  const resetPredictions = useCallback(() => {
    setRounds((prev) => prev.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m, homePrediction: null, awayPrediction: null })) })));
  }, []);

  const resetFairPlay = useCallback(() => {
    setFairPlayScores(Object.fromEntries(initialTeams.map(t => [t.id, 0])));
  }, []);

  const getTeamById = useCallback((id: string) => teams.find((t) => t.id === id), [teams]);
  const getMatchesByRound = useCallback((n: number) => rounds.find((r) => r.round === n)?.matches || [], [rounds]);

  const stats = useMemo(() => {
    let totalGoals = 0;
    let roundsWithMatches = 0;
    
    rounds.forEach((r) => {
      // Count if any match in this round has a result (played or predicted)
      const hasPlayedMatches = r.matches.some((m) => 
        (m.status === "played" && m.homeScore != null && m.awayScore != null) ||
        (m.homePrediction != null && m.awayPrediction != null)
      );
      
      if (hasPlayedMatches) {
        roundsWithMatches++;
      }
      
      // Sum goals from played and predicted matches
      r.matches.forEach((m) => {
        if (m.status === "played" && m.homeScore != null && m.awayScore != null) {
          totalGoals += m.homeScore + m.awayScore;
        } else if (m.homePrediction != null && m.awayPrediction != null) {
          totalGoals += m.homePrediction + m.awayPrediction;
        }
      });
    });
    
    return { 
      totalMatches: 306, 
      roundsPlayed: roundsWithMatches,
      totalGoals, 
      averageGoals: roundsWithMatches > 0 ? (totalGoals / roundsWithMatches).toFixed(2) : "0.00" 
    };
  }, [rounds]);

  return { 
    rounds, teams, currentRound, totalRounds: fixtureData.totalRounds, showPredictions, stats, 
    setCurrentRound, setShowPredictions, updatePrediction, confirmMatchResult, resetPredictions, 
    getTeamById, getMatchesByRound, updateFairPlay, resetFairPlay 
  };
};
