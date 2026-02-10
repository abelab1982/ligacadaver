import { useState, useCallback, useMemo } from "react";
import { Team, initialTeams } from "@/data/teams";
import { useFixtures, Fixture, MatchStatus, TournamentType } from "./useFixtures";
import fixtureData from "@/data/fixture.json";

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

// Interface for JSON fixture match
interface JsonMatch {
  id: string;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

// Convert Supabase fixture to internal Fixture format
const dbFixtureToFixture = (fixture: Fixture): Fixture => fixture;

// Convert JSON match to internal Fixture format
const jsonMatchToFixture = (match: JsonMatch, round: number, tournament: TournamentType = 'A'): Fixture => ({
  id: match.id,
  round,
  homeId: match.homeId,
  awayId: match.awayId,
  homeScore: null,
  awayScore: null,
  status: "NS" as MatchStatus,
  isLocked: false,
  kickOff: null,
  tournament,
  homePrediction: null,
  awayPrediction: null,
});

// Convert fixture to Match format for FixtureView compatibility
const fixtureToMatch = (fixture: Fixture): Match => {
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

// Merge Supabase fixtures with local JSON fixtures (Apertura only)
// Clausura comes entirely from DB
const mergeFixtures = (supabaseFixtures: Fixture[]): Fixture[] => {
  const aperturaDbFixtures = supabaseFixtures.filter(f => f.tournament === 'A');
  const clausuraDbFixtures = supabaseFixtures.filter(f => f.tournament === 'C');
  
  // Create lookup maps for Apertura Supabase fixtures
  const supabaseByCompositeKey = new Map<string, Fixture>();
  const supabaseById = new Map<string, Fixture>();
  
  aperturaDbFixtures.forEach(f => {
    const compositeKey = `${f.homeId.toLowerCase()}-${f.awayId.toLowerCase()}-${f.round}`;
    supabaseByCompositeKey.set(compositeKey, f);
    supabaseById.set(f.id, f);
  });
  
  const mergedFixtures: Fixture[] = [];
  const usedSupabaseIds = new Set<string>();
  
  // First pass: match JSON fixtures with Supabase Apertura data
  fixtureData.matches.forEach(roundData => {
    roundData.matches.forEach((match: JsonMatch) => {
      const compositeKey = `${match.homeId.toLowerCase()}-${match.awayId.toLowerCase()}-${roundData.round}`;
      const supabaseMatch = supabaseByCompositeKey.get(compositeKey) || supabaseById.get(match.id);
      
      if (supabaseMatch) {
        mergedFixtures.push(dbFixtureToFixture(supabaseMatch));
        usedSupabaseIds.add(supabaseMatch.id);
      } else {
        mergedFixtures.push(jsonMatchToFixture(match, roundData.round, 'A'));
      }
    });
  });
  
  // Second pass: add any Apertura Supabase fixtures not in JSON
  aperturaDbFixtures.forEach(f => {
    if (!usedSupabaseIds.has(f.id)) {
      mergedFixtures.push(dbFixtureToFixture(f));
    }
  });
  
  // Add all Clausura fixtures from DB directly (no JSON fallback needed)
  clausuraDbFixtures.forEach(f => {
    mergedFixtures.push(dbFixtureToFixture(f));
  });
  
  return mergedFixtures;
};

// Calculate team stats from fixtures
const calculateTeamStats = (team: Team, fixtures: Fixture[], predictions: Map<string, { home: number | null; away: number | null }>) => {
  let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;
  let pPlayed = 0, pWon = 0, pDrawn = 0, pLost = 0, pGoalsFor = 0, pGoalsAgainst = 0;

  fixtures.forEach((fixture) => {
    const isHome = fixture.homeId === team.id;
    const isAway = fixture.awayId === team.id;
    if (!isHome && !isAway) return;

    if (fixture.status === "FT" && fixture.homeScore !== null && fixture.awayScore !== null) {
      const tg = isHome ? fixture.homeScore : fixture.awayScore;
      const og = isHome ? fixture.awayScore : fixture.homeScore;
      played++; goalsFor += tg; goalsAgainst += og;
      if (tg > og) won++; else if (tg < og) lost++; else drawn++;
      pPlayed++; pGoalsFor += tg; pGoalsAgainst += og;
      if (tg > og) pWon++; else if (tg < og) pLost++; else pDrawn++;
    }
    else if (fixture.status === "LIVE" && fixture.homeScore !== null && fixture.awayScore !== null) {
      const tg = isHome ? fixture.homeScore : fixture.awayScore;
      const og = isHome ? fixture.awayScore : fixture.homeScore;
      played++; goalsFor += tg; goalsAgainst += og;
      if (tg > og) won++; else if (tg < og) lost++; else drawn++;
      pPlayed++; pGoalsFor += tg; pGoalsAgainst += og;
      if (tg > og) pWon++; else if (tg < og) pLost++; else pDrawn++;
    }
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
    if (bP !== aP) return bP - aP;
    if (bGD !== aGD) return bGD - aGD;
    if (bGF !== aGF) return bGF - aGF;
    return a.name.localeCompare(b.name);
  });
};

// Calculate stats for a set of fixtures
const calculateStats = (fixtures: Fixture[], predictions: Map<string, { home: number | null; away: number | null }>) => {
  let totalGoals = 0;
  const roundsWithActivity = new Set<number>();
  
  fixtures.forEach((fixture) => {
    if (fixture.status === "FT" && fixture.homeScore !== null && fixture.awayScore !== null) {
      totalGoals += fixture.homeScore + fixture.awayScore;
      roundsWithActivity.add(fixture.round);
    } else if (fixture.status === "LIVE" && fixture.homeScore !== null && fixture.awayScore !== null) {
      totalGoals += fixture.homeScore + fixture.awayScore;
      roundsWithActivity.add(fixture.round);
    } else if (fixture.status === "NS") {
      const prediction = predictions.get(fixture.id);
      if (prediction && prediction.home !== null && prediction.away !== null) {
        totalGoals += prediction.home + prediction.away;
        roundsWithActivity.add(fixture.round);
      }
    }
  });
  
  const roundsPlayed = roundsWithActivity.size;
  return { 
    totalMatches: fixtures.length, 
    roundsPlayed,
    totalGoals, 
    averageGoals: roundsPlayed > 0 ? (totalGoals / roundsPlayed).toFixed(2) : "0.00" 
  };
};

export type TournamentTab = "A" | "C" | "ACC";

export const useLiveLeagueEngine = () => {
  const { fixtures: supabaseFixtures, loading, error, refetch } = useFixtures();
  
  // Merge Supabase fixtures with local JSON (Supabase wins when both exist)
  const allFixtures = useMemo(() => {
    return mergeFixtures(supabaseFixtures);
  }, [supabaseFixtures]);

  // Split fixtures by tournament
  const aperturaFixtures = useMemo(() => allFixtures.filter(f => f.tournament === 'A'), [allFixtures]);
  const clausuraFixtures = useMemo(() => allFixtures.filter(f => f.tournament === 'C'), [allFixtures]);
  
  // Local predictions state (client-side only)
  const [predictions, setPredictions] = useState<Map<string, { home: number | null; away: number | null }>>(new Map());
  const [activeTournament, setActiveTournament] = useState<TournamentTab>(() => {
    // Auto-detect: if Apertura has no FT matches left (all 153 are FT), show Clausura
    // Otherwise show Apertura
    return 'A';
  });
  // Auto-detect current round: first round with at least one non-FT match
  // After Monday, advance to next round (all matches of previous round should be FT by then)
  const autoDetectedRoundA = useMemo(() => {
    const rounds = new Map<number, { total: number; finished: number }>();
    aperturaFixtures.forEach((f) => {
      const entry = rounds.get(f.round) || { total: 0, finished: 0 };
      entry.total++;
      if (f.status === "FT") entry.finished++;
      rounds.set(f.round, entry);
    });
    // Find the first round that is not fully finished
    for (let r = 1; r <= 17; r++) {
      const entry = rounds.get(r);
      if (!entry || entry.finished < entry.total) return r;
    }
    return 17;
  }, [aperturaFixtures]);

  const autoDetectedRoundC = useMemo(() => {
    const rounds = new Map<number, { total: number; finished: number }>();
    clausuraFixtures.forEach((f) => {
      const entry = rounds.get(f.round) || { total: 0, finished: 0 };
      entry.total++;
      if (f.status === "FT") entry.finished++;
      rounds.set(f.round, entry);
    });
    for (let r = 1; r <= 17; r++) {
      const entry = rounds.get(r);
      if (!entry || entry.finished < entry.total) return r;
    }
    return 17;
  }, [clausuraFixtures]);

  const [currentRoundA, setCurrentRoundA] = useState<number | null>(null);
  const [currentRoundC, setCurrentRoundC] = useState<number | null>(null);
  const [showPredictions, setShowPredictions] = useState(true);
  const [fairPlayScores, setFairPlayScores] = useState<Record<string, number>>(() => 
    Object.fromEntries(initialTeams.map(t => [t.id, 0]))
  );

  // Auto-detect active tournament
  useMemo(() => {
    const aperturaAllFT = aperturaFixtures.length > 0 && aperturaFixtures.every(f => f.status === 'FT');
    const clausuraHasActivity = clausuraFixtures.some(f => f.status === 'FT' || f.status === 'LIVE');
    
    if (aperturaAllFT || clausuraHasActivity) {
      // If Apertura is finished or Clausura has started, check which to show
      if (aperturaAllFT && !clausuraFixtures.every(f => f.status === 'FT')) {
        setActiveTournament('C');
      }
    }
  }, [aperturaFixtures, clausuraFixtures]);

  // Get fixtures for active tournament view
  const getActiveFixtures = useCallback((tournament: TournamentTab) => {
    if (tournament === 'A') return aperturaFixtures;
    if (tournament === 'C') return clausuraFixtures;
    return allFixtures; // Acumulada
  }, [aperturaFixtures, clausuraFixtures, allFixtures]);

  // Calculate team stats for each tournament
  const aperturaTeams = useMemo(() => {
    const stats = initialTeams.map((t) => ({ 
      ...t, 
      ...calculateTeamStats(t, aperturaFixtures, predictions),
      fairPlay: fairPlayScores[t.id] || 0,
    }));
    return sortTeams(stats, showPredictions);
  }, [aperturaFixtures, predictions, showPredictions, fairPlayScores]);

  const clausuraTeams = useMemo(() => {
    const stats = initialTeams.map((t) => ({ 
      ...t, 
      ...calculateTeamStats(t, clausuraFixtures, predictions),
      fairPlay: fairPlayScores[t.id] || 0,
    }));
    return sortTeams(stats, showPredictions);
  }, [clausuraFixtures, predictions, showPredictions, fairPlayScores]);

  const acumuladaTeams = useMemo(() => {
    const stats = initialTeams.map((t) => ({ 
      ...t, 
      ...calculateTeamStats(t, allFixtures, predictions),
      fairPlay: fairPlayScores[t.id] || 0,
    }));
    return sortTeams(stats, showPredictions);
  }, [allFixtures, predictions, showPredictions, fairPlayScores]);

  // Get teams for active tournament
  const getTeamsByTournament = useCallback((tournament: TournamentTab) => {
    if (tournament === 'A') return aperturaTeams;
    if (tournament === 'C') return clausuraTeams;
    return acumuladaTeams;
  }, [aperturaTeams, clausuraTeams, acumuladaTeams]);

  // Current round per tournament (use auto-detected if user hasn't manually changed)
  const currentRound = activeTournament === 'C'
    ? (currentRoundC ?? autoDetectedRoundC)
    : (currentRoundA ?? autoDetectedRoundA);
  const setCurrentRound = useCallback((round: number) => {
    if (activeTournament === 'C') setCurrentRoundC(round);
    else setCurrentRoundA(round);
  }, [activeTournament]);

  // Active teams = based on active tournament
  const teams = getTeamsByTournament(activeTournament);

  // Convert fixtures to Match format for FixtureView compatibility
  const getMatchesByRound = useCallback((round: number): Match[] => {
    const fixtures = getActiveFixtures(activeTournament === 'ACC' ? 'A' : activeTournament);
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
  }, [getActiveFixtures, activeTournament, predictions]);

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

  // Get team by ID (from active tournament)
  const getTeamById = useCallback((id: string) => teams.find((t) => t.id === id), [teams]);

  // Confirm result (no-op since results come from Supabase)
  const confirmMatchResult = useCallback((_matchId: string, _homeScore: number, _awayScore: number) => {}, []);

  // Stats for active tournament
  const activeFixtures = getActiveFixtures(activeTournament);
  const stats = useMemo(() => calculateStats(activeFixtures, predictions), [activeFixtures, predictions]);

  // Stats per tournament (for tabs)
  const aperturaStats = useMemo(() => calculateStats(aperturaFixtures, predictions), [aperturaFixtures, predictions]);
  const clausuraStats = useMemo(() => calculateStats(clausuraFixtures, predictions), [clausuraFixtures, predictions]);
  const acumuladaStats = useMemo(() => calculateStats(allFixtures, predictions), [allFixtures, predictions]);

  const getStatsByTournament = useCallback((tournament: TournamentTab) => {
    if (tournament === 'A') return aperturaStats;
    if (tournament === 'C') return clausuraStats;
    return acumuladaStats;
  }, [aperturaStats, clausuraStats, acumuladaStats]);

  return {
    fixtures: allFixtures,
    teams,
    currentRound,
    totalRounds: 17,
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
    resetFairPlay,
    refetch,
  };
}
