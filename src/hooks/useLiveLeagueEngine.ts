import { useState, useCallback, useMemo } from "react";
import { Team, initialTeams } from "@/data/teams";
import { useFixtures, Fixture, MatchStatus } from "./useFixtures";

export type LegacyMatchStatus = "played" | "pending";

export interface Match {
  id: string;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: LegacyMatchStatus;
  homePrediction: number | null;
  awayPrediction: number | null;
  isLocked: boolean;
  liveStatus: MatchStatus;
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
  apiTeamId: number;
}

// Convert Supabase fixture to Match format
const fixtureToMatch = (fixture: Fixture): Match => {
  // Determine legacy status based on live status
  // FT = played (official result)
  // LIVE = treat as played for display but scores might change
  // NS = pending (allow predictions)
  const isOfficial = fixture.status === "FT" || fixture.status === "LIVE";
  
  return {
    id: fixture.id,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    status: isOfficial ? "played" : "pending",
    homePrediction: fixture.homePrediction,
    awayPrediction: fixture.awayPrediction,
    isLocked: fixture.isLocked,
    liveStatus: fixture.status,
  };
};

// Calculate team stats from fixtures
const calculateTeamStats = (team: Team, fixtures: Fixture[], predictions: Map<string, { home: number | null; away: number | null }>) => {
  let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;
  let pPlayed = 0, pWon = 0, pDrawn = 0, pLost = 0, pGoalsFor = 0, pGoalsAgainst = 0;

  fixtures.forEach((fixture) => {
    const isHome = fixture.homeId === team.id;
    const isAway = fixture.awayId === team.id;
    if (!isHome && !isAway) return;

    // Official results: FT matches count as played
    if (fixture.status === "FT" && fixture.homeScore !== null && fixture.awayScore !== null) {
      const tg = isHome ? fixture.homeScore : fixture.awayScore;
      const og = isHome ? fixture.awayScore : fixture.homeScore;
      played++; goalsFor += tg; goalsAgainst += og;
      if (tg > og) won++; else if (tg < og) lost++; else drawn++;
      // Also add to predicted stats
      pPlayed++; pGoalsFor += tg; pGoalsAgainst += og;
      if (tg > og) pWon++; else if (tg < og) pLost++; else pDrawn++;
    }
    
    // LIVE matches: include in current standings
    else if (fixture.status === "LIVE" && fixture.homeScore !== null && fixture.awayScore !== null) {
      const tg = isHome ? fixture.homeScore : fixture.awayScore;
      const og = isHome ? fixture.awayScore : fixture.homeScore;
      played++; goalsFor += tg; goalsAgainst += og;
      if (tg > og) won++; else if (tg < og) lost++; else drawn++;
      // Also add to predicted stats
      pPlayed++; pGoalsFor += tg; pGoalsAgainst += og;
      if (tg > og) pWon++; else if (tg < og) pLost++; else pDrawn++;
    }
    
    // Pending matches with predictions: only affect predicted stats
    else if (fixture.status === "NS") {
      const prediction = predictions.get(fixture.id);
      if (prediction && prediction.home !== null && prediction.away !== null) {
        const tg = isHome ? prediction.home : prediction.away;
        const og = isHome ? prediction.away : prediction.home;
        pPlayed++; pGoalsFor += tg; pGoalsAgainst += og;
        if (tg > og) pWon++; else if (tg < og) pLost++; else pDrawn++;
      }
    }
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
    // 4. Fair Play (lower is better)
    if (a.fairPlay !== b.fairPlay) return a.fairPlay - b.fairPlay;
    // 5. Alphabetical
    return a.name.localeCompare(b.name);
  });
};

