import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { initialTeams } from "@/data/teams";

/**
 * Bulk score entry for one matchday.
 *
 * The per-fixture dialog in Admin needs about five interactions per match, so a
 * nine-match round costs ~45. Here the whole round is one form: type the goals,
 * press one button. Everything downstream (both tables, the acumulada, the odds
 * and the default round shown on the home page) is derived from status === "FT"
 * plus the two scores, so writing those is all it takes.
 */

const TOTAL_ROUNDS = 17;
/** Nothing in this league gets near it; it only exists to catch a slipped keypress. */
const MAX_GOALS = 30;

interface QuickFixture {
  id: string;
  round: number;
  home_id: string;
  away_id: string;
  home_score: number | null;
  away_score: number | null;
  status: "NS" | "LIVE" | "FT";
  is_locked: boolean;
  kick_off: string | null;
  tournament: string;
}

interface Draft {
  home: string;
  away: string;
}

interface QuickScoreEntryProps {
  /** Called after a successful save so the admin table reloads. */
  onSaved: () => void;
}

const teamName = (id: string) =>
  initialTeams.find((t) => t.id === id)?.name ?? id.toUpperCase();

/**
 * "" is a deliberately empty box (leave this match alone), a valid integer is a
 * score, and anything else is a typo we refuse to save.
 */
type ParsedScore = { kind: "empty" } | { kind: "value"; value: number } | { kind: "invalid" };

const parseScore = (raw: string): ParsedScore => {
  const trimmed = raw.trim();
  if (trimmed === "") return { kind: "empty" };
  if (!/^\d{1,2}$/.test(trimmed)) return { kind: "invalid" };
  const value = Number(trimmed);
  if (value > MAX_GOALS) return { kind: "invalid" };
  return { kind: "value", value };
};

const draftFrom = (fixture: QuickFixture): Draft => ({
  home: fixture.home_score?.toString() ?? "",
  away: fixture.away_score?.toString() ?? "",
});

