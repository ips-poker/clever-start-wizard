import { useState, useMemo } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useClubTournaments } from "@/hooks/useClubTournaments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trophy, 
  Calendar, 
  Users, 
  Play, 
  Pause,
  CheckCircle,
  Clock,
  Loader2,
  Settings,
  Coins,
  RefreshCw,
  PlusCircle,
  Filter,
  LayoutGrid,
  List
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ClubTournamentDirector } from "./ClubTournamentDirector";
import { ClubTournamentCard } from "./ClubTournamentCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const STATUS_CONFIG = {
  scheduled: { label: "Запланирован", color: "bg-blue-500/10 text-blue-500", icon: Clock },
  registration: { label: "Регистрация", color: "bg-amber-500/10 text-amber-500", icon: Users },
  running: { label: "Идёт", color: "bg-green-500/10 text-green-500", icon: Play },
  paused: { label: "Пауза", color: "bg-orange-500/10 text-orange-500", icon: Pause },
  completed: { label: "Завершён", color: "bg-muted text-muted-foreground", icon: CheckCircle }
};

const TOURNAMENT_FORMATS = [
  { value: 'freezeout', label: 'Freezeout', description: 'Без повторного входа' },
  { value: 'reentry', label: 'Re-entry', description: 'С повторным входом' },
  { value: 'additional', label: 'Addon', description: 'С дополнительным набором' }
];

interface TournamentFormData {
  name: string;
  description: string;
  start_time: string;
  max_players: number;
  starting_chips: number;
  participation_fee: number;
  tournament_format: string;
  // Re-entry settings
  reentry_fee: number;
  reentry_chips: number;
  reentry_end_level: number;
  // Addon settings  
  additional_fee: number;
  additional_chips: number;
  additional_level: number;
  // Timer settings
  timer_duration: number;
  break_start_level: number;
  players_per_table: number;
}

const DEFAULT_FORM_DATA: TournamentFormData = {
  name: "",
  description: "",
  start_time: "",
  max_players: 9,
  starting_chips: 10000,
  participation_fee: 0,
  tournament_format: "freezeout",
  reentry_fee: 0,
  reentry_chips: 10000,
  reentry_end_level: 6,
  additional_fee: 0,
  additional_chips: 5000,
  additional_level: 4,
  timer_duration: 15,
  break_start_level: 6,
  players_per_table: 9
};

