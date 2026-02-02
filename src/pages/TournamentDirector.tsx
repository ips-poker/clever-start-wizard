import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TournamentDirectorSidebar } from '@/components/TournamentDirectorSidebar';
import { 
  Trophy, 
  Users, 
  Settings, 
  BarChart3, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Square,
  Timer,
  AlertTriangle,
  Mic,
  Volume2,
  Gamepad2,
  Archive,
  FolderArchive
} from "lucide-react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { TournamentCreationModal } from "@/components/TournamentCreationModal";
import { VoiceControl } from "@/components/VoiceControl";
import { TournamentDirectorMobileMenu } from "@/components/TournamentDirectorMobileMenu";
import TournamentOverview from "@/components/TournamentOverview";
import TournamentPlayerManagement from "@/components/TournamentPlayerManagement";
import { adaptTournamentToModern, adaptRegistrationsToModern } from "@/utils/tournamentTypeAdapter";
import BlindStructure from "@/components/BlindStructure";
import PrizeStructureManager from "@/components/PrizeStructureManager";
import ManualAdjustments from "@/components/ManualAdjustments";
import RatingManagement from "@/components/RatingManagement";
import TournamentResults from "@/components/TournamentResults";
import TournamentSyncManager from "@/components/TournamentSyncManager";
import RatingSystemTest from "@/components/RatingSystemTest";
import TournamentAnalysisAndRating from "@/components/TournamentAnalysisAndRating";
import RatingSystemAdvancedSettingsTooltips from "@/components/RatingSystemAdvancedSettingsTooltips";
import ProfessionalRatingSettings from '@/components/ProfessionalRatingSettings';
import OfflinePokerRatingAnalyzer from '@/components/OfflinePokerRatingAnalyzer';
import OfflinePokerProfileManager from '@/components/OfflinePokerProfileManager';
import IntegratedTournamentRatingSettings from '@/components/IntegratedTournamentRatingSettings';
import { RecalculateRatings } from '@/components/RecalculateRatings';
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import { OnlinePokerManagement } from '@/components/poker/OnlinePokerManagement';
import { SoundDemo } from '@/components/poker/SoundDemo';
// Используем типы из базы данных
type Tournament = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  buy_in: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
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
}

interface Registration {
  id: string;
  player: Player;
  seat_number: number;
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  position?: number;
  rebuys?: number;
  addons?: number;
}

