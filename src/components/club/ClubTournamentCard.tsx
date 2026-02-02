import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Clock, 
  Calendar, 
  Coins, 
  Target, 
  Zap, 
  Shield, 
  ChevronRight, 
  Gem, 
  Loader2, 
  Play,
  Pause,
  Settings,
  Send,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  PlusCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { calculateTotalRPSPool } from '@/utils/rpsCalculations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  participation_fee: number | null;
  max_players: number;
  status: string;
  starting_chips: number;
  description?: string | null;
  tournament_format?: string | null;
  reentry_fee?: number | null;
  is_published?: boolean | null;
  current_level?: number | null;
  registrations_count?: number;
}

interface ClubTournamentCardProps {
  tournament: Tournament;
  index?: number;
  onManage: (id: string) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
  canManage?: boolean;
}

export function ClubTournamentCard({ 
  tournament, 
  index = 0,
  onManage,
  onDelete,
  onRefresh,
  canManage = true
}: ClubTournamentCardProps) {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPublishing, setIsPublishing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const registeredCount = tournament.registrations_count || 0;
  const maxPlayers = tournament.max_players;
  const spotsLeft = maxPlayers - registeredCount;
  const fillPercentage = (registeredCount / maxPlayers) * 100;
  const isFilling = spotsLeft <= 3 && spotsLeft > 0;
  const ticketNumber = tournament.id.split('-')[0].toUpperCase();
  
  // Live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  
  // Calculate countdown
  const startTime = new Date(tournament.start_time);
  const timeUntilStart = startTime.getTime() - currentTime.getTime();
  const daysUntil = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
  const hoursUntil = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
  
  const getTimeDisplay = () => {
    if (timeUntilStart <= 0) return 'Сейчас';
    if (daysUntil > 0) return `${daysUntil}д ${hoursUntil}ч`;
    if (hoursUntil > 0) return `${hoursUntil}ч ${minutesUntil}м`;
    return `${minutesUntil}м`;
  };
  
  const getFormatIcon = () => {
    switch (tournament.tournament_format) {
      case 'reentry':
        return <RefreshCw className="h-3.5 w-3.5" />;
      case 'additional':
        return <PlusCircle className="h-3.5 w-3.5" />;
      default:
        return <Shield className="h-3.5 w-3.5" />;
    }
  };

  const getFormatLabel = () => {
    switch (tournament.tournament_format) {
      case 'reentry':
        return 'Re-entry';
      case 'additional':
        return 'Addon';
      default:
        return 'Freezeout';
    }
  };

  const getStatusBadge = () => {
    switch (tournament.status) {
      case 'running':
        return (
          <div className="px-3 py-1.5 text-xs uppercase font-bold tracking-wider brutal-border bg-green-500/20 text-green-500 border border-green-500/50 animate-pulse">
            ● LIVE
          </div>
        );
      case 'paused':
        return (
          <div className="px-3 py-1.5 text-xs uppercase font-bold tracking-wider brutal-border bg-orange-500/20 text-orange-500 border border-orange-500/50">
            ● ПАУЗА
          </div>
        );
      case 'registration':
        return (
          <div className="px-3 py-1.5 text-xs uppercase font-bold tracking-wider brutal-border bg-syndikate-orange/20 text-syndikate-orange border border-syndikate-orange/50">
            ● РЕГИСТРАЦИЯ
          </div>
        );
      case 'completed':
        return (
          <div className="px-3 py-1.5 text-xs uppercase font-bold tracking-wider brutal-border bg-muted text-muted-foreground border border-border">
            ● ЗАВЕРШЁН
          </div>
        );
      default:
        return (
          <div className="px-3 py-1.5 text-xs uppercase font-bold tracking-wider brutal-border bg-blue-500/20 text-blue-500 border border-blue-500/50">
            ● ЗАПЛАНИРОВАН
          </div>
        );
    }
  };

  // Publish tournament
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          is_published: !tournament.is_published,
          status: !tournament.is_published ? 'registration' : 'scheduled'
        })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: tournament.is_published ? 'Турнир скрыт' : 'Турнир опубликован',
        description: tournament.is_published 
          ? 'Турнир больше не виден игрокам'
          : 'Игроки могут регистрироваться'
      });
      onRefresh?.();
    } catch (error) {
      console.error('Error publishing tournament:', error);
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Start tournament
  const handleStart = async () => {
    setIsStarting(true);
    try {
      const { error } = await supabase.rpc('start_tournament', {
        tournament_id_param: tournament.id
      });

      if (error) throw error;

      toast({ title: 'Турнир запущен!' });
      onRefresh?.();
    } catch (error) {
      console.error('Error starting tournament:', error);
      toast({ title: 'Ошибка запуска', variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  // Pause/Resume
  const handlePauseResume = async () => {
    try {
      const newStatus = tournament.status === 'paused' ? 'running' : 'paused';
      const { error } = await supabase
        .from('tournaments')
        .update({ status: newStatus })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({ 
        title: newStatus === 'paused' ? 'Турнир приостановлен' : 'Турнир возобновлён' 
      });
      onRefresh?.();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  // Delete tournament
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.(tournament.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const participationFee = tournament.participation_fee || 0;
  const reentryFee = tournament.reentry_fee || 0;

  return (
    <>
      <div
        className="relative group cursor-pointer animate-fade-in"
        onClick={() => onManage(tournament.id)}
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {/* Neon Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-syndikate-orange via-syndikate-red to-syndikate-orange rounded opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
        
        <div className="relative bg-gradient-to-br from-syndikate-metal/95 to-syndikate-concrete/90 brutal-border backdrop-blur-xl overflow-hidden transition-all duration-500 hover:shadow-neon-orange">
          {/* Warning Stripes */}
          <div 
            className="absolute top-0 left-0 right-0 h-1 opacity-40"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.4), rgba(255, 135, 31, 0.4) 6px, transparent 6px, transparent 12px)'
            }}
          />
          
          {/* Corner Brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-syndikate-orange transition-all duration-300 group-hover:w-6 group-hover:h-6" />
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-syndikate-orange transition-all duration-300 group-hover:w-6 group-hover:h-6" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-syndikate-orange transition-all duration-300 group-hover:w-6 group-hover:h-6" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-syndikate-orange transition-all duration-300 group-hover:w-6 group-hover:h-6" />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Industrial Texture */}
          <div className="absolute inset-0 industrial-texture opacity-10" />
          
          {/* Glow effects */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-syndikate-orange/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-syndikate-red/10 rounded-full blur-2xl" />

          <div className="relative z-10 p-4 pt-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="w-9 h-9 bg-gradient-to-br from-syndikate-orange to-syndikate-red brutal-border flex items-center justify-center shadow-neon-orange">
                    <Target className="h-4 w-4 text-background" />
                  </div>
                  {getStatusBadge()}
                  <div className="px-2 py-1 bg-syndikate-metal/50 brutal-border border border-border text-xs uppercase text-muted-foreground font-bold flex items-center gap-1">
                    {getFormatIcon()}
                    {getFormatLabel()}
                  </div>
                  {!tournament.is_published && (
                    <div className="px-2 py-1 bg-muted/50 brutal-border text-xs uppercase text-muted-foreground font-bold flex items-center gap-1">
                      <EyeOff className="h-3 w-3" />
                      Черновик
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-display font-bold text-foreground tracking-wide uppercase group-hover:text-syndikate-orange transition-colors duration-300 leading-tight line-clamp-2">
                  {tournament.name}
                </h3>
              </div>
              
              {/* Ticket Number */}
              <div className="bg-syndikate-orange/20 border border-syndikate-orange/50 px-2 py-1 brutal-border ml-2 shrink-0">
                <span className="text-[9px] text-syndikate-orange font-bold tracking-widest">#{ticketNumber}</span>
              </div>
            </div>
            
            {/* Countdown Badge */}
            {timeUntilStart > 0 && tournament.status !== 'running' && tournament.status !== 'completed' && (
              <div className="flex gap-2 mb-3">
                <div className="px-3 py-1.5 bg-syndikate-metal/50 border border-border brutal-border text-xs font-bold uppercase flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-syndikate-orange" />
                  Старт через {getTimeDisplay()}
                </div>
                {isFilling && (
                  <div className="px-3 py-1.5 bg-syndikate-red/20 text-syndikate-red border border-syndikate-red/50 brutal-border text-xs font-bold uppercase flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    {spotsLeft} мест
                  </div>
                )}
              </div>
            )}
            
            {/* Divider */}
            <div className="h-[2px] bg-gradient-to-r from-syndikate-orange via-syndikate-red to-syndikate-orange mb-3 opacity-40" />
            
            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Date & Time */}
              <div className="bg-syndikate-metal/30 brutal-border p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-syndikate-orange/10 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-syndikate-orange to-syndikate-red brutal-border flex items-center justify-center">
                      <Calendar className="h-3.5 w-3.5 text-background" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Дата</span>
                  </div>
                  <div className="text-foreground text-sm font-medium">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="font-display text-xl text-syndikate-orange">
                    {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              
              {/* Buy-in */}
              <div className="bg-syndikate-metal/30 brutal-border p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-syndikate-orange/15 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-syndikate-orange to-syndikate-red brutal-border flex items-center justify-center">
                      <Coins className="h-3.5 w-3.5 text-background" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Взнос</span>
                  </div>
                  <div className="font-display text-xl text-syndikate-orange font-bold">
                    {participationFee > 0 ? `${participationFee.toLocaleString()}₽` : 'FREE'}
                  </div>
                  {reentryFee > 0 && (
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mt-0.5">
                      Re-entry: {reentryFee.toLocaleString()}₽
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-syndikate-metal/30 brutal-border p-2 text-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 brutal-border flex items-center justify-center mx-auto mb-1.5">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="text-foreground font-bold text-sm">{registeredCount}/{maxPlayers}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Игроков</div>
              </div>
              <div className="bg-syndikate-metal/30 brutal-border p-2 text-center">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 brutal-border flex items-center justify-center mx-auto mb-1.5">
                  <Gem className="h-4 w-4 text-white" />
                </div>
                <div className="text-foreground font-bold text-sm">{(tournament.starting_chips / 1000).toFixed(0)}K</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Стек</div>
              </div>
              <div className="bg-syndikate-metal/30 brutal-border p-2 text-center">
                <div className="w-8 h-8 bg-gradient-to-br from-syndikate-orange to-syndikate-red brutal-border flex items-center justify-center mx-auto mb-1.5">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <div className="text-foreground font-bold text-sm">
                  {calculateTotalRPSPool(registeredCount, participationFee, 0, reentryFee, 0, 0)}
                </div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">RPS</div>
              </div>
            </div>
            
            {/* Registration Progress */}
            {(tournament.status === 'registration' || tournament.status === 'scheduled') && registeredCount > 0 && (
              <div className="bg-syndikate-metal/20 brutal-border p-2 mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-bold">Регистрация</span>
                  <span className={`font-bold uppercase tracking-wider ${
                    fillPercentage >= 90 ? 'text-syndikate-red' : 'text-syndikate-orange'
                  }`}>
                    {fillPercentage >= 90 && <Zap className="h-2.5 w-2.5 inline mr-0.5" />}
                    {spotsLeft} мест
                  </span>
                </div>
                <div className="h-2 bg-background brutal-border overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      fillPercentage >= 90 
                        ? 'bg-gradient-to-r from-syndikate-red to-syndikate-orange animate-pulse' 
                        : 'bg-gradient-to-r from-syndikate-orange to-syndikate-red'
                    }`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-syndikate-concrete/20">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onManage(tournament.id);
                }}
                variant="outline"
                size="sm"
                className="flex-1 brutal-border bg-syndikate-metal/30 hover:bg-syndikate-metal/50 border-border"
              >
                <Settings className="h-4 w-4 mr-1.5" />
                Управление
              </Button>
              
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="brutal-border bg-syndikate-orange/20 hover:bg-syndikate-orange border-syndikate-orange/50 hover:border-syndikate-orange text-syndikate-orange hover:text-background"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="brutal-border">
                    {/* Publish/Unpublish */}
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublish();
                      }}
                      disabled={isPublishing || tournament.status === 'running' || tournament.status === 'completed'}
                    >
                      {tournament.is_published ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Скрыть турнир
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Опубликовать
                        </>
                      )}
                    </DropdownMenuItem>
                    
                    {/* Start Tournament */}
                    {(tournament.status === 'registration' || tournament.status === 'scheduled') && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStart();
                        }}
                        disabled={isStarting}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Запустить турнир
                      </DropdownMenuItem>
                    )}
                    
                    {/* Pause/Resume */}
                    {(tournament.status === 'running' || tournament.status === 'paused') && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseResume();
                        }}
                      >
                        {tournament.status === 'paused' ? (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Возобновить
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Пауза
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Delete */}
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive focus:text-destructive"
                      disabled={tournament.status === 'running'}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="brutal-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить турнир?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Турнир "{tournament.name}" будет удалён навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
