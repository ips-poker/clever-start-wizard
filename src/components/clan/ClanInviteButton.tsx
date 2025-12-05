import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, X, Loader2 } from 'lucide-react';
import { useClanSystem } from '@/hooks/useClanSystem';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    const checkCanInvite = async () => {
      // Не показываем кнопку для себя
      if (playerId === playerData?.id) {
        setCanInvite(false);
        setIsLoading(false);
        return;
      }

      // Проверяем, является ли пользователь Доном
      if (!myClan || myMembership?.hierarchy_role !== 'don') {
        setCanInvite(false);
        setIsLoading(false);
        return;
      }

      const result = await canInvitePlayer(playerId);
      setCanInvite(result.canInvite);
      setReason(result.reason);
      setIsLoading(false);
    };

    checkCanInvite();
  }, [playerId, myClan, myMembership, canInvitePlayer, playerData?.id]);

  const handleInvite = async () => {
    setIsInviting(true);
    const success = await invitePlayer(playerId);
    setIsInviting(false);
    if (success) {
      setInvited(true);
    }
  };

  // Не показываем кнопку, если пользователь не Дон
  if (!myClan || myMembership?.hierarchy_role !== 'don') {
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

  if (invited) {
    return (
      <Button variant="outline" size="sm" disabled className={cn('text-green-500', className)}>
        <Check className="w-4 h-4 mr-1" />
        Приглашён
      </Button>
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
        {reason === 'Приглашение уже отправлено' ? 'Уже приглашён' : 'Недоступно'}
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
