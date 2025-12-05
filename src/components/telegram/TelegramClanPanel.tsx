import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Crown, Users, Plus, LogOut, Loader2, Shield, Stamp, Check, ChevronLeft, ChevronRight, Mail, UserPlus } from 'lucide-react';
import { ClanEmblemDisplay } from '@/components/clan/ClanEmblemDisplay';
import { ClanEmblemSVG, ClanSealSVG } from '@/components/clan/ClanEmblemSVG';
import { useClanSystem, ClanMember, ClanInvitation } from '@/hooks/useClanSystem';
import { CLAN_HIERARCHY, CLAN_EMBLEMS, CLAN_SEALS } from '@/utils/clanEmblems';
import { fixStorageUrl } from '@/utils/storageUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
    pendingInvitations,
    createClan,
    leaveClan,
    loadClanMembers,
    acceptInvitation,
    declineInvitation
  } = useClanSystem();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [clanName, setClanName] = useState('');
  const [clanDescription, setClanDescription] = useState('');
  const [selectedEmblem, setSelectedEmblem] = useState(1);
  const [selectedSeal, setSelectedSeal] = useState(1);
  const [creating, setCreating] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  const handleCreateClan = async () => {
    if (!clanName.trim()) {
      toast.error('Введите название клана');
      return;
    }

    setCreating(true);
    try {
      await createClan(clanName.trim(), selectedEmblem, selectedSeal, clanDescription.trim() || undefined);
      toast.success('Клан создан!');
      setShowCreateModal(false);
      resetCreateForm();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания клана');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateStep(1);
    setClanName('');
    setClanDescription('');
    setSelectedEmblem(1);
    setSelectedSeal(1);
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

  const handleAcceptInvitation = async (invitation: ClanInvitation) => {
    setProcessingInvite(invitation.id);
    try {
      await acceptInvitation(invitation.id, invitation.clan_id);
      toast.success('Вы вступили в клан!');
      setShowInvitations(false);
    } catch (error) {
      toast.error('Ошибка принятия приглашения');
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDeclineInvitation = async (invitation: ClanInvitation) => {
    setProcessingInvite(invitation.id);
    try {
      await declineInvitation(invitation.id);
      toast.success('Приглашение отклонено');
    } catch (error) {
      toast.error('Ошибка отклонения приглашения');
    } finally {
      setProcessingInvite(null);
    }
  };

  // Панель приглашений
  if (pendingInvitations.length > 0 && !myClan) {
    return (
      <>
        <Card className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 brutal-border border-emerald-500/50 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center brutal-border">
                <Mail className="h-5 w-5 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-display text-emerald-400">Приглашения в кланы</h3>
                <p className="text-xs text-muted-foreground">
                  {pendingInvitations.length} приглашение(й)
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => setShowInvitations(true)}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 brutal-border font-bold"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Просмотреть
            </Button>
          </CardContent>
        </Card>

        {/* Invitations Dialog */}
        <Dialog open={showInvitations} onOpenChange={setShowInvitations}>
          <DialogContent className="bg-syndikate-metal border-emerald-500/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-400">
                <Mail className="h-5 w-5" />
                Приглашения
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="p-3 bg-background/30 rounded brutal-border space-y-2">
                  <div className="flex items-center gap-2">
                    {invitation.clan && (
                      <ClanEmblemDisplay
                        emblemId={invitation.clan.emblem_id}
                        sealId={invitation.clan.seal_id}
                        clanName={invitation.clan.name}
                        size="sm"
                        showName={false}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{invitation.clan?.name || 'Неизвестный клан'}</div>
                      <div className="text-xs text-muted-foreground">
                        Рейтинг: {invitation.clan?.total_rating || 0} RPS
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineInvitation(invitation)}
                      disabled={processingInvite === invitation.id}
                      className="flex-1 brutal-border border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      Отклонить
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation)}
                      disabled={processingInvite === invitation.id}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 brutal-border"
                    >
                      {processingInvite === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Принять'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

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
          <DialogContent className="bg-syndikate-metal border-amber-500/50 max-w-sm">
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

        {/* Multi-Step Create Clan Modal */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) resetCreateForm(); }}>
          <DialogContent className="bg-syndikate-metal border-cyan-400/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-cyan-400">
                <Crown className="h-5 w-5" />
                Создание клана
              </DialogTitle>
              <DialogDescription>
                Шаг {createStep} из 4
              </DialogDescription>
            </DialogHeader>
            
            {/* Progress bar */}
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'flex-1 h-1 rounded-full transition-colors',
                    s <= createStep ? 'bg-cyan-400' : 'bg-muted'
                  )}
                />
              ))}
            </div>

            {/* Step 1: Name & Description */}
            {createStep === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <Crown className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                  <p className="text-sm text-muted-foreground">Дайте имя своей семье</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Название клана</label>
                  <Input
                    value={clanName}
                    onChange={(e) => setClanName(e.target.value)}
                    placeholder="Введите название..."
                    className="brutal-border"
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{clanName.length}/30</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Описание (опционально)</label>
                  <Input
                    value={clanDescription}
                    onChange={(e) => setClanDescription(e.target.value)}
                    placeholder="Девиз или описание..."
                    className="brutal-border"
                    maxLength={100}
                  />
                </div>
                <Button
                  onClick={() => setCreateStep(2)}
                  disabled={!clanName.trim()}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 brutal-border"
                >
                  Далее: Выбрать герб
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Emblem */}
            {createStep === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <Shield className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
                  <p className="text-sm text-muted-foreground">Выберите герб семьи</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {CLAN_EMBLEMS.map((emblem) => (
                    <button
                      key={emblem.id}
                      onClick={() => setSelectedEmblem(emblem.id)}
                      className={cn(
                        'relative p-2 rounded-lg border-2 transition-all',
                        selectedEmblem === emblem.id
                          ? 'border-cyan-400 bg-cyan-400/10'
                          : 'border-border hover:border-cyan-400/50'
                      )}
                    >
                      <ClanEmblemSVG emblemId={emblem.id} size={36} />
                      {selectedEmblem === emblem.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  {CLAN_EMBLEMS.find(e => e.id === selectedEmblem)?.nameRu}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCreateStep(1)} className="flex-1 brutal-border">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Назад
                  </Button>
                  <Button onClick={() => setCreateStep(3)} className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 brutal-border">
                    Далее
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Seal */}
            {createStep === 3 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <Stamp className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
                  <p className="text-sm text-muted-foreground">Выберите печать семьи</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {CLAN_SEALS.map((seal) => (
                    <button
                      key={seal.id}
                      onClick={() => setSelectedSeal(seal.id)}
                      className={cn(
                        'relative p-2 rounded-lg border-2 transition-all',
                        selectedSeal === seal.id
                          ? 'border-cyan-400 bg-cyan-400/10'
                          : 'border-border hover:border-cyan-400/50'
                      )}
                    >
                      <ClanSealSVG sealId={seal.id} size={36} />
                      {selectedSeal === seal.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  {CLAN_SEALS.find(s => s.id === selectedSeal)?.nameRu}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCreateStep(2)} className="flex-1 brutal-border">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Назад
                  </Button>
                  <Button onClick={() => setCreateStep(4)} className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 brutal-border">
                    Предпросмотр
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Preview */}
            {createStep === 4 && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">Ваш клан готов!</p>
                  <ClanEmblemDisplay
                    emblemId={selectedEmblem}
                    sealId={selectedSeal}
                    clanName={clanName}
                    size="lg"
                  />
                  {clanDescription && (
                    <p className="mt-3 text-xs text-muted-foreground italic">"{clanDescription}"</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCreateStep(3)} className="flex-1 brutal-border">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Назад
                  </Button>
                  <Button
                    onClick={handleCreateClan}
                    disabled={creating}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 brutal-border"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Crown className="h-4 w-4 mr-2" />
                    )}
                    Создать
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Если не может создать клан и не состоит в клане
  return null;
}