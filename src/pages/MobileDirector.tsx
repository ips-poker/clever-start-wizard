import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Settings,
  Clock,
  Coffee,
  Volume2,
  Mic,
  ArrowLeft
} from "lucide-react";

// Mobile-specific imports
import MobileTournamentTimer from "@/components/MobileTournamentTimer";
import MobilePlayerManagement from "@/components/MobilePlayerManagement";
import MobileTableSeating from "@/components/MobileTableSeating";

// Types
type Tournament = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  buy_in: number;
  max_players: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number | null;
  timer_remaining: number | null;
  rebuy_cost: number | null;
  addon_cost: number | null;
  rebuy_chips: number | null;
  addon_chips: number | null;
  starting_chips: number;
  tournament_format: string | null;
  addon_level: number | null;
  break_start_level: number | null;
  rebuy_end_level: number | null;
  start_time: string;
  created_at: string;
  finished_at: string | null;
  is_published: boolean | null;
  is_archived: boolean | null;
  updated_at: string;
};

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

interface Registration {
  id: string;
  player: Player;
  seat_number: number;
  chips: number;
  status: string;
  rebuys: number;
  addons: number;
  position?: number;
  eliminated_at?: string;
  final_position?: number;
}

const MobileDirector = () => {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournament');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [blindLevels, setBlindLevels] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('timer');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
  useEffect(() => {
    if (tournamentId) {
      loadTournamentData();
    } else {
      // Redirect to tournament selection if no tournament ID
      navigate('/director');
    }
  }, [tournamentId]);

  // Real-time subscriptions for synchronization
  useEffect(() => {
    if (!tournamentId) return;

    const tournamentChannel = supabase
      .channel(`mobile_tournament_${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`
      }, (payload) => {
        if (payload.new) {
          setTournament(prev => ({ ...prev, ...payload.new } as Tournament));
          // Sync timer state
          const newTournament = payload.new as Tournament;
          if (newTournament.timer_remaining !== undefined) {
            setCurrentTime(newTournament.timer_remaining);
          }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_registrations',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        loadRegistrations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blind_levels',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        loadBlindLevels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentChannel);
    };
  }, [tournamentId]);

  // Timer logic
  useEffect(() => {
    if (timerActive && currentTime > 0) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setTimerActive(false);
            nextLevel({ autoResume: true });
            return 0;
          }
          
          // Update database every 10 seconds
          if (newTime % 10 === 0 && tournament) {
            updateTimerInDatabase(newTime);
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, tournament]);

  const loadTournamentData = async () => {
    try {
      // Load tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      
      setTournament(tournamentData);
      setCurrentTime(tournamentData.timer_remaining || tournamentData.timer_duration || 1200);

      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (!playersError && playersData) {
        setPlayers(playersData);
      }

      // Load registrations
      await loadRegistrations();
      await loadBlindLevels();

    } catch (error) {
      console.error('Error loading tournament data:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось загрузить данные турнира", 
        variant: "destructive" 
      });
    }
  };

  const loadRegistrations = async () => {
    if (!tournamentId) return;
    
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        player:players(id, name, email, avatar_url, elo_rating, games_played, wins)
      `)
      .eq('tournament_id', tournamentId);

    if (!error && data) {
      setRegistrations(data);
    }
  };

  const loadBlindLevels = async () => {
    if (!tournamentId) return;
    
    const { data, error } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('level', { ascending: true });

    if (!error && data) {
      setBlindLevels(data);
    }
  };

  const updateTimerInDatabase = async (timeRemaining: number) => {
    if (!tournament) return;
    
    await supabase
      .from('tournaments')
      .update({ timer_remaining: timeRemaining })
      .eq('id', tournament.id);
  };

  const toggleTimer = () => {
    const newTimerActive = !timerActive;
    setTimerActive(newTimerActive);
    
    if (tournament) {
      updateTimerInDatabase(currentTime);
    }
  };

  const resetTimer = () => {
    if (tournament) {
      const resetTime = tournament.timer_duration || 1200;
      setCurrentTime(resetTime);
      setTimerActive(false);
      updateTimerInDatabase(resetTime);
    }
  };

  const nextLevel = async (opts?: { autoResume?: boolean }) => {
    if (!tournament) return;

    const newLevel = tournament.current_level + 1;
    const nextBlindLevel = blindLevels.find(bl => bl.level === newLevel);

    if (!nextBlindLevel) {
      toast({ title: "Предупреждение", description: "Достигнут максимальный уровень", variant: "destructive" });
      return;
    }

    const resetTime = nextBlindLevel.duration || 1200;

    // Update local state immediately
    setTournament(prev => prev ? ({
      ...prev,
      current_level: newLevel,
      current_small_blind: nextBlindLevel.small_blind,
      current_big_blind: nextBlindLevel.big_blind,
      timer_duration: resetTime
    }) : prev);
    setCurrentTime(resetTime);

    if (opts?.autoResume) {
      setTimerActive(true);
    }

    // Update database
    await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: nextBlindLevel.small_blind,
        current_big_blind: nextBlindLevel.big_blind,
        timer_remaining: resetTime,
        timer_duration: resetTime
      })
      .eq('id', tournament.id);

    toast({ 
      title: nextBlindLevel.is_break ? "Перерыв" : `Уровень ${newLevel}`, 
      description: nextBlindLevel.is_break 
        ? `Перерыв ${Math.floor(resetTime / 60)} минут`
        : `Блайнды: ${nextBlindLevel.small_blind}/${nextBlindLevel.big_blind}${nextBlindLevel.ante ? ` (анте ${nextBlindLevel.ante})` : ''}`
    });
  };

  const prevLevel = async () => {
    if (!tournament || tournament.current_level <= 1) return;

    const newLevel = tournament.current_level - 1;
    const prevBlindLevel = blindLevels.find(bl => bl.level === newLevel);

    if (!prevBlindLevel) {
      toast({ title: "Предупреждение", description: "Нельзя вернуться ниже 1-го уровня", variant: "destructive" });
      return;
    }

    const resetTime = prevBlindLevel.duration || 1200;

    // Update local state immediately
    setTournament(prev => prev ? ({
      ...prev,
      current_level: newLevel,
      current_small_blind: prevBlindLevel.small_blind,
      current_big_blind: prevBlindLevel.big_blind,
      timer_duration: resetTime
    }) : prev);
    setCurrentTime(resetTime);

    // Update database
    await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: prevBlindLevel.small_blind,
        current_big_blind: prevBlindLevel.big_blind,
        timer_remaining: resetTime,
        timer_duration: resetTime
      })
      .eq('id', tournament.id);

    toast({ 
      title: `Уровень ${newLevel}`, 
      description: `Блайнды: ${prevBlindLevel.small_blind}/${prevBlindLevel.big_blind}${prevBlindLevel.ante ? ` (анте ${prevBlindLevel.ante})` : ''}`
    });
  };

  const adjustTimer = (seconds: number) => {
    const newTime = Math.max(0, currentTime + seconds);
    setCurrentTime(newTime);
    if (tournament) {
      updateTimerInDatabase(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Загрузка турнира...</h2>
            <Button onClick={() => navigate('/director')} variant="outline">
              Вернуться к выбору турнира
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing' || r.status === 'confirmed');
  const currentBlindLevel = blindLevels.find(level => level.level === tournament.current_level);
  const nextBlindLevel = blindLevels.find(level => level.level === tournament.current_level + 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/director')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
          <div className="text-center">
            <h1 className="font-semibold text-lg truncate">{tournament.name}</h1>
            <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'}>
              {tournament.status === 'running' ? 'Идет игра' : 'Ожидание'}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {activePlayers.length} игроков
          </div>
        </div>
      </div>

      <div className="p-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="timer" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Таймер
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Игроки
            </TabsTrigger>
            <TabsTrigger value="seating" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Рассадка
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timer" className="space-y-4">
            <MobileTournamentTimer
              tournament={tournament}
              currentTime={currentTime}
              timerActive={timerActive}
              blindLevels={blindLevels}
              registrations={registrations}
              onToggleTimer={toggleTimer}
              onResetTimer={resetTimer}
              onNextLevel={() => nextLevel()}
              onPrevLevel={prevLevel}
              onAdjustTimer={adjustTimer}
            />
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <MobilePlayerManagement
              tournament={tournament}
              players={players}
              registrations={registrations}
              onRegistrationUpdate={loadRegistrations}
            />
          </TabsContent>

          <TabsContent value="seating" className="space-y-4">
            <MobileTableSeating
              tournamentId={tournament.id}
              registrations={registrations}
              onSeatingUpdate={loadRegistrations}
              maxPlayersPerTable={9}
              finalTableSize={9}
              bigBlind={tournament.current_big_blind}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MobileDirector;