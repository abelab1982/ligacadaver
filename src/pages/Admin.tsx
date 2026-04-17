import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamLogo } from "@/components/TeamLogo";
import { initialTeams } from "@/data/teams";
import { 
  ArrowLeft, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Loader2,
  Play,
  CheckCircle,
  LogOut,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface Fixture {
  id: string;
  round: number;
  home_id: string;
  away_id: string;
  home_score: number | null;
  away_score: number | null;
  status: "NS" | "LIVE" | "FT";
  is_locked: boolean;
  kick_off: string | null;
  api_fixture_id: number | null;
  updated_at: string;
}

const TOTAL_ROUNDS = 17;

// Get team info by ID
const getTeam = (id: string) => initialTeams.find(t => t.id === id);

interface AdminMatchCardProps {
  fixture: Fixture;
  onSave: (fixture: Fixture, homeScore: number | null, awayScore: number | null, status: "NS" | "LIVE" | "FT") => void;
  onToggleLock: (fixture: Fixture) => void;
  saving: boolean;
}

const AdminMatchCard = ({ fixture, onSave, onToggleLock, saving }: AdminMatchCardProps) => {
  const homeTeam = getTeam(fixture.home_id);
  const awayTeam = getTeam(fixture.away_id);
  const [homeScore, setHomeScore] = useState(fixture.home_score?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(fixture.away_score?.toString() ?? "");
  const [status, setStatus] = useState(fixture.status);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when fixture data changes (e.g., after refetch)
  useEffect(() => {
    setHomeScore(fixture.home_score?.toString() ?? "");
    setAwayScore(fixture.away_score?.toString() ?? "");
    setStatus(fixture.status);
    setHasChanges(false);
  }, [fixture.home_score, fixture.away_score, fixture.status]);

  const handleScoreChange = (side: "home" | "away", value: string) => {
    if (value === "" || (/^\d+$/.test(value) && parseInt(value) <= 20)) {
      if (side === "home") setHomeScore(value);
      else setAwayScore(value);
      setHasChanges(true);
    }
  };

  const handleStatusChange = (newStatus: "NS" | "LIVE" | "FT") => {
    setStatus(newStatus);
    setHasChanges(true);
  };

  const handleSave = () => {
    const hs = homeScore !== "" ? parseInt(homeScore) : null;
    const as_ = awayScore !== "" ? parseInt(awayScore) : null;
    onSave(fixture, hs, as_, status);
    setHasChanges(false);
  };

  // Quick action: set score and mark as FT
  const handleQuickFT = () => {
    const hs = homeScore !== "" ? parseInt(homeScore) : null;
    const as_ = awayScore !== "" ? parseInt(awayScore) : null;
    if (hs !== null && as_ !== null) {
      setStatus("FT");
      onSave(fixture, hs, as_, "FT");
      setHasChanges(false);
    } else {
      toast.error("Ingresa ambos scores antes de marcar como FINAL");
    }
  };

  if (!homeTeam || !awayTeam) return null;

  const statusColor = status === "FT" ? "bg-muted/50 border-muted" : status === "LIVE" ? "border-red-500/50 bg-red-950/20" : "bg-card/50 border-border";

  return (
    <Card className={`p-3 transition-all duration-200 ${statusColor} ${hasChanges ? "ring-2 ring-amber-500/50" : ""}`}>
      {/* Mobile + Desktop Layout */}
      <div className="flex flex-col gap-2">
        {/* Teams + Score Row */}
        <div className="flex items-center gap-2">
          {/* Home Team */}
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span className="text-xs md:text-sm font-medium truncate">{homeTeam.name}</span>
            <TeamLogo
              teamId={homeTeam.id}
              teamName={homeTeam.name}
              abbreviation={homeTeam.abbreviation}
              primaryColor={homeTeam.primaryColor}
              size="md"
            />
          </div>

          {/* Score Inputs */}
          <div className="flex items-center gap-1 shrink-0">
            <Input
              type="text"
              inputMode="numeric"
              value={homeScore}
              onChange={(e) => handleScoreChange("home", e.target.value)}
              className="w-10 h-10 md:w-9 md:h-9 text-center text-lg md:text-base font-bold p-0 bg-background/80"
              placeholder="-"
            />
            <span className="text-muted-foreground font-bold text-sm">-</span>
            <Input
              type="text"
              inputMode="numeric"
              value={awayScore}
              onChange={(e) => handleScoreChange("away", e.target.value)}
              className="w-10 h-10 md:w-9 md:h-9 text-center text-lg md:text-base font-bold p-0 bg-background/80"
              placeholder="-"
            />
          </div>

          {/* Away Team */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <TeamLogo
              teamId={awayTeam.id}
              teamName={awayTeam.name}
              abbreviation={awayTeam.abbreviation}
              primaryColor={awayTeam.primaryColor}
              size="md"
            />
            <span className="text-xs md:text-sm font-medium truncate">{awayTeam.name}</span>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Status Select */}
          <Select value={status} onValueChange={(v) => handleStatusChange(v as "NS" | "LIVE" | "FT")}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NS">
                <span className="flex items-center gap-1">NS</span>
              </SelectItem>
              <SelectItem value="LIVE">
                <span className="flex items-center gap-1 text-red-400">EN VIVO</span>
              </SelectItem>
              <SelectItem value="FT">
                <span className="flex items-center gap-1 text-green-400">FINAL</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Lock indicator + Quick actions */}
          <div className="flex items-center gap-1">
            {fixture.kick_off && (
              <span className="text-[10px] text-muted-foreground hidden md:inline">
                {new Date(fixture.kick_off).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5"
              onClick={() => onToggleLock(fixture)}
              title={fixture.is_locked ? "Desbloquear" : "Bloquear"}
            >
              {fixture.is_locked ? (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>

            {/* Quick FT button */}
            {status !== "FT" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10"
                onClick={handleQuickFT}
              >
                <CheckCircle className="w-3 h-3" />
                FT
              </Button>
            )}

            {/* Save button (only show when changes exist) */}
            {hasChanges && (
              <Button
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Guardar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  // Auto-detect first incomplete round
  useEffect(() => {
    if (fixtures.length > 0) {
      const rounds = new Map<number, { total: number; finished: number }>();
      fixtures.forEach((f) => {
        const entry = rounds.get(f.round) || { total: 0, finished: 0 };
        entry.total++;
        if (f.status === "FT") entry.finished++;
        rounds.set(f.round, entry);
      });
      for (let r = 1; r <= TOTAL_ROUNDS; r++) {
        const entry = rounds.get(r);
        if (!entry || entry.finished < entry.total) {
          setCurrentRound(r);
          return;
        }
      }
      setCurrentRound(TOTAL_ROUNDS);
    }
  }, [fixtures.length > 0]); // Only on first load

  // Fetch fixtures
  const fetchFixtures = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        toast.error("Sesión expirada");
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-fixtures`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error fetching fixtures");
      }

      setFixtures(data.fixtures || []);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      toast.error("Error al cargar fixtures");
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  // Auth check
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!isAdmin) {
      const timeout = setTimeout(() => {
        toast.error("Acceso denegado - Se requiere rol de administrador");
        navigate("/");
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Fetch fixtures on mount
  useEffect(() => {
    if (user && isAdmin) fetchFixtures();
  }, [user, isAdmin, fetchFixtures]);

  // Trigger livescore-sync
  const triggerSync = async () => {
    setSyncing(true);
    try {
      const { data: secretData } = await supabase
        .from("app_secrets")
        .select("value")
        .eq("key", "CRON_SECRET")
        .maybeSingle();

      if (!secretData) { toast.error("CRON_SECRET no configurado"); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livescore-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Cron-Secret": secretData.value,
          },
        }
      );

      const data = await response.json();
      if (response.ok) { toast.success("Sincronización ejecutada"); fetchFixtures(); }
      else throw new Error(data.error || "Error en sincronización");
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Error al ejecutar sincronización");
    } finally { setSyncing(false); }
  };

  // Save a single fixture
  const saveFixture = async (fixture: Fixture, homeScore: number | null, awayScore: number | null, status: "NS" | "LIVE" | "FT") => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { toast.error("Sesión expirada"); navigate("/login"); return; }

      const updateData: Record<string, unknown> = {
        id: fixture.id,
        status,
        is_locked: status === "FT" || status === "LIVE",
      };
      if (homeScore !== null) updateData.home_score = homeScore;
      if (awayScore !== null) updateData.away_score = awayScore;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-fixtures`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fixtures: [updateData] }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error saving fixture");

      toast.success(`${fixture.home_id.toUpperCase()} ${homeScore ?? "-"} - ${awayScore ?? "-"} ${fixture.away_id.toUpperCase()} guardado`);
      fetchFixtures();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error al guardar cambios");
    } finally { setSaving(false); }
  };

  // Toggle lock
  const toggleLock = async (fixture: Fixture) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { toast.error("Sesión expirada"); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-fixtures`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fixtures: [{ id: fixture.id, is_locked: !fixture.is_locked }] }),
        }
      );

      if (!response.ok) throw new Error("Error toggling lock");
      toast.success(fixture.is_locked ? "Desbloqueado" : "Bloqueado");
      fetchFixtures();
    } catch (error) {
      console.error("Toggle lock error:", error);
      toast.error("Error al cambiar bloqueo");
    }
  };

  // Filter fixtures by current round
  const roundFixtures = useMemo(() => 
    fixtures.filter(f => f.round === currentRound),
  [fixtures, currentRound]);

  // Round stats
  const roundStats = useMemo(() => {
    const total = roundFixtures.length;
    const finished = roundFixtures.filter(f => f.status === "FT").length;
    const live = roundFixtures.filter(f => f.status === "LIVE").length;
    return { total, finished, live, pending: total - finished - live };
  }, [roundFixtures]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-3 py-2">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-sm font-bold">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={triggerSync} disabled={syncing}>
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Sync
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={fetchFixtures} disabled={loading}>
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={signOut}>
              <LogOut className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Round Navigation */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur border-b border-border px-3 py-2">
        <div className="max-w-2xl mx-auto">
          {/* Round selector pills */}
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setCurrentRound(Math.max(1, currentRound - 1))} disabled={currentRound === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <h2 className="font-bold text-base">Fecha {currentRound}</h2>
              <div className="flex gap-2 text-[10px] text-muted-foreground justify-center">
                {roundStats.finished > 0 && <span className="text-green-400">{roundStats.finished} finalizados</span>}
                {roundStats.live > 0 && <span className="text-red-400">{roundStats.live} en vivo</span>}
                {roundStats.pending > 0 && <span>{roundStats.pending} pendientes</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setCurrentRound(Math.min(TOTAL_ROUNDS, currentRound + 1))} disabled={currentRound === TOTAL_ROUNDS}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Round pills */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((r) => {
              const rFixtures = fixtures.filter(f => f.round === r);
              const allFT = rFixtures.length > 0 && rFixtures.every(f => f.status === "FT");
              const hasLive = rFixtures.some(f => f.status === "LIVE");
              return (
                <Button
                  key={r}
                  variant={currentRound === r ? "default" : "outline"}
                  size="sm"
                  className={`h-6 min-w-[2rem] text-xs shrink-0 ${allFT ? "opacity-50" : ""} ${hasLive ? "border-red-500 text-red-400" : ""}`}
                  onClick={() => setCurrentRound(r)}
                >
                  {r}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Match Cards */}
      <div className="max-w-2xl mx-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : roundFixtures.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay fixtures para esta fecha
          </div>
        ) : (
          roundFixtures.map((fixture) => (
            <AdminMatchCard
              key={fixture.id}
              fixture={fixture}
              onSave={saveFixture}
              onToggleLock={toggleLock}
              saving={saving}
            />
          ))
        )}
      </div>
    </div>
  );
}
