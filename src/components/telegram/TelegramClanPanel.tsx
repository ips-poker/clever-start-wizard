import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Crown, Users, Plus, LogOut, Loader2, Shield, Stamp, Check, ChevronLeft, ChevronRight, Mail, UserPlus, Trophy, Zap, Star, Swords, TrendingUp, UserMinus, Pencil } from 'lucide-react';
import { ClanEditModal } from '@/components/clan/ClanEditModal';
import { ClanEmblemDisplay } from '@/components/clan/ClanEmblemDisplay';
import { useClanSystem, ClanMember, ClanInvitation } from '@/hooks/useClanSystem';
import { CLAN_HIERARCHY, ClanRole } from '@/utils/clanEmblems';
import { CLAN_EMBLEM_IMAGES, CLAN_SEAL_IMAGES, getEmblemImageById } from '@/utils/clanEmblemsImages';
import { fixStorageUrl } from '@/utils/storageUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TelegramClanPanelProps {
  canCreateClan: boolean;
  playerId?: string;
}

// Цвета для ролей
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  don: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', badge: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black' },
  consigliere: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', badge: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' },
  underboss: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', badge: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' },
  capo: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50', badge: 'bg-gradient-to-r from-orange-500 to-red-500 text-white' },
  soldier: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/50', badge: 'bg-zinc-600 text-white' },
  associate: { bg: 'bg-stone-500/20', text: 'text-stone-400', border: 'border-stone-500/50', badge: 'bg-stone-600 text-white' },
};

