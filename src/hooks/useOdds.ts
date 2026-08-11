import { useEffect, useMemo, useRef, useState } from "react";
import type { Fixture } from "./useFixtures";
import type { PredictionMap } from "@/lib/predictions";
import { simulateSeason, type SimulationResult } from "@/lib/simulation";

interface UseOddsOptions {
  teamIds: string[];
  /** Fixtures that form the table being projected. */
  fixtures: Fixture[];
  /** Fixtures used to rate the teams — normally the whole season. */
  strengthFixtures?: Fixture[];
  predictions: PredictionMap;
  enabled?: boolean;
  iterations?: number;
}

/**
 * A cheap signature of everything the simulation depends on, so we only re-run
 * when a result or a prediction actually changed.
 */
const signature = (fixtures: Fixture[], predictions: PredictionMap) => {
  let key = "";
  for (const fixture of fixtures) {
    key += `${fixture.id}:${fixture.status}:${fixture.homeScore ?? "-"}:${fixture.awayScore ?? "-"}|`;
  }
  const predictionKeys: string[] = [];
  for (const [id, value] of predictions) {
    if (value.home === null || value.away === null) continue;
    predictionKeys.push(`${id}=${value.home}-${value.away}`);
  }
  return `${key}#${predictionKeys.sort().join(",")}`;
};

/**
 * Runs the Monte Carlo projection off the render path. The simulation itself
 * takes a few milliseconds, but predictions arrive one keystroke at a time, so
 * we debounce to keep the stepper buttons perfectly responsive.
 */
export const useOdds = ({
  teamIds,
  fixtures,
  strengthFixtures,
  predictions,
  enabled = true,
  iterations,
}: UseOddsOptions) => {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [computing, setComputing] = useState(false);

  const key = useMemo(
    () => (enabled ? signature(fixtures, predictions) : ""),
    [enabled, fixtures, predictions]
  );
  const teamKey = useMemo(() => teamIds.join(","), [teamIds]);

  // Keep the latest inputs in a ref so the debounce effect only depends on keys.
  const inputs = useRef({ teamIds, fixtures, strengthFixtures, predictions });
  inputs.current = { teamIds, fixtures, strengthFixtures, predictions };

  useEffect(() => {
    if (!enabled || !key || teamIds.length === 0 || fixtures.length === 0) {
      setResult(null);
      setComputing(false);
      return;
    }

    setComputing(true);
    const timer = window.setTimeout(() => {
      const current = inputs.current;
      setResult(
        simulateSeason({
          teamIds: current.teamIds,
          fixtures: current.fixtures,
          strengthFixtures: current.strengthFixtures,
          predictions: current.predictions,
          iterations,
        })
      );
      setComputing(false);
    }, 180);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, teamKey, enabled, iterations]);

  return { odds: result?.odds ?? null, simulatedMatches: result?.simulatedMatches ?? 0, computing };
};
