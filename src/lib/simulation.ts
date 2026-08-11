/**
 * Monte Carlo projection of the Liga 1 table.
 *
 * Answers the question the competition doesn't: "with the results I already
 * picked, what are the odds my team finishes champion / in Libertadores /
 * relegated?".
 *
 * Model: an independent Poisson goals model. Each team gets an attack and a
 * defence multiplier derived from its real results, shrunk towards the league
 * average so that a team with three games played is not treated as a known
 * quantity. Matches the user has already predicted are treated as settled;
 * everything else is sampled.
 */

import type { Fixture } from "@/hooks/useFixtures";
import { fixtureKey, type PredictionMap } from "@/lib/predictions";

export interface TeamOdds {
  teamId: string;
  /** Probability of finishing 1st. */
  champion: number;
  /** Probability of finishing in the Libertadores zone (1st-4th). */
  libertadores: number;
  /** Probability of finishing in the Sudamericana zone (5th-8th). */
  sudamericana: number;
  /** Probability of finishing in the relegation zone (last two). */
  relegation: number;
  avgPoints: number;
  avgPosition: number;
}

export interface SimulationResult {
  odds: Record<string, TeamOdds>;
  /** Matches that were actually sampled (0 => the table is already decided). */
  simulatedMatches: number;
  iterations: number;
}

export interface SimulationOptions {
  teamIds: string[];
  /** Fixtures that make up the table being projected. */
  fixtures: Fixture[];
  /** Fixtures used to estimate team strength — normally the whole season. */
  strengthFixtures?: Fixture[];
  predictions: PredictionMap;
  iterations?: number;
  /** Deterministic seed so identical inputs render identical odds. */
  seed?: number;
}

const DEFAULT_ITERATIONS = 5000;
const LIBERTADORES_SLOTS = 4;
const SUDAMERICANA_LAST = 8;
const RELEGATION_SLOTS = 2;

/** Goals per team per match when we have no data to go on. */
const BASELINE_GOALS = 1.2;
/** Pseudo-matches of league-average form mixed into every team's rating. */
const SHRINKAGE = 6;
const HOME_ADVANTAGE = 1.15;
const AWAY_ADJUSTMENT = 0.9;
const MIN_LAMBDA = 0.15;
const MAX_LAMBDA = 4;

/** Small, fast, seedable PRNG (mulberry32). */
const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Knuth's Poisson sampler — fine for the small lambdas football produces. */
const samplePoisson = (lambda: number, random: () => number): number => {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= random();
  } while (p > limit);
  return k - 1;
};

/** A match counts as played once it is finished or under way with a score. */
const hasRealScore = (fixture: Fixture) =>
  (fixture.status === "FT" || fixture.status === "LIVE") &&
  fixture.homeScore !== null &&
  fixture.awayScore !== null;

interface Strength {
  attack: number;
  defence: number;
}

/**
 * Attack/defence multipliers relative to the league average, regressed towards
 * 1 by SHRINKAGE pseudo-matches so early-season noise doesn't dominate.
 */
const computeStrengths = (teamIds: string[], fixtures: Fixture[]): Map<string, Strength> => {
  const scored = new Map<string, number>();
  const conceded = new Map<string, number>();
  const played = new Map<string, number>();
  let totalGoals = 0;
  let totalMatches = 0;

  for (const id of teamIds) {
    scored.set(id, 0);
    conceded.set(id, 0);
    played.set(id, 0);
  }

  for (const fixture of fixtures) {
    if (!hasRealScore(fixture)) continue;
    if (!played.has(fixture.homeId) || !played.has(fixture.awayId)) continue;

    const home = fixture.homeScore as number;
    const away = fixture.awayScore as number;

    scored.set(fixture.homeId, (scored.get(fixture.homeId) as number) + home);
    conceded.set(fixture.homeId, (conceded.get(fixture.homeId) as number) + away);
    played.set(fixture.homeId, (played.get(fixture.homeId) as number) + 1);

    scored.set(fixture.awayId, (scored.get(fixture.awayId) as number) + away);
    conceded.set(fixture.awayId, (conceded.get(fixture.awayId) as number) + home);
    played.set(fixture.awayId, (played.get(fixture.awayId) as number) + 1);

    totalGoals += home + away;
    totalMatches += 1;
  }

  // Average goals scored by one side in one match.
  const leagueAverage = totalMatches > 0 ? totalGoals / (totalMatches * 2) : BASELINE_GOALS;
  const base = leagueAverage > 0 ? leagueAverage : BASELINE_GOALS;

  const strengths = new Map<string, Strength>();
  for (const id of teamIds) {
    const games = played.get(id) as number;
    const weight = games / (games + SHRINKAGE);
    const rawAttack = games > 0 ? (scored.get(id) as number) / games / base : 1;
    const rawDefence = games > 0 ? (conceded.get(id) as number) / games / base : 1;
    strengths.set(id, {
      attack: 1 + weight * (rawAttack - 1),
      defence: 1 + weight * (rawDefence - 1),
    });
  }

  return strengths;
};

