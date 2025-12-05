import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Crown, Users, Plus, LogOut, Loader2 } from 'lucide-react';
import { ClanEmblemDisplay } from '@/components/clan/ClanEmblemDisplay';
import { useClanSystem, ClanMember } from '@/hooks/useClanSystem';
import { CLAN_HIERARCHY } from '@/utils/clanEmblems';
import { fixStorageUrl } from '@/utils/storageUtils';
import { toast } from 'sonner';

interface TelegramClanPanelProps {
  canCreateClan: boolean;
  playerId?: string;
}

// Цвета для ролей
const ROLE_COLORS: Record<string, string> = {
  don: 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white',
  consigliere: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  caporegime: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
  underboss: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  soldier: 'bg-zinc-600 text-white',
  associate: 'bg-zinc-700 text-zinc-300'
};

export function TelegramClanPanel({ canCreateClan, playerId }: TelegramClanPanelProps) {
  const {
    myClan,
    myMembership,
    isDon,
    createClan,
    leaveClan,
    loadClanMembers
  } = useClanSystem();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clanName, setClanName] = useState('');
  const [clanDescription, setClanDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const handleCreateClan = async () => {
    if (!clanName.trim()) {
      toast.error('Введите название клана');
      return;
    }

    setCreating(true);
    try {
      // Используем дефолтные emblemId=1 и sealId=1
      await createClan(clanName.trim(), 1, 1, clanDescription.trim() || undefined);
      toast.success('Клан создан!');
      setShowCreateModal(false);
      setClanName('');
      setClanDescription('');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания клана');
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveClan = async () => {
    try {
      await leaveClan();
      toast.success('Вы покинули клан');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при выходе из клана');
    }
  };

  const handleShowMembers = async () => {
    if (myClan) {
      setLoadingMembers(true);
      try {
        const clanMembers = await loadClanMembers(myClan.id);
        setMembers(clanMembers || []);
        setShowMembers(true);
      } catch (error) {
        toast.error('Ошибка загрузки участников');
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  // Если у игрока уже есть клан
  if (myClan && myMembership) {
    const roleInfo = CLAN_HIERARCHY[myMembership.hierarchy_role as keyof typeof CLAN_HIERARCHY];
    const roleColor = ROLE_COLORS[myMembership.hierarchy_role] || 'bg-zinc-600 text-white';

    return (
      <Card className="bg-gradient-to-br from-amber-900/30 to-amber-950/50 brutal-border border-amber-500/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Clan Header */}
          <div className="flex items-center gap-3">
            <ClanEmblemDisplay
              emblemId={myClan.emblem_id}
              sealId={myClan.seal_id}
              clanName={myClan.name}
              size="sm"
              showName={false}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-display text-amber-400 truncate">{myClan.name}</h3>
                <Badge className={`text-[10px] ${roleColor}`}>
                  {roleInfo?.name || myMembership.hierarchy_role}
                </Badge>
              </div>
              {myClan.description && (
                <p className="text-xs text-muted-foreground truncate">{myClan.description}</p>
              )}
            </div>
          </div>

          {/* Clan Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background/30 p-2 rounded brutal-border border-amber-500/20 text-center">
              <div className="text-amber-400 font-bold text-lg">{myClan.total_rating || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Рейтинг</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowMembers}
              disabled={loadingMembers}
              className="brutal-border border-amber-500/30 hover:bg-amber-500/10"
            >
              {loadingMembers ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Участники
            </Button>
          </div>

          {/* Actions */}
          {!isDon && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeaveClan}
              className="w-full brutal-border border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Покинуть клан
            </Button>
          )}
        </CardContent>

        {/* Members Dialog */}
        <Dialog open={showMembers} onOpenChange={setShowMembers}>
          <DialogContent className="bg-syndikate-metal border-amber-500/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-400">
                <Users className="h-5 w-5" />
                Участники клана
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((member) => {
                const memberRoleInfo = CLAN_HIERARCHY[member.hierarchy_role as keyof typeof CLAN_HIERARCHY];
                const memberRoleColor = ROLE_COLORS[member.hierarchy_role] || 'bg-zinc-600 text-white';
                return (
                  <div key={member.id} className="flex items-center gap-3 p-2 bg-background/30 rounded brutal-border">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.player?.avatar_url ? fixStorageUrl(member.player.avatar_url) : undefined} />
                      <AvatarFallback className="bg-amber-500 text-background">
                        {member.player?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{member.player?.name}</div>
                      <Badge className={`text-[9px] ${memberRoleColor}`}>
                        {memberRoleInfo?.name || member.hierarchy_role}
                      </Badge>
                    </div>
                    <div className="text-xs text-amber-400 font-bold">
                      {member.player?.elo_rating || 0} RPS
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">Нет участников</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Если игрок может создать клан (ранг Дон)
  if (canCreateClan) {
    return (
      <>
        <Card className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 brutal-border border-cyan-400/50 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center brutal-border">
                <Crown className="h-6 w-6 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-display text-cyan-400">Создай свою Семью</h3>
                <p className="text-xs text-muted-foreground">
                  Как Дон, вы можете основать собственный клан
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 brutal-border font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать клан
            </Button>
          </CardContent>
        </Card>

        {/* Create Clan Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-syndikate-metal border-cyan-400/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-cyan-400">
                <Crown className="h-5 w-5" />
                Создание клана
              </DialogTitle>
              <DialogDescription>
                Станьте Доном своей собственной семьи
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Название клана
                </label>
                <Input
                  value={clanName}
                  onChange={(e) => setClanName(e.target.value)}
                  placeholder="Введите название..."
                  className="brutal-border"
                  maxLength={30}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Описание (опционально)
                </label>
                <Input
                  value={clanDescription}
                  onChange={(e) => setClanDescription(e.target.value)}
                  placeholder="Краткое описание клана..."
                  className="brutal-border"
                  maxLength={100}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="brutal-border"
              >
                Отмена
              </Button>
              <Button
                onClick={handleCreateClan}
                disabled={creating || !clanName.trim()}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 brutal-border"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Если не может создать клан и не состоит в клане
  return null;
}
