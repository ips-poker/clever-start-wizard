import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClub } from "@/contexts/ClubContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Users, 
  Clock,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Send,
  Download,
  BarChart3,
  Shuffle,
  Maximize,
  Volume2,
  VolumeX,
  Coins
} from "lucide-react";
import { ClubTournamentMainView } from "./ClubTournamentMainView";
import { ClubTournamentPlayerManagement } from "./ClubTournamentPlayerManagement";
import { ClubTableSeating } from "./ClubTableSeating";
import { ClubTournamentResults } from "./ClubTournamentResults";
import { ClubFullscreenTimer } from "./ClubFullscreenTimer";
import { ClubTelegramIntegration } from "./ClubTelegramIntegration";
import { ClubExportTools } from "./ClubExportTools";
import { ClubPayoutStructure } from "./ClubPayoutStructure";
import { ClubBlindStructure } from "./ClubBlindStructure";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
  max_players: number;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number | null;
  timer_remaining: number | null;
  starting_chips: number;
  reentry_chips: number;
  additional_chips: number;
  tournament_format: string | null;
  reentry_end_level: number | null;
  additional_level: number | null;
  break_start_level: number | null;
  players_per_table: number | null;
  start_time: string;
  created_at: string;
  finished_at: string | null;
  clan_id: string | null;
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
  reentries: number;
  additional_sets: number;
  seat_number: number | null;
  position: number | null;
  final_position: number | null;
  pending_reentry: boolean;
  pending_addon: boolean;
}

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number;
  is_break: boolean;
}

interface ClubTournamentDirectorProps {
  tournamentId: string;
  onBack: () => void;
}