const emptyOdds = (teamId: string): TeamOdds => ({
  teamId,
  champion: 0,
  libertadores: 0,
  sudamericana: 0,
  relegation: 0,
  avgPoints: 0,
  avgPosition: 0,
});

export const simulateSeason = ({
  teamIds,
  fixtures,
  strengthFixtures,
  predictions,
  iterations = DEFAULT_ITERATIONS,
  seed = 0x9e3779b9,
}: SimulationOptions): SimulationResult => {
  const teamCount = teamIds.length;
  const index = new Map(teamIds.map((id, i) => [id, i]));

  const basePoints = new Int32Array(teamCount);
  const baseFor = new Int32Array(teamCount);
  const baseAgainst = new Int32Array(teamCount);

  const applyResult = (homeIdx: number, awayIdx: number, home: number, away: number) => {
    baseFor[homeIdx] += home;
    baseAgainst[homeIdx] += away;
    baseFor[awayIdx] += away;
    baseAgainst[awayIdx] += home;
    if (home > away) basePoints[homeIdx] += 3;
    else if (home < away) basePoints[awayIdx] += 3;
    else {
      basePoints[homeIdx] += 1;
      basePoints[awayIdx] += 1;
    }
  };

  // Fixtures still to be sampled, flattened for a tight simulation loop.
  const pendingHome: number[] = [];
  const pendingAway: number[] = [];

  for (const fixture of fixtures) {
    const homeIdx = index.get(fixture.homeId);
    const awayIdx = index.get(fixture.awayId);
    if (homeIdx === undefined || awayIdx === undefined) continue;

    if (hasRealScore(fixture)) {
      applyResult(homeIdx, awayIdx, fixture.homeScore as number, fixture.awayScore as number);
      continue;
    }
    if (fixture.status !== "NS") continue;

    const prediction = predictions.get(fixtureKey(fixture));
    if (prediction && prediction.home !== null && prediction.away !== null) {
      // The user has called this one — treat it as settled.
      applyResult(homeIdx, awayIdx, prediction.home, prediction.away);
      continue;
    }

    pendingHome.push(homeIdx);
    pendingAway.push(awayIdx);
  }

  const odds: Record<string, TeamOdds> = {};
  for (const id of teamIds) odds[id] = emptyOdds(id);

  const strengths = computeStrengths(teamIds, strengthFixtures ?? fixtures);
  const leagueGoals = (() => {
    const source = strengthFixtures ?? fixtures;
    let goals = 0;
    let matches = 0;
    for (const fixture of source) {
      if (!hasRealScore(fixture)) continue;
      goals += (fixture.homeScore as number) + (fixture.awayScore as number);
      matches += 1;
    }
    return matches > 0 ? goals / (matches * 2) : BASELINE_GOALS;
  })();

  const attack = new Float64Array(teamCount);
  const defence = new Float64Array(teamCount);
  teamIds.forEach((id, i) => {
    const strength = strengths.get(id) as Strength;
    attack[i] = strength.attack;
    defence[i] = strength.defence;
  });

  const clampLambda = (value: number) => Math.min(MAX_LAMBDA, Math.max(MIN_LAMBDA, value));

  // Pre-compute the expected goals for each pending match; they don't change
  // between iterations, only the sampled outcome does.
  const pendingCount = pendingHome.length;
  const lambdaHome = new Float64Array(pendingCount);
  const lambdaAway = new Float64Array(pendingCount);
  for (let m = 0; m < pendingCount; m += 1) {
    const h = pendingHome[m];
    const a = pendingAway[m];
    lambdaHome[m] = clampLambda(leagueGoals * attack[h] * defence[a] * HOME_ADVANTAGE);
    lambdaAway[m] = clampLambda(leagueGoals * attack[a] * defence[h] * AWAY_ADJUSTMENT);
  }

  // When nothing is left to sample the table is deterministic: one pass is enough.
  const runs = pendingCount === 0 ? 1 : iterations;
  const random = createRandom(seed);

  const points = new Int32Array(teamCount);
  const goalsFor = new Int32Array(teamCount);
  const goalsAgainst = new Int32Array(teamCount);
  const order = new Int32Array(teamCount);

  const championHits = new Int32Array(teamCount);
  const libertadoresHits = new Int32Array(teamCount);
  const sudamericanaHits = new Int32Array(teamCount);
  const relegationHits = new Int32Array(teamCount);
  const pointsTotal = new Float64Array(teamCount);
  const positionTotal = new Float64Array(teamCount);

  const relegationFrom = teamCount - RELEGATION_SLOTS;

  for (let run = 0; run < runs; run += 1) {
    points.set(basePoints);
    goalsFor.set(baseFor);
    goalsAgainst.set(baseAgainst);

    for (let m = 0; m < pendingCount; m += 1) {
      const h = pendingHome[m];
      const a = pendingAway[m];
      const homeGoals = samplePoisson(lambdaHome[m], random);
      const awayGoals = samplePoisson(lambdaAway[m], random);

      goalsFor[h] += homeGoals;
      goalsAgainst[h] += awayGoals;
      goalsFor[a] += awayGoals;
      goalsAgainst[a] += homeGoals;

      if (homeGoals > awayGoals) points[h] += 3;
      else if (homeGoals < awayGoals) points[a] += 3;
      else {
        points[h] += 1;
        points[a] += 1;
      }
    }

    for (let i = 0; i < teamCount; i += 1) order[i] = i;
    // Same tiebreakers as the visible table: points, goal difference, goals for.
    order.sort((a, b) => {
      if (points[b] !== points[a]) return points[b] - points[a];
      const gdA = goalsFor[a] - goalsAgainst[a];
      const gdB = goalsFor[b] - goalsAgainst[b];
      if (gdB !== gdA) return gdB - gdA;
      if (goalsFor[b] !== goalsFor[a]) return goalsFor[b] - goalsFor[a];
      return a - b;
    });

    for (let position = 0; position < teamCount; position += 1) {
      const team = order[position];
      pointsTotal[team] += points[team];
      positionTotal[team] += position + 1;
      if (position === 0) championHits[team] += 1;
      if (position < LIBERTADORES_SLOTS) libertadoresHits[team] += 1;
      else if (position < SUDAMERICANA_LAST) sudamericanaHits[team] += 1;
      if (position >= relegationFrom) relegationHits[team] += 1;
    }
  }

  teamIds.forEach((id, i) => {
    odds[id] = {
      teamId: id,
      champion: championHits[i] / runs,
      libertadores: libertadoresHits[i] / runs,
      sudamericana: sudamericanaHits[i] / runs,
      relegation: relegationHits[i] / runs,
      avgPoints: pointsTotal[i] / runs,
      avgPosition: positionTotal[i] / runs,
    };
  });

  return { odds, simulatedMatches: pendingCount, iterations: runs };
};

/** Percentage label that never rounds a live chance down to a flat "0%". */
export const formatOdds = (value: number): string => {
  if (value <= 0) return "0%";
  if (value >= 0.9995) return "100%";
  const percent = value * 100;
  if (percent < 1) return "<1%";
  if (percent > 99) return ">99%";
  return `${Math.round(percent)}%`;
};
