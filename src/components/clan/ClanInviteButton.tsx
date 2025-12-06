import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { useClanSystem } from '@/hooks/useClanSystem';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ClanInviteButtonProps {
  playerId: string;
  className?: string;
}

export function ClanInviteButton({ playerId, className }: ClanInviteButtonProps) {
  const { myClan, myMembership, invitePlayer, canInvitePlayer, playerData } = useClanSystem();
  const [canInvite, setCanInvite] = useState(false);
  const [reason, setReason] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [invited, setInvited] = useState(false);
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const checkCanInvite = useCallback(async () => {
    // Не показываем кнопку для себя
    if (playerId === playerData?.id) {
      setCanInvite(false);
      setIsLoading(false);
      return;
    }

    // Проверяем, является ли пользователь Доном (через membership или как создатель клана)
    const isDonOfClan = myClan && (
      myMembership?.hierarchy_role === 'don' || 
      myClan.don_player_id === playerData?.id
    );
    
    if (!myClan || !isDonOfClan) {
      setCanInvite(false);
      setIsLoading(false);
      return;
    }

    // Проверяем, есть ли pending приглашение
    const { data: existingInvite } = await supabase
      .from('clan_invitations')
      .select('id')
      .eq('clan_id', myClan.id)
      .eq('player_id', playerId)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      setPendingInvitationId(existingInvite.id);
      setCanInvite(false);
      setReason('Приглашение уже отправлено');
      setIsLoading(false);
      return;
    }

    setPendingInvitationId(null);
    const result = await canInvitePlayer(playerId);
    setCanInvite(result.canInvite);
    setReason(result.reason);
    setIsLoading(false);
  }, [playerId, myClan, myMembership, canInvitePlayer, playerData?.id]);

  useEffect(() => {
    checkCanInvite();
  }, [checkCanInvite]);

  const handleInvite = async () => {
    setIsInviting(true);
    const success = await invitePlayer(playerId);
    setIsInviting(false);
    if (success) {
      setInvited(true);
      setPendingInvitationId(null);
    }
  };

  const handleCancelInvitation = async () => {
    if (!pendingInvitationId) return;
    
    setIsCancelling(true);
    
    const { error } = await supabase
      .from('clan_invitations')
      .delete()
      .eq('id', pendingInvitationId);

    if (error) {
      console.error('Cancel invitation error:', error);
      toast.error('Ошибка отмены приглашения');
      setIsCancelling(false);
      return;
    }

    toast.success('Приглашение отменено');
    setPendingInvitationId(null);
    setCanInvite(true);
    setReason(undefined);
    setInvited(false);
    setIsCancelling(false);
  };

  const handleResendInvitation = async () => {
    // Сначала удаляем старое приглашение, потом отправляем новое
    if (pendingInvitationId) {
      setIsInviting(true);
      
      const { error } = await supabase
        .from('clan_invitations')
        .delete()
        .eq('id', pendingInvitationId);

      if (error) {
        console.error('Delete old invitation error:', error);
        toast.error('Ошибка удаления старого приглашения');
        setIsInviting(false);
        return;
      }

      // Отправляем новое приглашение
      const success = await invitePlayer(playerId);
      setIsInviting(false);
      
      if (success) {
        setInvited(true);
        // Обновляем состояние
        await checkCanInvite();
      }
    }
  };

  // Не показываем кнопку, если пользователь не Дон клана
  const isDonOfClan = myClan && (
    myMembership?.hierarchy_role === 'don' || 
    myClan.don_player_id === playerData?.id
  );
  
  if (!myClan || !isDonOfClan) {
    return null;
  }

  // Не показываем для себя
  if (playerId === playerData?.id) {
    return null;
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (invited && !pendingInvitationId) {
    return (
      <Button variant="outline" size="sm" disabled className={cn('text-green-500', className)}>
        <Check className="w-4 h-4 mr-1" />
        Приглашён
      </Button>
    );
  }

  // Если есть pending приглашение - показываем кнопки отмены и переотправки
  if (pendingInvitationId) {
    return (
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelInvitation}
          disabled={isCancelling}
          className={cn('text-destructive hover:text-destructive', className)}
          title="Отменить приглашение"
        >
          {isCancelling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendInvitation}
          disabled={isInviting}
          className={className}
          title="Отправить повторно"
        >
          {isInviting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  if (!canInvite) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={className}
        title={reason}
      >
        <X className="w-4 h-4 mr-1" />
        {reason === 'Игрок уже состоит в клане' ? 'В клане' : 'Недоступно'}
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleInvite}
      disabled={isInviting}
      className={className}
    >
      {isInviting ? (
        <Loader2 className="w-4 h-4 animate-spin mr-1" />
      ) : (
        <UserPlus className="w-4 h-4 mr-1" />
      )}
      В семью
    </Button>
  );
}