export function ClubTournamentDirector({ tournamentId, onBack }: ClubTournamentDirectorProps) {
  const { club } = useClub();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceAnnouncements = useVoiceAnnouncements();
  
  // State
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("main");
  
  // Timer state
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showFullscreenTimer, setShowFullscreenTimer] = useState(false);

  // Load tournament data
  const loadTournament = useCallback(async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error) {
      console.error('Error loading tournament:', error);
      return;
    }

    setTournament(data);
    
    // Restore timer state from localStorage
    const savedTimerState = localStorage.getItem(`club_timer_${tournamentId}`);
    if (savedTimerState) {
      const { currentTime: savedTime, timerActive: savedActive, lastUpdate } = JSON.parse(savedTimerState);
      const timePassed = Math.floor((Date.now() - lastUpdate) / 1000);
      
      if (savedActive && savedTime > timePassed) {
        setCurrentTime(savedTime - timePassed);
        setTimerActive(true);
      } else {
        setCurrentTime(savedTime);
        setTimerActive(false);
      }
    } else {
      setCurrentTime(data.timer_remaining || data.timer_duration || 900);
    }
  }, [tournamentId]);

  // Load registrations
  const loadRegistrations = useCallback(async () => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        player:players(id, name, avatar_url, elo_rating)
      `)
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error loading registrations:', error);
      return;
    }

    setRegistrations(data || []);
  }, [tournamentId]);

  // Load blind levels
  const loadBlindLevels = useCallback(async () => {
    const { data, error } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('level', { ascending: true });

    if (error) {
      console.error('Error loading blind levels:', error);
      return;
    }

    setBlindLevels(data || []);
  }, [tournamentId]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadTournament(), loadRegistrations(), loadBlindLevels()]);
      setLoading(false);
    };
    load();
  }, [loadTournament, loadRegistrations, loadBlindLevels]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`club_td_${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_registrations',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => loadRegistrations())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`
      }, () => loadTournament())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blind_levels',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => loadBlindLevels())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, loadRegistrations, loadTournament, loadBlindLevels]);

  // Timer effect with auto level transition
  useEffect(() => {
    if (timerActive && tournament) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            // Save completed state
            localStorage.setItem(`club_timer_${tournament.id}`, JSON.stringify({
              currentTime: 0,
              timerActive: false,
              lastUpdate: Date.now()
            }));
            updateTimerInDatabase(0);
            // Auto transition to next level
            handleNextLevel({ autoResume: true });
            return 0;
          }
          
          const newTime = prev - 1;
          
          // Save state every 30 seconds
          if (newTime % 30 === 0) {
            localStorage.setItem(`club_timer_${tournament.id}`, JSON.stringify({
              currentTime: newTime,
              timerActive: true,
              lastUpdate: Date.now()
            }));
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
  }, [timerActive, tournament?.id]);

  // Timer controls
  const toggleTimer = () => {
    const newActive = !timerActive;
    setTimerActive(newActive);
    if (tournament) {
      localStorage.setItem(`club_timer_${tournament.id}`, JSON.stringify({
        currentTime,
        timerActive: newActive,
        lastUpdate: Date.now()
      }));
    }
  };

  const resetTimer = () => {
    if (tournament) {
      const currentBlind = blindLevels.find(bl => bl.level === tournament.current_level);
      const resetTime = currentBlind?.duration || tournament.timer_duration || 900;
      setCurrentTime(resetTime);
      setTimerActive(false);
      localStorage.setItem(`club_timer_${tournament.id}`, JSON.stringify({
        currentTime: resetTime,
        timerActive: false,
        lastUpdate: Date.now()
      }));
      updateTimerInDatabase(resetTime);
    }
  };

  const updateTimerInDatabase = async (time: number) => {
    if (!tournament) return;
    await supabase
      .from('tournaments')
      .update({ timer_remaining: time })
      .eq('id', tournament.id);
  };

  const handleNextLevel = async (opts?: { autoResume?: boolean }) => {
    if (!tournament) return;

    const newLevel = tournament.current_level + 1;
    const nextBlind = blindLevels.find(bl => bl.level === newLevel);

    if (!nextBlind) {
      toast({ title: "Достигнут максимальный уровень", variant: "destructive" });
      return;
    }

    const resetTime = nextBlind.duration || 900;

    // Instant local update
    setTournament(prev => prev ? ({
      ...prev,
      current_level: newLevel,
      current_small_blind: nextBlind.small_blind,
      current_big_blind: nextBlind.big_blind,
      timer_duration: resetTime
    }) : prev);
    setCurrentTime(resetTime);

    const willBeActive = opts?.autoResume ? true : timerActive;
    if (opts?.autoResume) {
      setTimerActive(true);
    }

    localStorage.setItem(`club_timer_${tournament.id}`, JSON.stringify({
      currentTime: resetTime,
      timerActive: willBeActive,
      lastUpdate: Date.now()
    }));

    // Background DB update
    supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: nextBlind.small_blind,
        current_big_blind: nextBlind.big_blind,
        timer_remaining: resetTime,
        timer_duration: resetTime
      })
      .eq('id', tournament.id)
      .then(({ error }) => {
        if (error) console.error('Error updating level:', error);
      });

    // Voice announcements
    setTimeout(() => {
      if (nextBlind.is_break) {
        voiceAnnouncements.announceBreakStart(Math.floor(resetTime / 60));
      } else {
        voiceAnnouncements.announceLevelStart(nextBlind);
      }
    }, 300);

    toast({
      title: nextBlind.is_break ? "Перерыв" : `Уровень ${newLevel}`,
      description: nextBlind.is_break 
        ? `Перерыв ${Math.floor(resetTime / 60)} минут`
        : `Блайнды: ${nextBlind.small_blind}/${nextBlind.big_blind}${nextBlind.ante ? ` (анте ${nextBlind.ante})` : ''}`
    });
  };

  const handlePrevLevel = async () => {
    if (!tournament || tournament.current_level <= 1) return;

    const newLevel = tournament.current_level - 1;
    const prevBlind = blindLevels.find(bl => bl.level === newLevel);

    if (!prevBlind) return;

    const resetTime = prevBlind.duration || 900;

    setTournament(prev => prev ? ({
      ...prev,
      current_level: newLevel,
      current_small_blind: prevBlind.small_blind,
      current_big_blind: prevBlind.big_blind,
      timer_duration: resetTime
    }) : prev);
    setCurrentTime(resetTime);

    await supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: prevBlind.small_blind,
        current_big_blind: prevBlind.big_blind,
        timer_remaining: resetTime,
        timer_duration: resetTime
      })
      .eq('id', tournament.id);

    toast({
      title: `Уровень ${newLevel}`,
      description: `Блайнды: ${prevBlind.small_blind}/${prevBlind.big_blind}`
    });
  };

  const adjustTimer = (seconds: number) => {
    const newTime = Math.max(0, currentTime + seconds);
    setCurrentTime(newTime);
    updateTimerInDatabase(newTime);
    if (tournament) {
      localStorage.setItem(`club_timer_${tournament.id}`, JSON.stringify({
        currentTime: newTime,
        timerActive,
        lastUpdate: Date.now()
      }));
    }
  };

  const handleStartTournament = async () => {
    if (!tournament) return;

    const { error } = await supabase.rpc('start_tournament', {
      tournament_id_param: tournament.id
    });

    if (!error) {
      setTimerActive(true);
      toast({ title: "Турнир запущен!" });
      loadTournament();
    }
  };

  const handlePauseTournament = async () => {
    if (!tournament) return;

    await supabase
      .from('tournaments')
      .update({ status: 'paused' })
      .eq('id', tournament.id);

    setTimerActive(false);
    toast({ title: "Турнир приостановлен" });
    loadTournament();
  };

  const handleResumeTournament = async () => {
    if (!tournament) return;

    await supabase
      .from('tournaments')
      .update({ status: 'running' })
      .eq('id', tournament.id);

    setTimerActive(true);
    toast({ title: "Турнир возобновлён" });
    loadTournament();
  };

  const handleFinishTournament = async () => {
    if (!tournament) return;

    const { error } = await supabase.rpc('complete_tournament', {
      tournament_id_param: tournament.id
    });

    if (!error) {
      setTimerActive(false);
      toast({ title: "Турнир завершён!" });
      loadTournament();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <p>Турнир не найден</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'}>
              {tournament.status === 'running' ? 'Идёт' : 
               tournament.status === 'paused' ? 'Пауза' :
               tournament.status === 'completed' ? 'Завершён' : 'Ожидание'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Уровень {tournament.current_level}
            </span>
          </div>
        </div>
      </div>

      {/* Fullscreen Timer */}
      {showFullscreenTimer && (
        <ClubFullscreenTimer
          tournament={tournament}
          registrations={registrations}
          currentTime={currentTime}
          timerActive={timerActive}
          onToggleTimer={toggleTimer}
          onResetTimer={resetTimer}
          onNextLevel={() => handleNextLevel()}
          onPrevLevel={handlePrevLevel}
          onClose={() => setShowFullscreenTimer(false)}
          onTimerAdjust={adjustTimer}
          clubName={club?.name}
          blindLevels={blindLevels}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8 h-auto p-1 bg-card/50">
          <TabsTrigger value="main" className="flex items-center gap-2 py-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Обзор</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2 py-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Игроки</span>
          </TabsTrigger>
          <TabsTrigger value="seating" className="flex items-center gap-2 py-2">
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Рассадка</span>
          </TabsTrigger>
          <TabsTrigger value="blinds" className="flex items-center gap-2 py-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Блайнды</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2 py-2">
            <Coins className="w-4 h-4" />
            <span className="hidden sm:inline">Призы</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2 py-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Результаты</span>
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2 py-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Telegram</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2 py-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Экспорт</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main">
          <ClubTournamentMainView
            tournament={tournament}
            registrations={registrations}
            blindLevels={blindLevels}
            currentTime={currentTime}
            timerActive={timerActive}
            onToggleTimer={toggleTimer}
            onResetTimer={resetTimer}
            onNextLevel={() => handleNextLevel()}
            onPrevLevel={handlePrevLevel}
            onTimerAdjust={adjustTimer}
            onStartTournament={handleStartTournament}
            onPauseTournament={handlePauseTournament}
            onResumeTournament={handleResumeTournament}
            onFinishTournament={handleFinishTournament}
            onOpenFullscreen={() => setShowFullscreenTimer(true)}
            clubName={club?.name}
          />
        </TabsContent>

        <TabsContent value="players">
          <ClubTournamentPlayerManagement
            tournament={tournament}
            registrations={registrations}
            onUpdate={loadRegistrations}
          />
        </TabsContent>

        <TabsContent value="seating">
          <ClubTableSeating
            tournamentId={tournament.id}
            registrations={registrations}
            playersPerTable={tournament.players_per_table || 9}
            bigBlind={tournament.current_big_blind}
            onSeatingUpdate={loadRegistrations}
          />
        </TabsContent>

        <TabsContent value="blinds">
          <ClubBlindStructure
            tournamentId={tournament.id}
            currentLevel={tournament.current_level}
            onUpdate={loadBlindLevels}
          />
        </TabsContent>

        <TabsContent value="payouts">
          <ClubPayoutStructure
            tournamentId={tournament.id}
            registrations={registrations}
            tournament={tournament}
            onUpdate={loadRegistrations}
          />
        </TabsContent>

        <TabsContent value="results">
          <ClubTournamentResults
            tournament={tournament}
            registrations={registrations}
          />
        </TabsContent>

        <TabsContent value="telegram">
          <ClubTelegramIntegration tournamentId={tournament.id} />
        </TabsContent>

        <TabsContent value="export">
          <ClubExportTools tournament={tournament} registrations={registrations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
