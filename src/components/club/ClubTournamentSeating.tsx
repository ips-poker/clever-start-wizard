import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Shuffle,
  Users,
  Table,
  AlertCircle,
  Loader2,
  ArrowRight,
  Trash2
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  players_per_table: number | null;
}

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  chips: number;
  status: string;
  seat_number: number | null;
}

interface ClubTournamentSeatingProps {
  tournament: Tournament;
  registrations: Registration[];
  onUpdate: () => void;
}

export function ClubTournamentSeating({
  tournament,
  registrations,
  onUpdate
}: ClubTournamentSeatingProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const playersPerTable = tournament.players_per_table || 9;
  const activePlayers = registrations.filter(r => r.status === 'playing');
  const seatedPlayers = activePlayers.filter(r => r.seat_number !== null);
  const unseatedPlayers = activePlayers.filter(r => r.seat_number === null);

  // Group players by table
  const tables: Map<number, Registration[]> = new Map();
  seatedPlayers.forEach(player => {
    const tableNum = Math.ceil((player.seat_number || 1) / playersPerTable);
    if (!tables.has(tableNum)) {
      tables.set(tableNum, []);
    }
    tables.get(tableNum)?.push(player);
  });

  // Sort players within each table by seat number
  tables.forEach((players) => {
    players.sort((a, b) => (a.seat_number || 0) - (b.seat_number || 0));
  });

  const totalTables = Math.max(1, Math.ceil(activePlayers.length / playersPerTable));

  // Random seating
  const randomSeating = async () => {
    setIsLoading(true);
    try {
      const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
      
      const updates = shuffled.map((reg, index) => ({
        id: reg.id,
        seat_number: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('tournament_registrations')
          .update({ seat_number: update.seat_number })
          .eq('id', update.id);
      }

      toast({ title: "Рассадка выполнена", description: `${updates.length} игроков рассажены` });
      onUpdate();
    } catch (error) {
      console.error('Error seating players:', error);
      toast({ title: "Ошибка рассадки", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Balance tables
  const balanceTables = async () => {
    setIsLoading(true);
    try {
      // Get all seated players
      const seated = [...seatedPlayers];
      const tableCount = totalTables;
      const idealPerTable = Math.ceil(seated.length / tableCount);

      // Redistribute players evenly
      const newAssignments: { id: string; seat_number: number }[] = [];
      seated.forEach((player, index) => {
        const newSeat = index + 1;
        newAssignments.push({ id: player.id, seat_number: newSeat });
      });

      for (const assignment of newAssignments) {
        await supabase
          .from('tournament_registrations')
          .update({ seat_number: assignment.seat_number })
          .eq('id', assignment.id);
      }

      toast({ title: "Столы сбалансированы" });
      onUpdate();
    } catch (error) {
      console.error('Error balancing tables:', error);
      toast({ title: "Ошибка балансировки", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all seating
  const clearSeating = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: null })
        .eq('tournament_id', tournament.id)
        .eq('status', 'playing');

      toast({ title: "Рассадка очищена" });
      onUpdate();
    } catch (error) {
      console.error('Error clearing seating:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Move player to specific seat
  const movePlayer = async (regId: string, newSeat: number) => {
    try {
      // Check if seat is occupied
      const occupant = seatedPlayers.find(r => r.seat_number === newSeat);
      
      if (occupant) {
        // Swap seats
        const player = seatedPlayers.find(r => r.id === regId);
        if (player) {
          await supabase
            .from('tournament_registrations')
            .update({ seat_number: player.seat_number })
            .eq('id', occupant.id);
        }
      }

      await supabase
        .from('tournament_registrations')
        .update({ seat_number: newSeat })
        .eq('id', regId);

      onUpdate();
    } catch (error) {
      console.error('Error moving player:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={randomSeating} disabled={isLoading || activePlayers.length === 0}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Shuffle className="w-4 h-4 mr-2" />
          )}
          Случайная рассадка
        </Button>
        <Button variant="outline" onClick={balanceTables} disabled={isLoading || seatedPlayers.length === 0}>
          <ArrowRight className="w-4 h-4 mr-2" />
          Балансировать столы
        </Button>
        <Button variant="destructive" onClick={clearSeating} disabled={isLoading || seatedPlayers.length === 0}>
          <Trash2 className="w-4 h-4 mr-2" />
          Очистить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <Table className="w-6 h-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{tables.size || totalTables}</p>
            <p className="text-xs text-muted-foreground">Столов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{seatedPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Рассажено</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{unseatedPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Без места</p>
          </CardContent>
        </Card>
      </div>

      {/* Unseated Players */}
      {unseatedPlayers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-4 h-4" />
              Игроки без места ({unseatedPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unseatedPlayers.map(reg => (
                <Badge key={reg.id} variant="secondary" className="py-1 px-2">
                  {reg.player.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: totalTables }).map((_, tableIndex) => {
          const tableNum = tableIndex + 1;
          const tablePlayers = tables.get(tableNum) || [];

          return (
            <Card key={tableNum}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    Стол {tableNum}
                  </span>
                  <Badge variant="outline">
                    {tablePlayers.length}/{playersPerTable}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Visual table representation */}
                <div className="relative aspect-[2/1] bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-full border-4 border-amber-800/50 mb-4">
                  {/* Seats around the table */}
                  {Array.from({ length: playersPerTable }).map((_, seatIndex) => {
                    const seatNum = (tableIndex * playersPerTable) + seatIndex + 1;
                    const player = tablePlayers.find(p => p.seat_number === seatNum);
                    const angle = (seatIndex / playersPerTable) * Math.PI * 2 - Math.PI / 2;
                    const x = 50 + 40 * Math.cos(angle);
                    const y = 50 + 35 * Math.sin(angle);

                    return (
                      <div
                        key={seatIndex}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        {player ? (
                          <div className="flex flex-col items-center">
                            <Avatar className="h-8 w-8 ring-2 ring-green-500">
                              <AvatarImage src={player.player.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-green-500 text-white">
                                {player.player.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] mt-1 max-w-16 truncate text-center">
                              {player.player.name}
                            </span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                            {seatIndex + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Player list */}
                {tablePlayers.length > 0 && (
                  <div className="space-y-1">
                    {tablePlayers.map(player => (
                      <div key={player.id} className="flex items-center justify-between text-sm p-1 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 justify-center">
                            {(player.seat_number || 0) % playersPerTable || playersPerTable}
                          </Badge>
                          <span>{player.player.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {((player.chips || 0) / 1000).toFixed(1)}K
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {tablePlayers.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Нет игроков за столом
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}