export const useLiveLeagueEngine = () => {
  const { fixtures, loading, error, totalRounds, refetch } = useFixtures();
  
  // Local predictions state (client-side only)
  const [predictions, setPredictions] = useState<Map<string, { home: number | null; away: number | null }>>(new Map());
  const [currentRound, setCurrentRound] = useState(1);
  const [showPredictions, setShowPredictions] = useState(true);
  const [fairPlayScores, setFairPlayScores] = useState<Record<string, number>>(() => 
    Object.fromEntries(initialTeams.map(t => [t.id, 0]))
  );

  // Calculate team stats based on fixtures and predictions
  const teams = useMemo(() => {
    const stats = initialTeams.map((t) => ({ 
      ...t, 
      ...calculateTeamStats(t, fixtures, predictions),
      fairPlay: fairPlayScores[t.id] || 0,
    }));
    return sortTeams(stats, showPredictions);
  }, [fixtures, predictions, showPredictions, fairPlayScores]);

  // Convert fixtures to Match format for FixtureView compatibility
  const getMatchesByRound = useCallback((round: number): Match[] => {
    return fixtures
      .filter(f => f.round === round)
      .map(f => {
        const prediction = predictions.get(f.id);
        return {
          ...fixtureToMatch(f),
          homePrediction: prediction?.home ?? null,
          awayPrediction: prediction?.away ?? null,
        };
      });
  }, [fixtures, predictions]);

  // Update prediction
  const updatePrediction = useCallback((matchId: string, homePrediction: number | null, awayPrediction: number | null) => {
    setPredictions(prev => {
      const next = new Map(prev);
      next.set(matchId, { home: homePrediction, away: awayPrediction });
      return next;
    });
  }, []);

  // Reset all predictions
  const resetPredictions = useCallback(() => {
    setPredictions(new Map());
  }, []);

  // Fair play updates
  const updateFairPlay = useCallback((teamId: string, value: number) => {
    setFairPlayScores(prev => ({ ...prev, [teamId]: Math.max(0, value) }));
  }, []);

  const resetFairPlay = useCallback(() => {
    setFairPlayScores(Object.fromEntries(initialTeams.map(t => [t.id, 0])));
  }, []);

  // Get team by ID
  const getTeamById = useCallback((id: string) => teams.find((t) => t.id === id), [teams]);

  // Confirm result (no-op since results come from Supabase)
  const confirmMatchResult = useCallback((_matchId: string, _homeScore: number, _awayScore: number) => {
    // Results are managed by Supabase, this is a no-op for compatibility
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    let totalGoals = 0;
    const roundsWithActivity = new Set<number>();
    
    fixtures.forEach((fixture) => {
      // Count official results (FT)
      if (fixture.status === "FT" && fixture.homeScore !== null && fixture.awayScore !== null) {
        totalGoals += fixture.homeScore + fixture.awayScore;
        roundsWithActivity.add(fixture.round);
      }
      // Count LIVE matches
      else if (fixture.status === "LIVE" && fixture.homeScore !== null && fixture.awayScore !== null) {
        totalGoals += fixture.homeScore + fixture.awayScore;
        roundsWithActivity.add(fixture.round);
      }
      // Count predictions for pending matches
      else if (fixture.status === "NS") {
        const prediction = predictions.get(fixture.id);
        if (prediction && prediction.home !== null && prediction.away !== null) {
          totalGoals += prediction.home + prediction.away;
          roundsWithActivity.add(fixture.round);
        }
      }
    });
    
    const roundsPlayed = roundsWithActivity.size;
    
    return { 
      totalMatches: 306, 
      roundsPlayed,
      totalGoals, 
      averageGoals: roundsPlayed > 0 ? (totalGoals / roundsPlayed).toFixed(2) : "0.00" 
    };
  }, [fixtures, predictions]);

  return {
    fixtures,
    teams,
    currentRound,
    totalRounds: totalRounds || 17,
    showPredictions,
    stats,
    loading,
    error,
    setCurrentRound,
    setShowPredictions,
    updatePrediction,
    confirmMatchResult,
    resetPredictions,
    getTeamById,
    getMatchesByRound,
    updateFairPlay,
    resetFairPlay,
    refetch,
  };
};