export function ClubTournaments() {
  const { club, canCreateTournament, isOwner, isAdmin } = useClub();
  const { tournaments, loading, createTournament, deleteTournament, refetch } = useClubTournaments({ clanId: club?.id });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formTab, setFormTab] = useState("basic");
  const [newTournament, setNewTournament] = useState<TournamentFormData>(DEFAULT_FORM_DATA);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch registration counts for all tournaments
  const { data: registrationCounts } = useQuery({
    queryKey: ["tournament-registration-counts", club?.id],
    queryFn: async () => {
      if (!tournaments.length) return {};
      
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('tournament_id')
        .in('tournament_id', tournaments.map(t => t.id));
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(reg => {
        counts[reg.tournament_id] = (counts[reg.tournament_id] || 0) + 1;
      });
      return counts;
    },
    enabled: tournaments.length > 0,
  });

  // Filter tournaments by status
  const filteredTournaments = useMemo(() => {
    if (statusFilter === "all") return tournaments;
    return tournaments.filter(t => t.status === statusFilter);
  }, [tournaments, statusFilter]);

  // Enhance tournaments with registration counts
  const enhancedTournaments = useMemo(() => {
    return filteredTournaments.map(t => ({
      ...t,
      registrations_count: registrationCounts?.[t.id] || 0
    }));
  }, [filteredTournaments, registrationCounts]);

  // Status counts for filters
  const statusCounts = useMemo(() => {
    return {
      all: tournaments.length,
      scheduled: tournaments.filter(t => t.status === 'scheduled').length,
      registration: tournaments.filter(t => t.status === 'registration').length,
      running: tournaments.filter(t => t.status === 'running' || t.status === 'paused').length,
      completed: tournaments.filter(t => t.status === 'completed').length,
    };
  }, [tournaments]);

  // If a tournament is selected, show the full Tournament Director
  if (selectedTournamentId) {
    return (
      <ClubTournamentDirector
        tournamentId={selectedTournamentId}
        onBack={() => setSelectedTournamentId(null)}
      />
    );
  }

  const handleCreate = async () => {
    if (!newTournament.name || !newTournament.start_time) return;
    
    const tournamentData: any = {
      name: newTournament.name,
      description: newTournament.description || undefined,
      start_time: new Date(newTournament.start_time).toISOString(),
      max_players: newTournament.max_players,
      starting_chips: newTournament.starting_chips,
      participation_fee: newTournament.participation_fee,
      tournament_format: newTournament.tournament_format,
      timer_duration: newTournament.timer_duration * 60, // convert to seconds
      players_per_table: newTournament.players_per_table,
      break_start_level: newTournament.break_start_level
    };

    // Add re-entry settings if format supports it
    if (newTournament.tournament_format === 'reentry') {
      tournamentData.reentry_fee = newTournament.reentry_fee;
      tournamentData.reentry_chips = newTournament.reentry_chips;
      tournamentData.reentry_end_level = newTournament.reentry_end_level;
    }

    // Add addon settings if format supports it
    if (newTournament.tournament_format === 'additional') {
      tournamentData.additional_fee = newTournament.additional_fee;
      tournamentData.additional_chips = newTournament.additional_chips;
      tournamentData.additional_level = newTournament.additional_level;
    }
    
    await createTournament.mutateAsync(tournamentData);
    
    setIsCreateOpen(false);
    setNewTournament(DEFAULT_FORM_DATA);
    setFormTab("basic");
  };

  const canManageTournaments = isOwner || isAdmin;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Турниры клуба</h2>
          <p className="text-sm text-muted-foreground">
            {tournaments.length} турниров
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-md brutal-border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-none rounded-l-md"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-none rounded-r-md"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canCreateTournament} className="brutal-border">
                <Plus className="w-4 h-4 mr-2" />
                Новый турнир
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Создать турнир
              </DialogTitle>
            </DialogHeader>
            
            <Tabs value={formTab} onValueChange={setFormTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Основное</TabsTrigger>
                <TabsTrigger value="format">Формат</TabsTrigger>
                <TabsTrigger value="settings">Настройки</TabsTrigger>
              </TabsList>

              {/* Basic Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Название турнира *</Label>
                  <Input
                    value={newTournament.name}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Еженедельный фрироллл"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    value={newTournament.description}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Описание турнира..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Дата и время начала *</Label>
                  <Input
                    type="datetime-local"
                    value={newTournament.start_time}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Организационный взнос (₽)</Label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={newTournament.participation_fee}
                        onChange={(e) => setNewTournament(prev => ({ ...prev, participation_fee: Number(e.target.value) }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Макс. игроков</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={newTournament.max_players}
                        onChange={(e) => setNewTournament(prev => ({ ...prev, max_players: Number(e.target.value) }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Format Tab */}
              <TabsContent value="format" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Формат турнира</Label>
                  <Select
                    value={newTournament.tournament_format}
                    onValueChange={(value) => setNewTournament(prev => ({ ...prev, tournament_format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOURNAMENT_FORMATS.map(format => (
                        <SelectItem key={format.value} value={format.value}>
                          <div className="flex flex-col">
                            <span>{format.label}</span>
                            <span className="text-xs text-muted-foreground">{format.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Стартовые фишки</Label>
                    <Input
                      type="number"
                      value={newTournament.starting_chips}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, starting_chips: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Игроков за столом</Label>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      value={newTournament.players_per_table}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, players_per_table: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                {/* Re-entry settings */}
                {newTournament.tournament_format === 'reentry' && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Настройки Re-entry
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Стоимость (₽)</Label>
                          <Input
                            type="number"
                            value={newTournament.reentry_fee}
                            onChange={(e) => setNewTournament(prev => ({ ...prev, reentry_fee: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Фишки</Label>
                          <Input
                            type="number"
                            value={newTournament.reentry_chips}
                            onChange={(e) => setNewTournament(prev => ({ ...prev, reentry_chips: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">До уровня</Label>
                          <Input
                            type="number"
                            value={newTournament.reentry_end_level}
                            onChange={(e) => setNewTournament(prev => ({ ...prev, reentry_end_level: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Addon settings */}
                {newTournament.tournament_format === 'additional' && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <PlusCircle className="w-4 h-4" />
                        Настройки Addon
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Стоимость (₽)</Label>
                          <Input
                            type="number"
                            value={newTournament.additional_fee}
                            onChange={(e) => setNewTournament(prev => ({ ...prev, additional_fee: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Фишки</Label>
                          <Input
                            type="number"
                            value={newTournament.additional_chips}
                            onChange={(e) => setNewTournament(prev => ({ ...prev, additional_chips: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">На уровне</Label>
                          <Input
                            type="number"
                            value={newTournament.additional_level}
                            onChange={(e) => setNewTournament(prev => ({ ...prev, additional_level: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Длительность уровня (мин)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={newTournament.timer_duration}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, timer_duration: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Перерыв после уровня</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newTournament.break_start_level}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, break_start_level: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <Card className="border-dashed">
                  <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Дополнительные настройки (структура блайндов, выплаты) доступны после создания турнира через Tournament Director
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-4 border-t mt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsCreateOpen(false)}
              >
                Отмена
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreate}
                disabled={!newTournament.name || !newTournament.start_time || createTournament.isPending}
              >
                {createTournament.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trophy className="w-4 h-4 mr-2" />
                )}
                Создать турнир
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
          className="brutal-border"
        >
          Все ({statusCounts.all})
        </Button>
        <Button
          variant={statusFilter === "scheduled" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("scheduled")}
          className="brutal-border"
        >
          <Clock className="w-3 h-3 mr-1" />
          Запланировано ({statusCounts.scheduled})
        </Button>
        <Button
          variant={statusFilter === "registration" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("registration")}
          className="brutal-border"
        >
          <Users className="w-3 h-3 mr-1" />
          Регистрация ({statusCounts.registration})
        </Button>
        <Button
          variant={statusFilter === "running" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("running")}
          className="brutal-border"
        >
          <Play className="w-3 h-3 mr-1" />
          Идёт ({statusCounts.running})
        </Button>
        <Button
          variant={statusFilter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("completed")}
          className="brutal-border"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Завершено ({statusCounts.completed})
        </Button>
      </div>

      {/* Tournaments Grid/List */}
      {enhancedTournaments.length === 0 ? (
        <Card className="brutal-border">
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {statusFilter === "all" ? "Нет турниров" : "Нет турниров с таким статусом"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {statusFilter === "all" 
                ? "Создайте первый турнир для вашего клуба"
                : "Попробуйте изменить фильтр"}
            </p>
            {statusFilter === "all" && (
              <Button onClick={() => setIsCreateOpen(true)} disabled={!canCreateTournament} className="brutal-border">
                <Plus className="w-4 h-4 mr-2" />
                Создать турнир
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" 
          : "space-y-4"
        }>
          {enhancedTournaments.map((tournament, index) => (
            <ClubTournamentCard
              key={tournament.id}
              tournament={tournament}
              index={index}
              onManage={(id) => setSelectedTournamentId(id)}
              onDelete={async (id) => {
                await deleteTournament.mutateAsync(id);
              }}
              onRefresh={refetch}
              canManage={canManageTournaments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
