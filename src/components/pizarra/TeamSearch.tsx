import { useState } from "react";
import { initialTeams } from "@/data/teams";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

export interface LineupPlayer {
  name: string;
  number: number;
  pos: string;
  grid: string | null;
}

interface TeamSearchProps {
  onLineupLoaded: (players: LineupPlayer[], teamName: string) => void;
}

export const TeamSearch = ({ onLineupLoaded }: TeamSearchProps) => {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async () => {
    if (!selectedTeam) return;
    const team = initialTeams.find((t) => t.id === selectedTeam);
    if (!team) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-football/fixtures/lineups?team=${team.apiTeamId}&season=2026&league=281`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("No se pudieron cargar las alineaciones");
      }

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        throw new Error("No hay alineaciones disponibles para este equipo");
      }

      // Get the latest lineup
      const latestLineup = result.data[0];
      const teamLineup = latestLineup.team?.id === team.apiTeamId
        ? latestLineup
        : result.data.find((l: any) => l.team?.id === team.apiTeamId);

      if (!teamLineup || !teamLineup.startXI) {
        throw new Error("No se encontró la alineación del equipo");
      }

      const players: LineupPlayer[] = teamLineup.startXI.map((entry: any) => ({
        name: entry.player?.name || "Jugador",
        number: entry.player?.number || 0,
        pos: entry.player?.pos || "M",
        grid: entry.player?.grid || null,
      }));

      onLineupLoaded(players, team.name);
    } catch (err: any) {
      setError(err.message || "Error al buscar alineación");
    } finally {
      setLoading(false);
    }
  };

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

      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1"
        onClick={handleLoad}
        disabled={!selectedTeam || loading}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Users className="w-3 h-3" />
        )}
        Cargar XI
      </Button>

      {error && (
        <span className="text-[10px] text-destructive max-w-[150px] truncate">{error}</span>
      )}
    </div>
  );
};
