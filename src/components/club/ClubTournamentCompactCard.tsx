import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Clock, 
  Calendar, 
  Coins, 
  Play,
  Pause,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  Archive,
  MoreVertical,
  RefreshCw,
  PlusCircle,
  Shield,
  CheckCircle,
  Loader2
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
  is_published?: boolean | null;
  is_archived?: boolean | null;
  current_level?: number | null;
  registrations_count?: number;
}

interface ClubTournamentCompactCardProps {
  tournament: Tournament;
  index?: number;
  onManage: (id: string) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
  canManage?: boolean;
}

export function ClubTournamentCompactCard({ 
  tournament, 
  index = 0,
  onManage,
  onDelete,
  onRefresh,
  canManage = true
}: ClubTournamentCompactCardProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const registeredCount = tournament.registrations_count || 0;
  const maxPlayers = tournament.max_players;
  const fillPercentage = (registeredCount / maxPlayers) * 100;
  const participationFee = tournament.participation_fee || 0;
  
  const getFormatBadge = () => {
    switch (tournament.tournament_format) {
      case 'reentry':
        return { icon: RefreshCw, label: 'Re-entry', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'additional':
        return { icon: PlusCircle, label: 'Addon', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      default:
        return { icon: Shield, label: 'Freezeout', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };
    }
  };

  const getStatusConfig = () => {
    switch (tournament.status) {
      case 'running':
        return { label: 'LIVE', color: 'bg-green-500/20 text-green-400 border-green-500/50', pulse: true };
      case 'paused':
        return { label: 'ПАУЗА', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', pulse: false };
      case 'registration':
        return { label: 'РЕГИСТРАЦИЯ', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', pulse: false };
      case 'completed':
        return { label: 'ЗАВЕРШЁН', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', pulse: false };
      default:
        return { label: 'ЧЕРНОВИК', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', pulse: false };
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
      toast({ title: 'Ошибка публикации', variant: 'destructive' });
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
    setIsPausing(true);
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
    } finally {
      setIsPausing(false);
    }
  };

  // Archive tournament
  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ is_archived: true })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({ title: 'Турнир отправлен в архив' });
      setShowArchiveDialog(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error archiving:', error);
      toast({ title: 'Ошибка архивации', variant: 'destructive' });
    } finally {
      setIsArchiving(false);
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

  const format = getFormatBadge();
  const status = getStatusConfig();
  const FormatIcon = format.icon;

  const isLive = tournament.status === 'running' || tournament.status === 'paused';
  const isCompleted = tournament.status === 'completed';
  const canDelete = !isLive && !isCompleted;
  const canStart = tournament.status === 'registration' || tournament.status === 'scheduled';

  return (
    <>
      <div
        className="group relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg hover:border-primary/50 transition-all duration-200 cursor-pointer animate-fade-in"
        onClick={() => onManage(tournament.id)}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Hover glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
        
        <div className="relative p-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                {/* Status Badge */}
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${status.color} ${status.pulse ? 'animate-pulse' : ''}`}>
                  ● {status.label}
                </span>
                
                {/* Format Badge */}
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${format.color}`}>
                  <FormatIcon className="h-2.5 w-2.5" />
                  {format.label}
                </span>
                
                {/* Draft indicator */}
                {!tournament.is_published && tournament.status !== 'running' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border bg-muted/50 text-muted-foreground border-border">
                    <EyeOff className="h-2.5 w-2.5" />
                    Скрыт
                  </span>
                )}
              </div>
              
              {/* Tournament Name */}
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {tournament.name}
              </h3>
            </div>
            
            {/* Actions Menu */}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Manage */}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManage(tournament.id); }}>
                    <Settings className="h-4 w-4 mr-2" />
                    Управление
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Publish/Unpublish */}
                  {!isLive && !isCompleted && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); handlePublish(); }}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : tournament.is_published ? (
                        <EyeOff className="h-4 w-4 mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      {tournament.is_published ? 'Скрыть' : 'Опубликовать'}
                    </DropdownMenuItem>
                  )}
                  
                  {/* Start Tournament */}
                  {canStart && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); handleStart(); }}
                      disabled={isStarting}
                      className="text-green-600"
                    >
                      {isStarting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Запустить
                    </DropdownMenuItem>
                  )}
                  
                  {/* Pause/Resume */}
                  {isLive && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); handlePauseResume(); }}
                      disabled={isPausing}
                    >
                      {isPausing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : tournament.status === 'paused' ? (
                        <Play className="h-4 w-4 mr-2" />
                      ) : (
                        <Pause className="h-4 w-4 mr-2" />
                      )}
                      {tournament.status === 'paused' ? 'Возобновить' : 'Пауза'}
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Archive (for completed) */}
                  {isCompleted && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); setShowArchiveDialog(true); }}
                      disabled={isArchiving}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      В архив
                    </DropdownMenuItem>
                  )}
                  
                  {/* Delete (only if not running/completed) */}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Info Row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {/* Date/Time */}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
              <span className="text-foreground font-medium">
                {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            {/* Divider */}
            <span className="text-border">|</span>
            
            {/* Players */}
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="text-foreground font-medium">{registeredCount}</span>
              <span>/ {maxPlayers}</span>
            </div>
            
            {/* Divider */}
            <span className="text-border">|</span>
            
            {/* Buy-in */}
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              <span className="text-foreground font-medium">
                {participationFee > 0 ? `${participationFee}₽` : 'FREE'}
              </span>
            </div>
            
            {/* Level indicator for live */}
            {isLive && tournament.current_level && (
              <>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-foreground font-medium">LVL {tournament.current_level}</span>
                </div>
              </>
            )}
          </div>
          
          {/* Progress bar for registration */}
          {(tournament.status === 'registration' || tournament.status === 'scheduled') && registeredCount > 0 && (
            <div className="mt-2">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    fillPercentage >= 90 
                      ? 'bg-gradient-to-r from-destructive to-orange-500' 
                      : 'bg-gradient-to-r from-primary to-primary/70'
                  }`}
                  style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
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

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отправить в архив?</AlertDialogTitle>
            <AlertDialogDescription>
              Турнир "{tournament.name}" будет перемещён в архив. Данные RPS рейтинга сохранятся.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'В архив'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
