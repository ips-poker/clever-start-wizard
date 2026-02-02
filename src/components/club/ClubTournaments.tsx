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
import { 
  Plus, 
  Trophy, 
  Calendar, 
  Users, 
  Play, 
  Pause,
  CheckCircle,
  Clock,
  Loader2
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

export function ClubTournaments() {
  const { club, canCreateTournament } = useClub();
  const { tournaments, loading, createTournament } = useClubTournaments({ clanId: club?.id });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: "",
    description: "",
    start_time: "",
    max_players: 9,
    starting_chips: 10000,
    participation_fee: 0
  });

  const handleCreate = async () => {
    if (!newTournament.name || !newTournament.start_time) return;
    
    await createTournament.mutateAsync({
      ...newTournament,
      start_time: new Date(newTournament.start_time).toISOString()
    });
    
    setIsCreateOpen(false);
    setNewTournament({
      name: "",
      description: "",
      start_time: "",
      max_players: 9,
      starting_chips: 10000,
      participation_fee: 0
    });
  };

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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Создать турнир</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Название *</Label>
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
                  <Label>Макс. игроков</Label>
                  <Input
                    type="number"
                    value={newTournament.max_players}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, max_players: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Стартовые фишки</Label>
                  <Input
                    type="number"
                    value={newTournament.starting_chips}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, starting_chips: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Взнос, ₽</Label>
                <Input
                  type="number"
                  value={newTournament.participation_fee}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, participation_fee: Number(e.target.value) }))}
                />
              </div>

              <Button 
                className="w-full" 
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
                        {tournament.participation_fee > 0 && (
                          <span className="text-primary font-medium">
                            {tournament.participation_fee.toLocaleString()} ₽
                          </span>
                        )}
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/director?tournament=${tournament.id}`}
                    >
                      Открыть
                    </Button>
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
