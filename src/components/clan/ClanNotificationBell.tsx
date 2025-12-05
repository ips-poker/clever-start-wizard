import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClanRealtimeNotifications } from '@/hooks/useClanRealtimeNotifications';
import { useClanSystem } from '@/hooks/useClanSystem';
import { CLAN_EMBLEMS } from '@/utils/clanEmblems';
import { cn } from '@/lib/utils';

export function ClanNotificationBell() {
  const { playerData, acceptInvitation, declineInvitation, refresh } = useClanSystem();
  const { newInvitations, unreadCount, clearNotifications } = useClanRealtimeNotifications(playerData?.id || null);

  const handleAccept = async (invitationId: string, clanId: string) => {
    const success = await acceptInvitation(invitationId, clanId);
    if (success) {
      refresh();
    }
  };

  const handleDecline = async (invitationId: string) => {
    const success = await declineInvitation(invitationId);
    if (success) {
      refresh();
    }
  };

  if (!playerData) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Приглашения в семью</h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {newInvitations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Нет новых приглашений
            </div>
          ) : (
            <div className="divide-y divide-border">
              {newInvitations.map((invitation) => {
                const emblem = CLAN_EMBLEMS.find(e => e.id === invitation.clan?.emblem_id);
                return (
                  <div key={invitation.id} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                        {emblem?.icon || '🏠'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {invitation.clan?.name || 'Неизвестная семья'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Приглашение в клан
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAccept(invitation.id, invitation.clan_id)}
                      >
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDecline(invitation.id)}
                      >
                        Отклонить
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