export const QuickScoreEntry = ({ onSaved }: QuickScoreEntryProps) => {
  const [tournament, setTournament] = useState<"A" | "C">("A");
  const [round, setRound] = useState(1);
  const [fixtures, setFixtures] = useState<QuickFixture[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markFinal, setMarkFinal] = useState(true);

  /**
   * Guards against two hazards when the selector changes: writing the previous
   * round's rows because they were still on screen under the spinner, and a slow
   * first request landing after a faster second one and overwriting it.
   */
  const requestRef = useRef(0);

  const loadRound = useCallback(async () => {
    const token = ++requestRef.current;
    setLoading(true);
    // Drop the old round immediately: rows the user can no longer see must not
    // stay in state where the save button can still reach them.
    setFixtures([]);
    setDrafts({});
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select("id, round, home_id, away_id, home_score, away_score, status, is_locked, kick_off, tournament")
        .eq("tournament", tournament)
        .eq("round", round)
        .order("kick_off", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });

      if (error) throw new Error(error.message);
      if (token !== requestRef.current) return;

      const rows = (data ?? []) as QuickFixture[];
      setFixtures(rows);
      setDrafts(Object.fromEntries(rows.map((f) => [f.id, draftFrom(f)])));
    } catch (error) {
      if (token !== requestRef.current) return;
      console.error("Quick entry load error:", error);
      toast.error("No se pudieron cargar los partidos de esa fecha");
    } finally {
      if (token === requestRef.current) setLoading(false);
    }
  }, [tournament, round]);

  useEffect(() => {
    loadRound();
  }, [loadRound]);

  const setDraft = (id: string, side: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { home: "", away: "" }), [side]: value },
    }));
  };

  /**
   * Split the round into what we can write, what the user half-filled, and what
   * is already stored as typed. A half-filled row blocks the save: silently
   * skipping it is how someone ends up believing a result went in when it did not.
   */
  const { writable, incomplete, invalid } = useMemo(() => {
    const writable: { fixture: QuickFixture; home: number; away: number }[] = [];
    let incomplete = 0;
    let invalid = 0;

    for (const fixture of fixtures) {
      const draft = drafts[fixture.id] ?? { home: "", away: "" };
      const home = parseScore(draft.home);
      const away = parseScore(draft.away);

      if (home.kind === "invalid" || away.kind === "invalid") {
        invalid++;
        continue;
      }
      if (home.kind === "empty" && away.kind === "empty") continue;
      if (home.kind === "empty" || away.kind === "empty") {
        incomplete++;
        continue;
      }

      const unchanged =
        fixture.home_score === home.value &&
        fixture.away_score === away.value &&
        (!markFinal || (fixture.status === "FT" && fixture.is_locked));
      if (unchanged) continue;

      writable.push({ fixture, home: home.value, away: away.value });
    }

    return { writable, incomplete, invalid };
  }, [fixtures, drafts, markFinal]);

  const save = async () => {
    if (writable.length === 0 || loading) return;

    setSaving(true);
    try {
      const results = await Promise.all(
        writable.map(async ({ fixture, home, away }) => {
          const update: Record<string, unknown> = {
            home_score: home,
            away_score: away,
          };
          if (markFinal) {
            update.status = "FT";
            update.is_locked = true;
          }
          // .select() matters: when RLS rejects an UPDATE, PostgREST does not
          // return an error, it just updates zero rows and answers 204. Without
          // asking for the affected row back we would cheerfully report success
          // over a write that never happened — the worst possible failure here,
          // because the admin walks away believing the matchday is loaded.
          const { data, error } = await supabase
            .from("fixtures")
            .update(update)
            .eq("id", fixture.id)
            .select("id");

          if (error) return error.message;
          if (!data || data.length === 0) {
            return `${fixture.id}: la base de datos no aceptó la escritura`;
          }
          return null;
        })
      );

      const failed = results.filter((r): r is string => r !== null);
      if (failed.length > 0) {
        // Report the real count instead of a blanket success: a partial write is
        // the case where the admin most needs to know which rows to redo.
        console.error("Quick entry save errors:", failed);
        toast.error(
          `Se guardaron ${writable.length - failed.length} de ${writable.length}. Revisa los que faltan.`
        );
      } else {
        toast.success(
          writable.length === 1 ? "1 resultado guardado" : `${writable.length} resultados guardados`
        );
      }

      await loadRound();
      onSaved();
    } catch (error) {
      console.error("Quick entry save error:", error);
      toast.error("Error al guardar los resultados");
    } finally {
      setSaving(false);
    }
  };

  const blocked = incomplete > 0 || invalid > 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Carga rápida de resultados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Torneo</Label>
            <Select value={tournament} onValueChange={(v) => setTournament(v as "A" | "C")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Apertura</SelectItem>
                <SelectItem value="C">Clausura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Fecha</Label>
            <Select value={String(round)} onValueChange={(v) => setRound(parseInt(v, 10))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    Fecha {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : fixtures.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay partidos cargados en esta fecha.
          </p>
        ) : (
          <ul className="space-y-2">
            {fixtures.map((fixture) => {
              const draft = drafts[fixture.id] ?? { home: "", away: "" };
              const homeState = parseScore(draft.home);
              const awayState = parseScore(draft.away);
              const halfFilled =
                (homeState.kind === "empty") !== (awayState.kind === "empty");
              const bad =
                homeState.kind === "invalid" || awayState.kind === "invalid" || halfFilled;

              return (
                <li
                  key={fixture.id}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-2 sm:px-3 ${
                    bad ? "border-destructive/60 bg-destructive/5" : "border-border bg-card/50"
                  }`}
                >
                  {/* No truncation: on a phone the name is the only way to tell
                      which match you are typing into, and half the Liga 1 names
                      collide once cut ("Alianza ..." is two different clubs). */}
                  <span className="flex-1 min-w-0 text-right text-xs sm:text-sm leading-tight">
                    {teamName(fixture.home_id)}
                  </span>

                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    aria-label={`Goles de ${teamName(fixture.home_id)}`}
                    value={draft.home}
                    onChange={(e) => setDraft(fixture.id, "home", e.target.value)}
                    className="w-12 h-11 shrink-0 text-center text-base font-semibold tabular-nums"
                  />
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    aria-label={`Goles de ${teamName(fixture.away_id)}`}
                    value={draft.away}
                    onChange={(e) => setDraft(fixture.id, "away", e.target.value)}
                    className="w-12 h-11 shrink-0 text-center text-base font-semibold tabular-nums"
                  />

                  <span className="flex-1 min-w-0 text-xs sm:text-sm leading-tight">
                    {teamName(fixture.away_id)}
                  </span>

                  {fixture.status === "FT" && (
                    <CheckCircle
                      className="w-4 h-4 shrink-0 text-muted-foreground"
                      aria-label="Ya finalizado"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {fixtures.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="quick_mark_final"
                checked={markFinal}
                onChange={(e) => setMarkFinal(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="quick_mark_final" className="text-sm">
                Marcar como finalizados y bloquear
              </Label>
            </div>

            {blocked && (
              <p className="text-sm text-destructive">
                {incomplete > 0 && (
                  <>
                    Hay {incomplete} {incomplete === 1 ? "partido" : "partidos"} con un solo
                    marcador.{" "}
                  </>
                )}
                {invalid > 0 && (
                  <>
                    Hay {invalid} {invalid === 1 ? "marcador" : "marcadores"} que no son un número
                    válido.{" "}
                  </>
                )}
                Completa o vacía esas casillas para poder guardar.
              </p>
            )}

            <Button
              onClick={save}
              disabled={saving || loading || blocked || writable.length === 0}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {writable.length === 0
                ? "Sin cambios que guardar"
                : `Guardar ${writable.length} ${writable.length === 1 ? "resultado" : "resultados"}`}
            </Button>

            <p className="text-xs text-muted-foreground">
              Los partidos que dejes en blanco no se tocan.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickScoreEntry;