const TournamentDirector = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastAnnouncedTime, setLastAnnouncedTime] = useState<number | null>(null);
  const [blindLevelsCache, setBlindLevelsCache] = useState<any[]>([]);
  // Инициализация голосовых объявлений
  const voiceAnnouncements = useVoiceAnnouncements();

  // Load data on component mount
  useEffect(() => {
    loadTournaments();
    loadPlayers();
  }, []);

  // Auto-select tournament logic
  useEffect(() => {
    if (tournaments.length > 0 && !selectedTournament) {
      const savedTournamentId = localStorage.getItem('selectedTournamentId');
      
      let tournamentToSelect = null;
      
      if (savedTournamentId) {
        tournamentToSelect = tournaments.find(t => t.id === savedTournamentId);
      }
      
      if (!tournamentToSelect) {
        tournamentToSelect = tournaments.find(t => t.status === 'running') || tournaments[0];
      }
      
      if (tournamentToSelect) {
        setSelectedTournament(tournamentToSelect);
        localStorage.setItem('selectedTournamentId', tournamentToSelect.id);
      }
    }
  }, [tournaments, selectedTournament]);

  // Load registrations when tournament changes
  useEffect(() => {
    if (selectedTournament) {
      loadRegistrations(selectedTournament.id);
      
      // Восстановить состояние таймера из localStorage
      const savedTimerState = localStorage.getItem(`timer_${selectedTournament.id}`);
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
        setCurrentTime(selectedTournament.timer_remaining || selectedTournament.timer_duration || 1200);
        setTimerActive(false);
      }
      
      localStorage.setItem('selectedTournamentId', selectedTournament.id);
    }
  }, [selectedTournament]);

  // Кэшируем структуру блайндов для мгновенного переключения уровней
  useEffect(() => {
    const load = async () => {
      if (!selectedTournament?.id) return;
      const { data } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .order('level', { ascending: true });
      setBlindLevelsCache(data || []);
    };

    load();

    if (!selectedTournament?.id) return;
    const channel = supabase
      .channel(`td_blinds_cache_${selectedTournament.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blind_levels',
        filter: `tournament_id=eq.${selectedTournament.id}`
      }, () => {
        load();
      });
    
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTournament?.id]);

  // Timer effect with voice announcements
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            // Сохранить завершенное состояние
            if (selectedTournament) {
              localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
                currentTime: 0,
                timerActive: false,
                lastUpdate: Date.now()
              }));
              updateTimerInDatabase(0);
            }
            
            // Автоматический мгновенный переход к следующему уровню (без ожидания БД)
            nextLevel({ autoResume: true });
            
            return 0;
          }
          
          const newTime = prev - 1;
          
          // Сохранить текущее состояние каждые 30 секунд (реже чтобы не создавать конфликтов)
          if (newTime % 30 === 0 && selectedTournament) {
            localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
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
  }, [timerActive, selectedTournament?.id]);

  // Голосовые объявления на основе времени таймера
  useEffect(() => {
    if (!timerActive || !selectedTournament) return;

    // Объявления по времени - передаем правильные значения в секундах
    if (currentTime === 300 && lastAnnouncedTime !== 300) { // 5 минут
      voiceAnnouncements.announceTimeWarning(300); // 300 секунд = 5 минут
      setLastAnnouncedTime(300);
    } else if (currentTime === 120 && lastAnnouncedTime !== 120) { // 2 минуты
      voiceAnnouncements.announceTimeWarning(120); // 120 секунд = 2 минуты
      setLastAnnouncedTime(120);
    } else if (currentTime === 60 && lastAnnouncedTime !== 60) { // 1 минута
      voiceAnnouncements.announceTimeWarning(60); // 60 секунд = 1 минута
      setLastAnnouncedTime(60);
    } else if (currentTime === 30 && lastAnnouncedTime !== 30) { // 30 секунд
      voiceAnnouncements.announceTimeWarning(30); // 30 секунд
      setLastAnnouncedTime(30);
    } else if (currentTime === 10 && lastAnnouncedTime !== 10) { // 10 секунд
      voiceAnnouncements.announceTimeWarning(10); // 10 секунд
      setLastAnnouncedTime(10);
    }

    // Сброс при смене времени уровня
    if (currentTime > (lastAnnouncedTime || 0) + 60) {
      setLastAnnouncedTime(null);
    }
  }, [currentTime, timerActive, selectedTournament?.current_level, voiceAnnouncements, lastAnnouncedTime]);

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTournaments(data);
    }
  };

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name');

    if (!error && data) {
      setPlayers(data);
    }
  };

  const loadRegistrations = async (tournamentId: string) => {
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

  const updateTimerInDatabase = async (timeRemaining: number) => {
    if (!selectedTournament) return;
    
    // Используем безопасную RPC функцию для обновления таймера
    await supabase.rpc('update_timer_only_safe', {
      p_tournament_id: selectedTournament.id,
      p_timer_remaining: timeRemaining
    });
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    console.log('Selecting tournament:', tournament.id);
    setSelectedTournament(tournament);
    
    // Остановим таймер при смене турнира
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setTimerActive(false);
    }
  };

  const toggleTimer = () => {
    const newTimerActive = !timerActive;
    setTimerActive(newTimerActive);
    
    // Сохранить состояние при переключении
    if (selectedTournament) {
      localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
        currentTime,
        timerActive: newTimerActive,
        lastUpdate: Date.now()
      }));
    }
  };

  const resetTimer = () => {
    if (selectedTournament) {
      const resetTime = selectedTournament.timer_duration || 1200;
      setCurrentTime(resetTime);
      setTimerActive(false);
      
      // Сохранить сброшенное состояние
      localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
        currentTime: resetTime,
        timerActive: false,
        lastUpdate: Date.now()
      }));
      updateTimerInDatabase(resetTime);
    }
  };

  const nextLevel = async (opts?: { autoResume?: boolean }) => {
    if (!selectedTournament) return;

    const newLevel = selectedTournament.current_level + 1;

    let nextBlindLevel: any = blindLevelsCache.find((bl: any) => bl.level === newLevel);

    if (!nextBlindLevel) {
      const { data: blindData } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .order('level', { ascending: true });
      setBlindLevelsCache(blindData || []);
      nextBlindLevel = blindData?.find((bl: any) => bl.level === newLevel);
    }

    if (!nextBlindLevel) {
      toast({ title: "Предупреждение", description: "Достигнут максимальный уровень", variant: "destructive" });
      return;
    }

    const resetTime = nextBlindLevel.duration || 1200;

    // МГНОВЕННОЕ локальное обновление без ожидания БД
    setSelectedTournament(prev => prev ? ({
      ...prev,
      current_level: newLevel,
      current_small_blind: nextBlindLevel.small_blind,
      current_big_blind: nextBlindLevel.big_blind,
      timer_duration: resetTime
    }) : prev);
    setCurrentTime(resetTime);

    const willBeActive = opts?.autoResume ? true : timerActive;
    if (opts?.autoResume) {
      setTimerActive(true);
    }

    localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
      currentTime: resetTime,
      timerActive: willBeActive,
      lastUpdate: Date.now()
    }));

    // Обновление БД — фоново, без await
    supabase
      .from('tournaments')
      .update({
        current_level: newLevel,
        current_small_blind: nextBlindLevel.small_blind,
        current_big_blind: nextBlindLevel.big_blind,
        timer_remaining: resetTime,
        timer_duration: resetTime
      })
      .eq('id', selectedTournament.id)
      .then(({ error }) => {
        if (error) {
          console.error('Ошибка обновления уровня в БД:', error);
        }
      });

    // Голосовые оповещения с небольшой задержкой для плавности
    setTimeout(() => {
      if (nextBlindLevel.is_break) {
        voiceAnnouncements.announceBreakStart(Math.floor(resetTime / 60));
      } else {
        voiceAnnouncements.announceLevelStart(nextBlindLevel);
      }
    }, 300);

    toast({ 
      title: nextBlindLevel.is_break ? "Перерыв" : `Уровень ${newLevel}`, 
      description: nextBlindLevel.is_break 
        ? `Перерыв ${Math.floor(resetTime / 60)} минут`
        : `Блайнды: ${nextBlindLevel.small_blind}/${nextBlindLevel.big_blind}${nextBlindLevel.ante ? ` (анте ${nextBlindLevel.ante})` : ''}`
    });
  };

  const prevLevel = async () => {
    if (!selectedTournament || selectedTournament.current_level <= 1) return;

    const newLevel = selectedTournament.current_level - 1;

    let prevBlindLevel: any = blindLevelsCache.find((bl: any) => bl.level === newLevel);
    if (!prevBlindLevel) {
      const { data: blindData } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .order('level', { ascending: true });
      setBlindLevelsCache(blindData || []);
      prevBlindLevel = blindData?.find((bl: any) => bl.level === newLevel);
    }

    if (!prevBlindLevel) {
      toast({ title: "Предупреждение", description: "Нельзя вернуться ниже 1-го уровня", variant: "destructive" });
      return;
    }

    const resetTime = prevBlindLevel.duration || 1200;

    // МГНОВЕННОЕ локальное обновление без ожидания БД
    setSelectedTournament(prev => prev ? ({
      ...prev,
      current_level: newLevel,
      current_small_blind: prevBlindLevel.small_blind,
      current_big_blind: prevBlindLevel.big_blind,
      timer_duration: resetTime
    }) : prev);
    setCurrentTime(resetTime);

    localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
      currentTime: resetTime,
      timerActive, // сохраняем текущее состояние таймера
      lastUpdate: Date.now()
    }));

    // Обновление БД через безопасную RPC функцию — фоново, без await
    supabase.rpc('update_tournament_level_safe', {
      p_tournament_id: selectedTournament.id,
      p_current_level: newLevel,
      p_small_blind: prevBlindLevel.small_blind,
      p_big_blind: prevBlindLevel.big_blind,
      p_timer_remaining: resetTime,
      p_timer_duration: resetTime
    }).then(({ error }) => {
      if (error) {
        console.error('Ошибка обновления уровня в БД:', error);
      }
    });

    toast({ 
      title: prevBlindLevel.is_break ? "Перерыв" : `Уровень ${newLevel}`, 
      description: prevBlindLevel.is_break 
        ? `Перерыв ${Math.floor(resetTime / 60)} минут`
        : `Блайнды: ${prevBlindLevel.small_blind}/${prevBlindLevel.big_blind}${prevBlindLevel.ante ? ` (анте ${prevBlindLevel.ante})` : ''}`
    });
  };

  const stopTournament = async () => {
    if (!selectedTournament) return;

    const { data, error } = await supabase.rpc('complete_tournament', {
      tournament_id_param: selectedTournament.id
    });

    if (!error) {
      setSelectedTournament({ ...selectedTournament, status: 'completed' });
      setTimerActive(false);
      toast({ title: "Турнир завершен" });
      loadTournaments();
    }
  };

  const onTimerAdjust = (seconds: number) => {
    const newTime = Math.max(0, currentTime + seconds);
    setCurrentTime(newTime);
    
    // Сохранить изменение
    if (selectedTournament) {
      localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
        currentTime: newTime,
        timerActive,
        lastUpdate: Date.now()
      }));
      updateTimerInDatabase(newTime);
    }
  };

  const onFinishTournament = async () => {
    if (!selectedTournament) return;

    const { data, error } = await supabase.rpc('complete_tournament', {
      tournament_id_param: selectedTournament.id
    });

    if (!error) {
      setSelectedTournament({ 
        ...selectedTournament, 
        status: 'completed',
        finished_at: new Date().toISOString()
      });
      setTimerActive(false);
      toast({ title: "Турнир завершен" });
      loadTournaments();
    }
  };

  // Обработчик голосовых команд
  const handleVoiceAction = async (action: string, data?: any) => {
    console.log('Voice action received:', action, data);
    
    try {
      switch (action) {
        // УПРАВЛЕНИЕ ТУРНИРОМ
        case 'start_tournament':
          if (selectedTournament) {
            await supabase.rpc('start_tournament', { tournament_id_param: selectedTournament.id });
            setTimerActive(true);
            toast({ title: "✅ Турнир запущен", description: "Голосовая команда выполнена" });
            loadTournaments();
          }
          break;
          
        case 'pause_tournament':
          if (selectedTournament) {
            await supabase.rpc('pause_tournament', { tournament_id_param: selectedTournament.id });
            setTimerActive(false);
            toast({ title: "⏸️ Турнир приостановлен", description: "Голосовая команда выполнена" });
            loadTournaments();
          }
          break;
          
        case 'resume_tournament':
          if (selectedTournament) {
            await supabase.rpc('resume_tournament', { tournament_id_param: selectedTournament.id });
            setTimerActive(true);
            toast({ title: "▶️ Турнир возобновлен", description: "Голосовая команда выполнена" });
            loadTournaments();
          }
          break;
          
        case 'complete_tournament':
          if (selectedTournament) {
            await supabase.rpc('complete_tournament', { tournament_id_param: selectedTournament.id });
            setTimerActive(false);
            toast({ title: "🏆 Турнир завершен", description: "Голосовая команда выполнена" });
            loadTournaments();
          }
          break;

        // УПРАВЛЕНИЕ БЛАЙНДАМИ  
        case 'next_blind_level':
          await nextLevel();
          toast({ title: "⬆️ Следующий уровень", description: "Переход к следующему уровню блайндов" });
          break;
          
        case 'previous_blind_level':
          await prevLevel();
          toast({ title: "⬇️ Предыдущий уровень", description: "Возврат к предыдущему уровню блайндов" });
          break;

        // УПРАВЛЕНИЕ ТАЙМЕРОМ
        case 'set_timer':
          if (data?.minutes && selectedTournament) {
            const seconds = data.minutes * 60;
            setCurrentTime(seconds);
            localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
              currentTime: seconds,
              timerActive,
              lastUpdate: Date.now()
            }));
            updateTimerInDatabase(seconds);
            toast({ title: "⏱️ Таймер установлен", description: `Время: ${data.minutes} минут` });
          }
          break;
          
        case 'add_time':
          if (data?.minutes) {
            onTimerAdjust(data.minutes * 60);
            toast({ title: "➕ Время добавлено", description: `+${data.minutes} минут` });
          }
          break;
          
        case 'start_timer':
          setTimerActive(true);
          toast({ title: "▶️ Таймер запущен", description: "Голосовая команда выполнена" });
          break;
          
        case 'stop_timer':
          setTimerActive(false);
          toast({ title: "⏹️ Таймер остановлен", description: "Голосовая команда выполнена" });
          break;

        // НАВИГАЦИЯ И ОТОБРАЖЕНИЕ
        case 'show_stats':
          setActiveTab('overview');
          toast({ title: "📊 Статистика", description: "Отображение статистики турнира" });
          break;
          
        case 'show_players':
          setActiveTab('players');
          toast({ title: "👥 Игроки", description: "Отображение списка игроков" });
          break;
          
        case 'show_payouts':
          setActiveTab('results');
          toast({ title: "💰 Выплаты", description: "Отображение структуры выплат" });
          break;
          
        case 'rebalance_tables':
        case 'show_seating':
          setActiveTab('seating');
          toast({ title: "🎲 Рассадка", description: "Управление рассадкой игроков" });
          break;

        // ПЕРЕРЫВЫ
        case 'break':
          if (data?.duration && selectedTournament) {
            const breakTime = data.duration * 60;
            setCurrentTime(breakTime);
            setTimerActive(true);
            localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
              currentTime: breakTime,
              timerActive: true,
              lastUpdate: Date.now()
            }));
            updateTimerInDatabase(breakTime);
            toast({ title: "☕ Перерыв", description: `Перерыв на ${data.duration} минут` });
          }
          break;

        // СОВМЕСТИМОСТЬ
        case 'timer_update':
          if (data?.time) {
            setCurrentTime(data.time);
          }
          break;
          
        case 'level_change':
          if (data?.direction === 'next') {
            await nextLevel();
          } else if (data?.direction === 'prev') {
            await prevLevel();
          }
          break;
          
        case 'tournament_control':
          if (data?.status) {
            loadTournaments();
            if (selectedTournament) {
              loadRegistrations(selectedTournament.id);
            }
          }
          break;

        case 'processed':
          // Общее подтверждение обработки команды
          break;

        default:
          console.log('Unknown voice action:', action);
          toast({ title: "❓ Неизвестная команда", description: "Команда не распознана" });
      }
    } catch (error) {
      console.error('Ошибка выполнения голосовой команды:', error);
      toast({ 
        title: "❌ Ошибка", 
        description: "Не удалось выполнить голосовую команду",
        variant: "destructive" 
      });
    }
  };

  const deleteTournament = async (id: string) => {
    try {
      // Используем безопасную RPC функцию для удаления турнира
      const { error } = await supabase.rpc('delete_tournament_safe', {
        p_tournament_id: id
      });

      if (!error) {
        toast({ title: "Турнир удален", description: "Результаты игр и рейтинги сохранены" });
        loadTournaments();
        if (selectedTournament?.id === id) {
          setSelectedTournament(null);
          localStorage.removeItem('selectedTournamentId');
          localStorage.removeItem(`timer_${id}`);
        }
      } else {
        throw error;
      }
    } catch (error: any) {
      console.error('Ошибка удаления турнира:', error);
      const errorMessage = error?.message || "Не удалось удалить турнир";
      toast({ 
        title: "Ошибка", 
        description: errorMessage.includes('завершенный') 
          ? "Завершенные турниры нельзя удалить. Используйте архивирование." 
          : errorMessage, 
        variant: "destructive" 
      });
    }
  };

  const archiveTournament = async (id: string) => {
    try {
      const { error } = await supabase.rpc('archive_tournament', {
        p_tournament_id: id
      });

      if (!error) {
        toast({ title: "Турнир архивирован", description: "Турнир перемещен в архив" });
        loadTournaments();
        if (selectedTournament?.id === id) {
          setSelectedTournament(null);
          localStorage.removeItem('selectedTournamentId');
        }
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Ошибка архивирования турнира:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось архивировать турнир", 
        variant: "destructive" 
      });
    }
  };

  // Realtime subscription for blind_levels to sync current level changes
  useEffect(() => {
    if (!selectedTournament?.id) return;
    const channel = supabase
      .channel(`td_blinds_${selectedTournament.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blind_levels',
        filter: `tournament_id=eq.${selectedTournament.id}`
      }, async () => {
        try {
          const { data: level } = await supabase
            .from('blind_levels')
            .select('*')
            .eq('tournament_id', selectedTournament.id)
            .eq('level', selectedTournament.current_level)
            .single();
          if (level) {
            // Update local tournament state
            setSelectedTournament(prev => prev ? ({
              ...prev,
              current_small_blind: level.small_blind,
              current_big_blind: level.big_blind,
              timer_duration: level.duration
            }) : prev);

            // Adjust remaining time if it exceeds new duration
            const newRemaining = Math.min(currentTime, level.duration || 1200);
            setCurrentTime(newRemaining);

            // Persist timer changes
            localStorage.setItem(`timer_${selectedTournament.id}`, JSON.stringify({
              currentTime: newRemaining,
              timerActive,
              lastUpdate: Date.now()
            }));

            // Update DB timer fields and duration
            await supabase.from('tournaments')
              .update({ timer_duration: level.duration, timer_remaining: newRemaining })
              .eq('id', selectedTournament.id);
          }
        } catch (e) {
          console.error('Ошибка синхронизации блайндов:', e);
        }
      });
    
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTournament?.id, selectedTournament?.current_level, currentTime, timerActive]);

  return (
    <AuthGuard requireAdmin={true}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <TournamentDirectorSidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            selectedTournament={selectedTournament}
          />
          <main className="flex-1">
            <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">

          {/* Custom Tab System заменяем обратно на Radix Tabs */}
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => {
              console.log('Tab change:', activeTab, '->', value);
              setActiveTab(value);
            }} 
            className="space-y-10"
          >
            <TabsList className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-10 gap-1 sm:gap-2 h-auto p-1 bg-card rounded-lg border border-border overflow-x-auto">
              <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Обзор</span>
                <span className="sm:hidden">Обзор</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Турниры</span>
                <span className="sm:hidden">Турн</span>
              </TabsTrigger>
              <TabsTrigger value="control" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3">
                <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Управление</span>
                <span className="sm:hidden">Управ</span>
              </TabsTrigger>
              <TabsTrigger value="players" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 hidden sm:flex">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden lg:inline">Игроки</span>
                <span className="lg:hidden">Игр</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 hidden lg:flex">
                <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Голос</span>
              </TabsTrigger>
              <TabsTrigger value="ratings" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 hidden lg:flex">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Рейтинги</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 hidden lg:flex">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Результаты</span>
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 hidden lg:flex">
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Синхронизация</span>
               </TabsTrigger>
               <TabsTrigger value="analysis" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 hidden lg:flex">
                 <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                 <span>Анализ турнира</span>
               </TabsTrigger>
                <TabsTrigger value="rating-test" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Target className="w-4 h-4" />
                  <span className="hidden sm:inline">Тест рейтинга</span>
                </TabsTrigger>
                <TabsTrigger value="rating-settings" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 hidden lg:flex">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Настройки RPS</span>
                </TabsTrigger>
                <TabsTrigger value="online-poker" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 hidden lg:flex">
                  <Gamepad2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Онлайн покер</span>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-8 animate-fade-in">
              {selectedTournament ? (
                <div className="space-y-8">
                  <TournamentOverview
                    tournament={selectedTournament}
                    players={players}
                    registrations={registrations}
                    currentTime={currentTime}
                    timerActive={timerActive}
                    onToggleTimer={toggleTimer}
                    onResetTimer={resetTimer}
                    onNextLevel={nextLevel}
                    onPrevLevel={prevLevel}
                    onStopTournament={stopTournament}
                    onRefresh={() => loadRegistrations(selectedTournament.id)}
                    onTimerAdjust={onTimerAdjust}
                    onFinishTournament={onFinishTournament}
                    onOpenExternalTimer={() => {
                      window.open(`/external-timer?tournamentId=${selectedTournament.id}`, '_blank', 'width=1920,height=1080,fullscreen=yes');
                    }}
                  />
                </div>
              ) : (
                <Card className="bg-card brutal-border">
                  <CardContent className="text-center py-16">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Турнир не выбран</h3>
                    <p className="text-muted-foreground mb-6">Выберите турнир на вкладке "Турниры" для отображения информации</p>
                    <Button
                      onClick={() => setActiveTab('tournaments')}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Перейти к турнирам
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tournaments" className="space-y-6 animate-fade-in">
              {/* Create Tournament Section */}
              <Card className="bg-card brutal-border overflow-hidden group hover:shadow-neon-orange/20 transition-all duration-300">
                <CardHeader className="bg-secondary/60 border-b-2 border-border pb-4">
                  <CardTitle className="flex items-center gap-3 text-foreground text-xl font-black">
                    <div className="p-2 bg-primary/20 rounded-lg border border-primary/30 group-hover:bg-primary/30 transition-colors">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    СОЗДАТЬ ТУРНИР
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-bold uppercase tracking-wider text-xs">
                    Настройте новый покерный турнир
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase tracking-wider shadow-neon-orange"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать новый турнир
                  </Button>
                </CardContent>
              </Card>

              {/* Active/Archive Tabs */}
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="active" className="font-black uppercase text-xs">
                    <Trophy className="w-4 h-4 mr-2" />
                    Активные ({tournaments.filter(t => !t.is_archived).length})
                  </TabsTrigger>
                  <TabsTrigger value="archive" className="font-black uppercase text-xs">
                    <FolderArchive className="w-4 h-4 mr-2" />
                    Архив ({tournaments.filter(t => t.is_archived).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-6">
                  {/* Active Tournaments Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.filter(t => !t.is_archived).map((tournament) => (
                  <Card 
                    key={tournament.id} 
                    className={`bg-card brutal-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-neon-orange/20 relative ${
                      selectedTournament?.id === tournament.id ? 'ring-2 ring-primary shadow-neon-orange/30' : ''
                    }`}
                  >
                    <CardHeader className="bg-secondary/60 border-b-2 border-border pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg font-black text-foreground">
                          {tournament.name}
                        </CardTitle>
                        <Badge 
                          className={`text-xs font-black ${
                            tournament.status === 'running' 
                              ? 'bg-green-500/20 text-green-500 border-green-500/50 animate-pulse' 
                              : tournament.status === 'scheduled' 
                                ? 'bg-blue-500/20 text-blue-500 border-blue-500/50'
                                : tournament.status === 'paused'
                                  ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                  : 'bg-secondary text-muted-foreground border-border'
                          }`}
                        >
                          {tournament.status === 'running' ? '● АКТИВЕН' : 
                           tournament.status === 'scheduled' ? 'ЗАПЛАНИРОВАН' : 
                           tournament.status === 'paused' ? 'ПАУЗА' :
                           tournament.status === 'finished' ? 'ЗАВЕРШЕН' : tournament.status.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription className="text-muted-foreground text-xs font-bold uppercase">
                        {tournament.description || "Рейтинговый турнир"}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-4 space-y-4">
                      {/* Tournament Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-2 bg-secondary/40 rounded-lg">
                          <span className="text-muted-foreground font-bold text-xs uppercase">Начало</span>
                          <span className="font-black text-foreground text-xs">{new Date(tournament.start_time).toLocaleString('ru-RU')}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                          <span className="text-muted-foreground font-bold text-xs uppercase">Орг. взнос</span>
                          <span className="font-black text-green-500">{(tournament.participation_fee || tournament.buy_in).toLocaleString()} ₽</span>
                        </div>
                        {(tournament.reentry_fee && tournament.reentry_fee > 0) && (
                          <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <span className="text-muted-foreground font-bold text-xs uppercase">Re-entry</span>
                            <span className="font-black text-blue-500">{tournament.reentry_fee.toLocaleString()} ₽</span>
                          </div>
                        )}
                        {(tournament.additional_fee && tournament.additional_fee > 0) && (
                          <div className="flex justify-between items-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <span className="text-muted-foreground font-bold text-xs uppercase">Add-on</span>
                            <span className="font-black text-purple-500">{tournament.additional_fee.toLocaleString()} ₽</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-secondary/40 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground font-bold">ИГРОКОВ</div>
                            <div className="font-black text-foreground">{tournament.max_players}</div>
                          </div>
                          <div className="p-2 bg-secondary/40 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground font-bold">СТЕК</div>
                            <div className="font-black text-foreground">{tournament.starting_chips.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-primary/10 rounded-lg border border-primary/30">
                          <span className="text-muted-foreground font-bold text-xs uppercase">Уровень {tournament.current_level}</span>
                          <span className="font-black text-primary">{tournament.current_small_blind}/{tournament.current_big_blind}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t-2 border-border">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTournamentSelect(tournament)}
                            className="border-2 border-primary/50 text-primary hover:bg-primary/20 font-black text-xs"
                          >
                            <Trophy className="w-3 h-3 mr-1" />
                            Выбрать
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTournament(tournament);
                              setIsModalOpen(true);
                            }}
                            className="border-2 border-border text-muted-foreground hover:bg-secondary font-black text-xs"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Редактировать
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {tournament.status === 'scheduled' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const { data, error } = await supabase.rpc('start_tournament_registration', {
                                    tournament_id_param: tournament.id
                                  });
                                  
                                  if (!error) {
                                    loadTournaments();
                                    toast({ title: "Регистрация открыта" });
                                  }
                                }}
                                className="border-2 border-blue-500/50 text-blue-500 hover:bg-blue-500/20 font-black text-xs"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Регистрация
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const { data, error } = await supabase.rpc('start_tournament', {
                                    tournament_id_param: tournament.id
                                  });
                                  
                                  if (!error) {
                                    loadTournaments();
                                    toast({ title: "Турнир запущен" });
                                  }
                                }}
                                className="border-2 border-green-500/50 text-green-500 hover:bg-green-500/20 font-black text-xs"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Старт
                              </Button>
                            </>
                          )}
                          
                          {tournament.status === 'registration' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { data, error } = await supabase.rpc('start_tournament', {
                                  tournament_id_param: tournament.id
                                });
                                
                                if (!error) {
                                  loadTournaments();
                                  toast({ title: "Турнир запущен" });
                                }
                              }}
                              className="border-2 border-green-500/50 text-green-500 hover:bg-green-500/20 font-black text-xs col-span-2"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Запустить турнир
                            </Button>
                          )}
                          
                          {tournament.status === 'running' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { data, error } = await supabase.rpc('pause_tournament', {
                                  tournament_id_param: tournament.id
                                });
                                
                                if (!error) {
                                  loadTournaments();
                                  toast({ title: "Турнир приостановлен" });
                                }
                              }}
                              className="border-2 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20 font-black text-xs"
                            >
                              <Pause className="w-3 h-3 mr-1" />
                              Пауза
                            </Button>
                          )}
                          
                          {tournament.status === 'paused' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { data, error } = await supabase.rpc('resume_tournament', {
                                  tournament_id_param: tournament.id
                                });
                                
                                if (!error) {
                                  loadTournaments();
                                  toast({ title: "Турнир возобновлен" });
                                }
                              }}
                              className="border-2 border-green-500/50 text-green-500 hover:bg-green-500/20 font-black text-xs"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Возобновить
                            </Button>
                          )}
                          
                          {/* Archive button for finished tournaments */}
                          {tournament.status === 'finished' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm('Архивировать турнир? Он будет перемещен во вкладку "Архив".')) {
                                  archiveTournament(tournament.id);
                                }
                              }}
                              className="border-2 border-purple-500/50 text-purple-500 hover:bg-purple-500/20 font-black text-xs"
                            >
                              <Archive className="w-3 h-3 mr-1" />
                              В архив
                            </Button>
                          )}

                          {/* Delete button - hidden for finished tournaments */}
                          {tournament.status !== 'finished' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm('Вы уверены, что хотите удалить этот турнир?')) {
                                  deleteTournament(tournament.id);
                                }
                              }}
                              className="border-2 border-destructive/50 text-destructive hover:bg-destructive/20 font-black text-xs"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Удалить
                            </Button>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-3 gap-1 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleTournamentSelect(tournament);
                              setActiveTab('control');
                            }}
                            className="text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 font-bold"
                          >
                            <Timer className="w-3 h-3 mr-1" />
                            Таймер
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleTournamentSelect(tournament);
                              setActiveTab('players');
                            }}
                            className="text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 font-bold"
                          >
                            <Users className="w-3 h-3 mr-1" />
                            Игроки
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleTournamentSelect(tournament);
                              setActiveTab('results');
                            }}
                            className="text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 font-bold"
                          >
                            <Trophy className="w-3 h-3 mr-1" />
                            Результаты
                          </Button>
                        </div>
                      </div>

                      {/* Selected Indicator */}
                      {selectedTournament?.id === tournament.id && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-4 h-4 bg-primary rounded-full border-2 border-background shadow-neon-orange animate-pulse"></div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  ))}

                    {tournaments.filter(t => !t.is_archived).length === 0 && (
                      <Card className="bg-card brutal-border col-span-full">
                        <CardContent className="text-center py-16">
                          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-black text-foreground mb-2">НЕТ АКТИВНЫХ ТУРНИРОВ</h3>
                          <p className="text-muted-foreground mb-6 font-bold uppercase text-sm">Создайте первый турнир для начала работы</p>
                          <Button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Новый турнир
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="archive" className="mt-6">
                  {/* Archived Tournaments Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.filter(t => t.is_archived).map((tournament) => (
                      <Card 
                        key={tournament.id} 
                        className="bg-card/60 brutal-border overflow-hidden transition-all duration-300 opacity-80 hover:opacity-100"
                      >
                        <CardHeader className="bg-secondary/40 border-b-2 border-border pb-3">
                          <div className="flex items-start justify-between mb-1">
                            <CardTitle className="text-base font-black text-muted-foreground">
                              {tournament.name}
                            </CardTitle>
                            <Badge className="bg-secondary text-muted-foreground border-border text-xs">
                              <Archive className="w-3 h-3 mr-1" />
                              АРХИВ
                            </Badge>
                          </div>
                          <CardDescription className="text-muted-foreground text-xs">
                            {new Date(tournament.start_time).toLocaleDateString('ru-RU')}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2 bg-secondary/40 rounded-lg text-center">
                              <div className="text-xs text-muted-foreground font-bold">ВЗНОС</div>
                              <div className="font-black text-foreground">{(tournament.participation_fee || tournament.buy_in).toLocaleString()} ₽</div>
                            </div>
                            <div className="p-2 bg-secondary/40 rounded-lg text-center">
                              <div className="text-xs text-muted-foreground font-bold">СТАТУС</div>
                              <div className="font-black text-foreground capitalize">{tournament.status === 'finished' ? 'Завершен' : tournament.status}</div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-border">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleTournamentSelect(tournament);
                                setActiveTab('results');
                              }}
                              className="flex-1 border-border text-muted-foreground hover:bg-secondary font-black text-xs"
                            >
                              <Trophy className="w-3 h-3 mr-1" />
                              Результаты
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {tournaments.filter(t => t.is_archived).length === 0 && (
                      <Card className="bg-card brutal-border col-span-full">
                        <CardContent className="text-center py-12">
                          <FolderArchive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-black text-foreground mb-2">АРХИВ ПУСТ</h3>
                          <p className="text-muted-foreground font-bold uppercase text-sm">Завершенные турниры появятся здесь после архивации</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="control" className="space-y-8 animate-fade-in">
              {selectedTournament ? (
                <div className="space-y-8">
                  <BlindStructure tournamentId={selectedTournament.id} />
                  <PrizeStructureManager tournamentId={selectedTournament.id} registeredPlayers={registrations.length} mode="management" />
                  <ManualAdjustments tournaments={tournaments} selectedTournament={selectedTournament} onRefresh={loadTournaments} />
                </div>
              ) : (
                <Card className="bg-card brutal-border">
                  <CardContent className="text-center py-16">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-black text-foreground mb-2">ТУРНИР НЕ ВЫБРАН</h3>
                    <p className="text-muted-foreground mb-6 font-bold uppercase text-sm">Выберите турнир для настройки управления</p>
                    <Button
                      onClick={() => setActiveTab('tournaments')}
                      className="bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase"
                    >
                      Выбрать турнир
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="players" className="space-y-8 animate-fade-in">
              {selectedTournament && (
                <TournamentPlayerManagement 
                  tournament={adaptTournamentToModern(selectedTournament)}
                  players={players}
                  registrations={registrations}
                  onRegistrationUpdate={() => selectedTournament && loadRegistrations(selectedTournament.id)}
                />
              )}
            </TabsContent>

            <TabsContent value="ratings" className="space-y-6 animate-fade-in">
              <RatingManagement 
                tournaments={tournaments} 
                selectedTournament={selectedTournament}
                onRefresh={loadTournaments}
              />
            </TabsContent>

            <TabsContent value="results" className="space-y-6 animate-fade-in">
              <TournamentResults selectedTournament={selectedTournament} />
            </TabsContent>

            <TabsContent value="sync" className="space-y-6 animate-fade-in">
              <TournamentSyncManager 
                tournaments={tournaments}
                onRefresh={loadTournaments}
              />
            </TabsContent>

            <TabsContent value="rating-test" className="space-y-6 animate-fade-in">
              <RatingSystemTest />
            </TabsContent>

            <TabsContent value="rating-settings" className="space-y-6 animate-fade-in">
              <IntegratedTournamentRatingSettings 
                selectedTournament={selectedTournament}
                onTournamentUpdate={loadTournaments}
              />
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6 animate-fade-in">
              {selectedTournament ? (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-1">
                      <PrizeStructureManager tournamentId={selectedTournament.id} registeredPlayers={registrations.length} mode="analysis" />
                    </div>
                    <div className="sm:w-auto">
                      <RecalculateRatings />
                    </div>
                  </div>
                  <TournamentAnalysisAndRating />
                </div>
              ) : (
                <Card className="bg-card brutal-border">
                  <CardContent className="text-center py-16">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-black text-foreground mb-2">ТУРНИР НЕ ВЫБРАН</h3>
                    <p className="text-muted-foreground font-bold uppercase text-sm">Выберите турнир для анализа</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="voice" className="space-y-6 animate-fade-in">
              <VoiceControl 
                selectedTournament={selectedTournament} 
                onVoiceAction={handleVoiceAction}
              />
            </TabsContent>

            <TabsContent value="online-poker" className="space-y-6 animate-fade-in">
              <OnlinePokerManagement />
            </TabsContent>

            <TabsContent value="sounds" className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Демо звуков покера
                  </CardTitle>
                  <CardDescription>
                    Прослушайте и настройте звуки для онлайн-покера
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SoundDemo isOpen={true} onClose={() => {}} embedded={true} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Tournament Creation/Edit Modal */}
          <TournamentCreationModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            tournament={editingTournament ? {
              ...adaptTournamentToModern(editingTournament),
              description: editingTournament.description || '',
              reentry_end_level: editingTournament.rebuy_end_level || 6,
              additional_level: editingTournament.addon_level || 7,
              break_start_level: editingTournament.break_start_level || 4,
              voice_control_enabled: (editingTournament as any).voice_control_enabled || false
            } : null}
            onTournamentUpdate={() => {
              loadTournaments();
              setIsModalOpen(false);
              setEditingTournament(null);
            }}
          />
            </div>
          </main>
          
          {/* Mobile Menu for hidden tabs */}
          <TournamentDirectorMobileMenu 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};

export default TournamentDirector;