export function TelegramClanPanel({ canCreateClan, playerId }: TelegramClanPanelProps) {
  const {
    myClan,
    myMembership,
    isDon,
    pendingInvitations,
    createClan,
    updateClan,
    leaveClan,
    loadClanMembers,
    acceptInvitation,
    declineInvitation,
    removeMember,
    updateMemberRole,
    setMyClan
  } = useClanSystem({ telegramPlayerId: playerId });

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
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSaveClan = async (updates: { name?: string; emblem_id?: number; seal_id?: number; description?: string }) => {
    if (!myClan) return false;
    const success = await updateClan(myClan.id, updates);
    if (success && myClan) {
      setMyClan({ ...myClan, ...updates });
    }
    return success;
  };

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
      await declineInvitation(invitation.id, invitation.clan_id);
      toast.success('Приглашение отклонено');
    } catch (error) {
      toast.error('Ошибка отклонения приглашения');
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Участник исключён');
    } catch (error) {
      toast.error('Ошибка при исключении участника');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole(memberId, newRole);
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, hierarchy_role: newRole } : m
      ));
      toast.success('Роль изменена');
    } catch (error) {
      toast.error('Ошибка при изменении роли');
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
    const colors = ROLE_COLORS[myMembership.hierarchy_role] || ROLE_COLORS.soldier;
    const emblem = getEmblemImageById(myClan.emblem_id);
    const primaryColor = '#FFD700';
    const isLeader = myMembership.hierarchy_role === 'don';
    
    // Вычисляем силу клана
    const totalRating = myClan.total_rating || 0;
    const maxPossibleRating = 20 * 2000;
    const clanStrength = Math.min(100, Math.round((totalRating / maxPossibleRating) * 100));
    
    // Статистика по ролям
    const roleStats = members.reduce((acc, m) => {
      const role = m.hierarchy_role || 'soldier';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Средний рейтинг
    const avgRating = members.length > 0 
      ? Math.round(members.reduce((sum, m) => sum + (m.player?.elo_rating || 0), 0) / members.length)
      : 0;

    return (
      <>
        {/* Красивая карточка клана */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShowMembers}
          className="relative cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br from-card via-secondary/50 to-card border border-border/50 backdrop-blur-sm"
          style={{
            boxShadow: `0 0 20px ${primaryColor}20, inset 0 1px 0 ${primaryColor}20`
          }}
        >
          {/* Фоновый эффект */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 20%, ${primaryColor} 0%, transparent 50%),
                               radial-gradient(circle at 70% 80%, ${primaryColor} 0%, transparent 50%)`
            }}
          />
          
          {/* Анимированная линия */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              {/* Герб */}
              <div className="flex-shrink-0">
                <ClanEmblemDisplay
                  emblemId={myClan.emblem_id}
                  sealId={myClan.seal_id}
                  clanName=""
                  size="md"
                  showName={false}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Заголовок */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h3 
                      className="font-bold text-lg truncate"
                      style={{ color: primaryColor }}
                    >
                      {myClan.name}
                    </h3>
                    {isLeader && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1 mt-0.5"
                      >
                        <Crown className="w-3 h-3 text-yellow-500" />
                        <span className="text-[10px] text-yellow-500 font-semibold uppercase tracking-wider">
                          Вы — Дон
                        </span>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Индикатор силы */}
                  <motion.div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/50 backdrop-blur-sm"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold" style={{ color: primaryColor }}>
                      {clanStrength}%
                    </span>
                  </motion.div>
                </div>
                
                {/* Описание */}
                {myClan.description && (
                  <p className="text-[11px] text-muted-foreground italic truncate mb-2">
                    "{myClan.description}"
                  </p>
                )}
                
                {/* Статистика */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                    <span className="text-xs font-bold" style={{ color: primaryColor }}>
                      {myClan.members_count || 0}/20
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-500">
                      {myClan.total_rating || 0} RPS
                    </span>
                  </div>
                  <Badge className={`text-[9px] ${colors.badge}`}>
                    {roleInfo?.name || myMembership.hierarchy_role}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Подсказка */}
            <motion.div
              className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground/50"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Нажмите для управления →
            </motion.div>
          </div>
        </motion.div>

        {/* Модальное окно управления кланом */}
        <Dialog open={showMembers} onOpenChange={setShowMembers}>
          <DialogContent className="bg-gradient-to-b from-card to-background border-border/50 max-w-md max-h-[85vh] p-0 overflow-hidden">
            {/* Header */}
            <div 
              className="relative p-4"
              style={{ background: `linear-gradient(180deg, ${primaryColor}15, transparent)` }}
            >
              <motion.div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              <div className="flex items-start gap-3">
                <ClanEmblemDisplay
                  emblemId={myClan.emblem_id}
                  sealId={myClan.seal_id}
                  clanName=""
                  size="md"
                  showName={false}
                />
                
                <div className="flex-1">
                  <DialogHeader className="text-left p-0">
                    <DialogTitle 
                      className="text-xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      {myClan.name}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {myClan.description && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      "{myClan.description}"
                    </p>
                  )}
                  
                  {isLeader && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1 mt-1"
                    >
                      <Crown className="w-3 h-3 text-yellow-500" />
                      <span className="text-[10px] text-yellow-500 font-semibold uppercase tracking-wider">
                        Режим управления
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Контент */}
            <ScrollArea className="max-h-[55vh] px-4 pb-4">
              <div className="space-y-4">
                {/* Сила клана */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Сила Семьи</span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                      {clanStrength}%
                    </span>
                  </div>
                  <Progress value={clanStrength} className="h-2" />
                </div>
                
                {/* Статистика */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
                    <Users className="w-4 h-4 mx-auto mb-0.5" style={{ color: primaryColor }} />
                    <div className="text-sm font-bold" style={{ color: primaryColor }}>{myClan.members_count || members.length}/20</div>
                    <div className="text-[8px] text-muted-foreground uppercase">Членов</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
                    <Trophy className="w-4 h-4 mx-auto mb-0.5 text-yellow-500" />
                    <div className="text-sm font-bold text-yellow-500">{myClan.total_rating || 0}</div>
                    <div className="text-[8px] text-muted-foreground uppercase">RPS</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
                    <TrendingUp className="w-4 h-4 mx-auto mb-0.5 text-emerald-500" />
                    <div className="text-sm font-bold text-emerald-500">{avgRating}</div>
                    <div className="text-[8px] text-muted-foreground uppercase">Средний</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
                    <Star className="w-4 h-4 mx-auto mb-0.5 text-blue-500" />
                    <div className="text-sm font-bold text-blue-500">{20 - (myClan.members_count || members.length)}</div>
                    <div className="text-[8px] text-muted-foreground uppercase">Мест</div>
                  </div>
                </div>
                
                {/* Структура */}
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" />
                    Структура Семьи
                  </h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(CLAN_HIERARCHY).map(([key, value]) => {
                      const count = roleStats[key] || 0;
                      const roleColors = ROLE_COLORS[key] || ROLE_COLORS.soldier;
                      
                      return (
                        <div
                          key={key}
                          className={cn(
                            'p-2 rounded-lg border backdrop-blur-sm',
                            roleColors.bg,
                            roleColors.border
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('text-[10px] font-medium', roleColors.text)}>
                              {value.name}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn('text-[9px] h-4 px-1', roleColors.text, roleColors.border)}
                            >
                              {count}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Кнопки управления для Дона */}
                {isLeader && (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setShowEditModal(true)}
                      variant="outline"
                      className="w-full brutal-border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Редактировать клан
                    </Button>
                    
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
                    >
                      <p className="text-[11px] text-yellow-400 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" />
                        Нажмите на карточку игрока в рейтинге, чтобы пригласить
                      </p>
                    </motion.div>
                  </div>
                )}
                
                {/* Члены клана */}
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Члены семьи ({members.length})
                  </h4>
                  
                  {loadingMembers ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Загрузка...
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {members
                        .sort((a, b) => {
                          const roleOrder = ['don', 'consigliere', 'underboss', 'capo', 'soldier', 'associate'];
                          return roleOrder.indexOf(a.hierarchy_role) - roleOrder.indexOf(b.hierarchy_role);
                        })
                        .map((member, index) => {
                          const memberRoleInfo = CLAN_HIERARCHY[member.hierarchy_role as ClanRole] || CLAN_HIERARCHY.soldier;
                          const memberColors = ROLE_COLORS[member.hierarchy_role] || ROLE_COLORS.soldier;
                          const memberIsDon = member.hierarchy_role === 'don';
                          
                          return (
                            <motion.div
                              key={member.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded-lg border backdrop-blur-sm',
                                memberColors.bg,
                                memberColors.border
                              )}
                            >
                              <Avatar className="w-9 h-9 border" style={{ borderColor: memberIsDon ? '#FFD700' : primaryColor }}>
                                <AvatarImage src={member.player?.avatar_url ? fixStorageUrl(member.player.avatar_url) : undefined} />
                                <AvatarFallback>{member.player?.name?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium truncate">{member.player?.name}</span>
                                  {memberIsDon && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <Trophy className="w-2.5 h-2.5" />
                                  {member.player?.elo_rating || 0} RPS
                                  <span className="text-muted-foreground/50">•</span>
                                  {member.player?.games_played || 0} игр
                                </div>
                              </div>
                              
                              {isLeader && !memberIsDon ? (
                                <div className="flex items-center gap-1">
                                  <Select 
                                    value={member.hierarchy_role} 
                                    onValueChange={(role) => handleRoleChange(member.id, role)}
                                  >
                                    <SelectTrigger className="w-20 h-7 text-[10px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(CLAN_HIERARCHY)
                                        .filter(([key]) => key !== 'don')
                                        .map(([key, value]) => (
                                          <SelectItem key={key} value={key} className="text-xs">
                                            {value.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20">
                                        <UserMinus className="w-3.5 h-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Исключить из клана?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Вы уверены, что хотите исключить {member.player?.name}?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleRemoveMember(member.id)}
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Исключить
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ) : (
                                <Badge className={cn('text-[9px]', memberColors.badge)}>
                                  {memberRoleInfo.name}
                                </Badge>
                              )}
                            </motion.div>
                          );
                        })}
                      
                      {members.length === 0 && !loadingMembers && (
                        <p className="text-center text-muted-foreground text-sm py-4">Нет участников</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Кнопка выхода */}
                {!isLeader && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Покинуть клан
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Покинуть клан?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Вы уверены, что хотите покинуть "{myClan.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeaveClan}>
                          Покинуть
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Модалка редактирования клана */}
        {myClan && isLeader && (
          <ClanEditModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            clan={myClan}
            onSave={handleSaveClan}
          />
        )}
      </>
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
                  {CLAN_EMBLEM_IMAGES.map((emblem) => (
                    <button
                      key={emblem.id}
                      onClick={() => setSelectedEmblem(emblem.id)}
                      className={cn(
                        'relative p-1 rounded-lg border-2 transition-all',
                        selectedEmblem === emblem.id
                          ? 'border-cyan-400 bg-cyan-400/10'
                          : 'border-border hover:border-cyan-400/50'
                      )}
                    >
                      <img 
                        src={emblem.image} 
                        alt={emblem.nameRu}
                        className="w-10 h-10 rounded object-cover"
                      />
                      {selectedEmblem === emblem.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  {CLAN_EMBLEM_IMAGES.find(e => e.id === selectedEmblem)?.nameRu}
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
                  {CLAN_SEAL_IMAGES.map((seal) => (
                    <button
                      key={seal.id}
                      onClick={() => setSelectedSeal(seal.id)}
                      className={cn(
                        'relative p-1 rounded-lg border-2 transition-all',
                        selectedSeal === seal.id
                          ? 'border-cyan-400 bg-cyan-400/10'
                          : 'border-border hover:border-cyan-400/50'
                      )}
                    >
                      <img 
                        src={seal.image} 
                        alt={seal.nameRu}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {selectedSeal === seal.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  {CLAN_SEAL_IMAGES.find(s => s.id === selectedSeal)?.nameRu}
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