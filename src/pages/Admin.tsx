import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Edit, 
  Loader2,
  AlertCircle,
  Play,
  CheckCircle,
  Clock,
  Filter,
  LogOut
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

type FilterType = "all" | "no-api-id" | "ns-past-kickoff" | "live-no-score" | "locked";

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  const [editForm, setEditForm] = useState({
    home_score: "",
    away_score: "",
    status: "NS" as "NS" | "LIVE" | "FT",
    is_locked: false,
    kick_off: "",
    api_fixture_id: "",
  });
  const [saving, setSaving] = useState(false);

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

      const filterParam = filter !== "all" ? `?filter=${filter}` : "";
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-fixtures${filterParam}`,
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
  }, [user, filter, navigate]);

  // Effect: Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (!authLoading && user && !isAdmin) {
      toast.error("Acceso denegado - Se requiere rol de administrador");
      navigate("/");
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Effect: Fetch fixtures
  useEffect(() => {
    if (user && isAdmin) {
      fetchFixtures();
    }
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

      if (!secretData) {
        toast.error("CRON_SECRET no configurado");
        return;
      }

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
      
      if (response.ok) {
        toast.success("Sincronización ejecutada");
        fetchFixtures();
      } else {
        throw new Error(data.error || "Error en sincronización");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Error al ejecutar sincronización");
    } finally {
      setSyncing(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (fixture: Fixture) => {
    setEditingFixture(fixture);
    setEditForm({
      home_score: fixture.home_score?.toString() ?? "",
      away_score: fixture.away_score?.toString() ?? "",
      status: fixture.status,
      is_locked: fixture.is_locked,
      kick_off: fixture.kick_off ? new Date(fixture.kick_off).toISOString().slice(0, 16) : "",
      api_fixture_id: fixture.api_fixture_id?.toString() ?? "",
    });
    setEditDialogOpen(true);
  };

  // Save fixture changes
  const saveFixture = async () => {
    if (!editingFixture) return;
    
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        toast.error("Sesión expirada");
        navigate("/login");
        return;
      }

      const updateData: Record<string, unknown> = {
        id: editingFixture.id,
        status: editForm.status,
        is_locked: editForm.is_locked,
      };

      if (editForm.home_score !== "") {
        updateData.home_score = parseInt(editForm.home_score);
      }
      if (editForm.away_score !== "") {
        updateData.away_score = parseInt(editForm.away_score);
      }
      if (editForm.kick_off) {
        updateData.kick_off = new Date(editForm.kick_off).toISOString();
      }
      if (editForm.api_fixture_id !== "") {
        updateData.api_fixture_id = parseInt(editForm.api_fixture_id);
      }

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
      
      if (!response.ok) {
        throw new Error(data.error || "Error saving fixture");
      }

      toast.success("Fixture actualizado");
      setEditDialogOpen(false);
      fetchFixtures();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  // Toggle lock status
  const toggleLock = async (fixture: Fixture) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        toast.error("Sesión expirada");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-fixtures`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fixtures: [{ id: fixture.id, is_locked: !fixture.is_locked }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error toggling lock");
      }

      toast.success(fixture.is_locked ? "Desbloqueado" : "Bloqueado");
      fetchFixtures();
    } catch (error) {
      console.error("Toggle lock error:", error);
      toast.error("Error al cambiar bloqueo");
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return <Badge className="bg-red-500 animate-pulse">EN VIVO</Badge>;
      case "FT":
        return <Badge variant="secondary">FINAL</Badge>;
      default:
        return <Badge variant="outline">NS</Badge>;
    }
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Panel de Administración</h1>
              <p className="text-muted-foreground text-sm">
                Gestión de fixtures • {user?.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={triggerSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Ejecutar Sync
            </Button>
            <Button
              variant="outline"
              onClick={fetchFixtures}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button
              variant="ghost"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros rápidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Todos ({fixtures.length})
              </Button>
              <Button
                variant={filter === "no-api-id" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("no-api-id")}
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Sin API ID
              </Button>
              <Button
                variant={filter === "ns-past-kickoff" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("ns-past-kickoff")}
              >
                <Clock className="w-3 h-3 mr-1" />
                NS con kickoff pasado
              </Button>
              <Button
                variant={filter === "live-no-score" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("live-no-score")}
              >
                <Play className="w-3 h-3 mr-1" />
                LIVE sin score
              </Button>
              <Button
                variant={filter === "locked" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("locked")}
              >
                <Lock className="w-3 h-3 mr-1" />
                Bloqueados
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fixtures Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead className="w-16">Ronda</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Visita</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Bloq.</TableHead>
                    <TableHead>Kick-off</TableHead>
                    <TableHead>API ID</TableHead>
                    <TableHead>Actualizado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : fixtures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No hay fixtures con este filtro
                      </TableCell>
                    </TableRow>
                  ) : (
                    fixtures.map((fixture) => (
                      <TableRow key={fixture.id}>
                        <TableCell className="font-mono text-xs">{fixture.id}</TableCell>
                        <TableCell>{fixture.round}</TableCell>
                        <TableCell className="uppercase font-medium">{fixture.home_id}</TableCell>
                        <TableCell className="uppercase font-medium">{fixture.away_id}</TableCell>
                        <TableCell className="text-center font-bold">
                          {fixture.home_score ?? "-"} - {fixture.away_score ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(fixture.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          {fixture.is_locked ? (
                            <Lock className="w-4 h-4 text-amber-500 mx-auto" />
                          ) : (
                            <Unlock className="w-4 h-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(fixture.kick_off)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {fixture.api_fixture_id || (
                            <span className="text-destructive">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(fixture.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleLock(fixture)}
                              title={fixture.is_locked ? "Desbloquear" : "Bloquear"}
                            >
                              {fixture.is_locked ? (
                                <Unlock className="w-4 h-4" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(fixture)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editar Fixture: {editingFixture?.id}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Score Local ({editingFixture?.home_id})</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.home_score}
                  onChange={(e) => setEditForm({ ...editForm, home_score: e.target.value })}
                  placeholder="-"
                />
              </div>
              <div>
                <Label>Score Visita ({editingFixture?.away_id})</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.away_score}
                  onChange={(e) => setEditForm({ ...editForm, away_score: e.target.value })}
                  placeholder="-"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v as "NS" | "LIVE" | "FT" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NS">NS (No iniciado)</SelectItem>
                  <SelectItem value="LIVE">LIVE (En vivo)</SelectItem>
                  <SelectItem value="FT">FT (Finalizado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_locked"
                checked={editForm.is_locked}
                onChange={(e) => setEditForm({ ...editForm, is_locked: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_locked">Bloqueado (no editable por usuarios)</Label>
            </div>

            <div>
              <Label>Kick-off</Label>
              <Input
                type="datetime-local"
                value={editForm.kick_off}
                onChange={(e) => setEditForm({ ...editForm, kick_off: e.target.value })}
              />
            </div>

            <div>
              <Label>API Fixture ID</Label>
              <Input
                type="number"
                value={editForm.api_fixture_id}
                onChange={(e) => setEditForm({ ...editForm, api_fixture_id: e.target.value })}
                placeholder="ID de API-Football"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveFixture} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
