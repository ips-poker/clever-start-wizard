import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
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
  PlusCircle
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

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
  const { tournaments, loading, createTournament, deleteTournament } = useClubTournaments({ clanId: club?.id });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formTab, setFormTab] = useState("basic");
  const [newTournament, setNewTournament] = useState<TournamentFormData>(DEFAULT_FORM_DATA);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Турниры клуба</h2>
          <p className="text-sm text-muted-foreground">
            {tournaments.length} турниров
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canCreateTournament}>
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

      {/* Tournaments List */}
      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет турниров</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте первый турнир для вашего клуба
            </p>
            <Button onClick={() => setIsCreateOpen(true)} disabled={!canCreateTournament}>
              <Plus className="w-4 h-4 mr-2" />
              Создать турнир
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tournaments.map((tournament) => {
            const status = STATUS_CONFIG[tournament.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.scheduled;
            const StatusIcon = status.icon;
            
            return (
              <Card key={tournament.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{tournament.name}</h3>
                        <Badge className={status.color} variant="secondary">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        {tournament.tournament_format && tournament.tournament_format !== 'freezeout' && (
                          <Badge variant="outline" className="text-xs">
                            {tournament.tournament_format === 'reentry' ? 'Re-entry' : 'Addon'}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(tournament.start_time), "dd MMM yyyy, HH:mm", { locale: ru })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {tournament.max_players} мест
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          {tournament.starting_chips?.toLocaleString()} фишек
                        </span>
                        {tournament.participation_fee > 0 && (
                          <span className="text-primary font-medium">
                            {tournament.participation_fee.toLocaleString()} ₽
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/director?tournament=${tournament.id}`}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Управление
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
