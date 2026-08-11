/**
 * Prediction persistence + sharing.
 *
 * Predictions are keyed internally by fixture id (a DB uuid), but those ids are
 * not stable across fixture re-imports and are far too long to put in a URL.
 * For storage and sharing we use a durable, compact key instead:
 *
 *   tournament(1) + homeId(3) + awayId(3) + homeScore(1 hex) + awayScore(1 hex)
 *
 * Every Liga 1 pairing plays at most once per tournament, so
 * (tournament, homeId, awayId) identifies a match for the whole season and
 * survives any change of fixture id. Nine characters per predicted match keeps
 * a full round (9 matches) at 81 URL-safe characters.
 */

import type { Fixture } from "@/hooks/useFixtures";

export interface PredictionValue {
  home: number | null;
  away: number | null;
}

/**
 * Keyed by `fixtureKey`, never by fixture id.
 *
 * Fixture ids are not stable: the app renders the local JSON fallback while the
 * Supabase request is in flight, and `mergeFixtures` then swaps in the database
 * rows under their own ids. Anything keyed by id is orphaned at that moment —
 * which silently emptied the share code and wiped local storage.
 */
export type PredictionMap = Map<string, PredictionValue>;

export const SEASON = "2026";
export const STORAGE_KEY = `l1c:preds:${SEASON}:v1`;
export const SHARE_PARAM = "p";

const ENTRY_LENGTH = 9;
const MAX_SCORE = 15; // one hex digit

const isComplete = (value: PredictionValue | undefined): value is { home: number; away: number } =>
  !!value && value.home !== null && value.away !== null;

const clampScore = (value: number) => Math.max(0, Math.min(MAX_SCORE, Math.round(value)));

/** Durable key for a fixture, independent of its database id. */
export const fixtureKey = (fixture: Pick<Fixture, "tournament" | "homeId" | "awayId">) =>
  `${fixture.tournament}${fixture.homeId.toLowerCase()}${fixture.awayId.toLowerCase()}`;

/**
 * Encode the completed predictions that still refer to a known, unplayed fixture.
 * Returns an empty string when there is nothing worth sharing.
 *
 * Driven by the fixture list rather than by the map, so a prediction for a match
 * that has since kicked off drops out of the code on its own.
 */
export const encodePredictions = (predictions: PredictionMap, fixtures: Fixture[]): string => {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const fixture of fixtures) {
    if (fixture.status !== "NS") continue;
    const key = fixtureKey(fixture);
    if (seen.has(key)) continue;
    const value = predictions.get(key);
    if (!isComplete(value)) continue;
    seen.add(key);
    parts.push(
      key + clampScore(value.home).toString(16) + clampScore(value.away).toString(16)
    );
  }

  // Sort so the same set of predictions always produces the same code.
  return parts.sort().join("");
};

/**
 * Decode a share/storage code into predictions keyed by `fixtureKey`.
 *
 * Entries are kept even when no matching fixture is loaded yet, so a code that
 * covers the Clausura still survives if it is decoded before those fixtures
 * arrive. `encodePredictions` is what decides which of them are worth persisting.
 */
export const decodePredictions = (code: string): PredictionMap => {
  const result: PredictionMap = new Map();
  if (!code) return result;

  for (let i = 0; i + ENTRY_LENGTH <= code.length; i += ENTRY_LENGTH) {
    const entry = code.slice(i, i + ENTRY_LENGTH);
    const home = parseInt(entry[7], 16);
    const away = parseInt(entry[8], 16);
    if (Number.isNaN(home) || Number.isNaN(away)) continue;
    result.set(entry.slice(0, 7), { home, away });
  }

  return result;
};

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

export const loadStoredCode = (): string => {
  if (!canUseStorage()) return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

export const saveStoredCode = (code: string) => {
  if (!canUseStorage()) return;
  try {
    if (code) window.localStorage.setItem(STORAGE_KEY, code);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing / quota — predictions simply won't survive a reload.
  }
};

/** Prediction code carried by the current URL, if any. */
export const readCodeFromUrl = (): string => {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!value) return "";
  // Guard against arbitrary query strings: the code is fixed-width and alphanumeric.
  return /^[a-z0-9]+$/i.test(value) && value.length % ENTRY_LENGTH === 0 ? value : "";
};

/**
 * Keep the prediction code in the address bar so that copying the URL shares the
 * simulation. Uses replaceState so it never pollutes the back button.
 */
export const syncCodeToUrl = (code: string) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const current = url.searchParams.get(SHARE_PARAM) ?? "";
  if (current === code) return;
  if (code) url.searchParams.set(SHARE_PARAM, code);
  else url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
};

/** Absolute, canonical URL for sharing the given predictions. */
export const buildShareUrl = (code: string): string => {
  if (typeof window === "undefined") return "https://www.liga1calc.pe/";
  const url = new URL(window.location.origin + window.location.pathname);
  if (code) url.searchParams.set(SHARE_PARAM, code);
  return url.toString();
};
