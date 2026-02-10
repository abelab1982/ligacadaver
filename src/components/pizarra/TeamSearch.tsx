import { useState, useEffect, useRef } from "react";
import { initialTeams } from "@/data/teams";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

export interface LineupPlayer {
  name: string;
  number: number;
  pos: string;
  grid: string | null;
}

export interface BenchPlayer {
  name: string;
  number: number;
  pos: string;
}

interface TeamSearchProps {
  onLineupLoaded: (players: LineupPlayer[], teamName: string, bench: BenchPlayer[], formation: string | null) => void;
}

export const TeamSearch = ({ onLineupLoaded }: TeamSearchProps) => {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onLineupLoadedRef = useRef(onLineupLoaded);
  onLineupLoadedRef.current = onLineupLoaded;

  useEffect(() => {
    if (!selectedTeam) return;
    const team = initialTeams.find((t) => t.id === selectedTeam);
    if (!team) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const fixturesRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-football/fixtures?team=${team.apiTeamId}&season=2026&league=281&last=1`,
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!fixturesRes.ok) throw new Error("No se pudo obtener el fixture");
        const fixturesData = await fixturesRes.json();

        if (!fixturesData.success || !fixturesData.data || fixturesData.data.length === 0) {
          throw new Error("No hay partidos disponibles para este equipo");
        }

        const fixtureId = fixturesData.data[0]?.fixture?.id;
        if (!fixtureId) throw new Error("No se encontró el ID del partido");

        const lineupsRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-football/fixtures/lineups?fixture=${fixtureId}`,
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!lineupsRes.ok) throw new Error("No se pudieron cargar las alineaciones");
        const result = await lineupsRes.json();

        if (cancelled) return;

        if (!result.success || !result.data || result.data.length === 0) {
          const squadRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-football/players/squads?team=${team.apiTeamId}`,
            {
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!squadRes.ok) throw new Error("No hay alineaciones ni plantilla disponibles");
          const squadData = await squadRes.json();
          if (!squadData.success || !squadData.data || squadData.data.length === 0) {
            throw new Error("No hay datos de plantilla disponibles");
          }

          const squadPlayers = squadData.data[0]?.players || [];
          const starters: LineupPlayer[] = squadPlayers.slice(0, 11).map((p: any) => ({
            name: p.name || "Jugador",
            number: p.number || 0,
            pos: p.position?.[0] || "M",
            grid: null,
          }));
          const bench: BenchPlayer[] = squadPlayers.slice(11).map((p: any) => ({
            name: p.name || "Jugador",
            number: p.number || 0,
            pos: p.position?.[0] || "M",
          }));

          if (!cancelled) onLineupLoadedRef.current(starters, team.name, bench, null);
          return;
        }

        const teamLineup = result.data.find((l: any) => l.team?.id === team.apiTeamId) || result.data[0];
        if (!teamLineup || !teamLineup.startXI) {
          throw new Error("No se encontró la alineación del equipo");
        }

        const formation = teamLineup.formation || null;
        const players: LineupPlayer[] = teamLineup.startXI.map((entry: any) => ({
          name: entry.player?.name || "Jugador",
          number: entry.player?.number || 0,
          pos: entry.player?.pos || "M",
          grid: entry.player?.grid || null,
        }));
        const bench: BenchPlayer[] = (teamLineup.substitutes || []).map((entry: any) => ({
          name: entry.player?.name || "Suplente",
          number: entry.player?.number || 0,
          pos: entry.player?.pos || "M",
        }));

        if (!cancelled) onLineupLoadedRef.current(players, team.name, bench, formation);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Error al buscar alineación");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedTeam]);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
        <SelectTrigger className="w-[160px] h-8 text-xs bg-card border-border">
          <SelectValue placeholder="Equipo..." />
        </SelectTrigger>
        <SelectContent className="max-h-[280px]">
          {initialTeams.map((team) => (
            <SelectItem key={team.id} value={team.id} className="text-xs">
              <div className="flex items-center gap-2">
                <TeamLogo teamId={team.id} teamName={team.name} abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="sm" />
                <span>{team.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      {error && (
        <span className="text-[10px] text-destructive max-w-[150px] truncate">{error}</span>
      )}
    </div>
  );
};
