import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { ClanEmblemDisplay } from './ClanEmblemDisplay';
import { useClanSystem, Clan, ClanMember } from '@/hooks/useClanSystem';
import { CLAN_HIERARCHY, ClanRole, getEmblemById } from '@/utils/clanEmblems';
import {
  Crown,
  Users,
  Trophy,
  Shield,
  UserMinus,
  UserPlus,
  Zap,
  TrendingUp,
  Swords,
  Star,
  X,
  ChevronRight
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ClanManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clan: Clan;
  isLeader: boolean;
}

// Цвета для ролей
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  don: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  consigliere: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  underboss: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  capo: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  soldier: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/50' },
  associate: { bg: 'bg-stone-500/20', text: 'text-stone-400', border: 'border-stone-500/50' },
};

export function ClanManagementModal({ open, onOpenChange, clan, isLeader }: ClanManagementModalProps) {
  const {
    removeMember,
    updateMemberRole,
    loadClanMembers,
  } = useClanSystem();

  const [members, setMembers] = useState<ClanMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'members'>('overview');

  const emblem = getEmblemById(clan.emblem_id);
  const primaryColor = emblem?.colors.primary || '#FFD700';

  useEffect(() => {
    const loadData = async () => {
      if (clan.id && open) {
        setIsLoading(true);
        const data = await loadClanMembers(clan.id);
        setMembers(data);
        setIsLoading(false);
      }
    };
    loadData();
  }, [clan.id, open, loadClanMembers]);

  // Статистика по ролям
  const roleStats = members.reduce((acc, m) => {
    const role = m.hierarchy_role || 'soldier';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Вычисляем силу клана
  const totalRating = clan.total_rating || 0;
  const maxPossibleRating = 20 * 2000; // 20 участников x 2000 RPS
  const clanStrength = Math.min(100, Math.round((totalRating / maxPossibleRating) * 100));
  
  // Средний рейтинг
  const avgRating = members.length > 0 
    ? Math.round(members.reduce((sum, m) => sum + (m.player?.elo_rating || 0), 0) / members.length)
    : 0;

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    await updateMemberRole(memberId, newRole);
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, hierarchy_role: newRole } : m
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-gradient-to-b from-card to-background border-border/50">
        {/* Header с гербом */}
        <div 
          className="relative p-6 pb-4"
          style={{
            background: `linear-gradient(180deg, ${primaryColor}15, transparent)`
          }}
        >
          <motion.div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <div className="flex items-start gap-4">
            <ClanEmblemDisplay
              emblemId={clan.emblem_id}
              sealId={clan.seal_id}
              clanName=""
              size="lg"
              showName={false}
            />
            
            <div className="flex-1">
              <DialogHeader className="text-left p-0">
                <DialogTitle 
                  className="text-2xl sm:text-3xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {clan.name}
                </DialogTitle>
              </DialogHeader>
              
              {clan.description && (
                <p className="text-sm text-muted-foreground italic mt-1">
                  "{clan.description}"
                </p>
              )}
              
              {isLeader && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 mt-2"
                >
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-yellow-500 font-semibold uppercase tracking-wider">
                    Режим управления
                  </span>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Табы */}
          <div className="flex gap-2 mt-4">
            <TabButton 
              active={selectedTab === 'overview'} 
              onClick={() => setSelectedTab('overview')}
              icon={<Shield className="w-4 h-4" />}
              label="Обзор"
              color={primaryColor}
            />
            <TabButton 
              active={selectedTab === 'members'} 
              onClick={() => setSelectedTab('members')}
              icon={<Users className="w-4 h-4" />}
              label={`Члены (${members.length})`}
              color={primaryColor}
            />
          </div>
        </div>
        
        {/* Контент */}
        <ScrollArea className="max-h-[50vh]">
          <div className="p-6 pt-2">
            <AnimatePresence mode="wait">
              {selectedTab === 'overview' ? (
                <OverviewTab 
                  key="overview"
                  clan={clan}
                  members={members}
                  roleStats={roleStats}
                  avgRating={avgRating}
                  clanStrength={clanStrength}
                  primaryColor={primaryColor}
                  isLoading={isLoading}
                />
              ) : (
                <MembersTab
                  key="members"
                  members={members}
                  isLeader={isLeader}
                  isLoading={isLoading}
                  onRemoveMember={handleRemoveMember}
                  onRoleChange={handleRoleChange}
                  primaryColor={primaryColor}
                />
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label,
  color 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
        active 
          ? 'bg-primary/20 text-primary' 
          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      )}
      style={active ? { 
        backgroundColor: `${color}20`,
        color: color 
      } : undefined}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function OverviewTab({ 
  clan, 
  members, 
  roleStats, 
  avgRating, 
  clanStrength,
  primaryColor,
  isLoading
}: {
  clan: Clan;
  members: ClanMember[];
  roleStats: Record<string, number>;
  avgRating: number;
  clanStrength: number;
  primaryColor: string;
  isLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Сила клана */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-semibold">Сила Семьи</span>
          </div>
          <span className="text-2xl font-bold" style={{ color: primaryColor }}>
            {clanStrength}%
          </span>
        </div>
        <Progress value={clanStrength} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">
          На основе общего рейтинга всех членов клана
        </p>
      </div>
      
      {/* Основная статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Членов"
          value={`${clan.members_count || members.length}/20`}
          color={primaryColor}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Общий RPS"
          value={clan.total_rating?.toString() || '0'}
          color="#FFD700"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Средний RPS"
          value={avgRating.toString()}
          color="#22C55E"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="Свободно мест"
          value={(20 - (clan.members_count || members.length)).toString()}
          color="#3B82F6"
        />
      </div>
      
      {/* Иерархия */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Swords className="w-4 h-4" />
          Структура Семьи
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(CLAN_HIERARCHY).map(([key, value]) => {
            const count = roleStats[key] || 0;
            const colors = ROLE_COLORS[key] || ROLE_COLORS.soldier;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'p-3 rounded-lg border backdrop-blur-sm',
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm font-medium', colors.text)}>
                    {value.name}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs', colors.text, colors.border)}
                  >
                    {count}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {value.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Топ-3 игрока */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" />
          Лучшие игроки
        </h4>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="space-y-2">
            {members
              .sort((a, b) => (b.player?.elo_rating || 0) - (a.player?.elo_rating || 0))
              .slice(0, 3)
              .map((member, index) => (
                <TopPlayerRow 
                  key={member.id} 
                  member={member} 
                  rank={index + 1}
                  primaryColor={primaryColor}
                />
              ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MembersTab({
  members,
  isLeader,
  isLoading,
  onRemoveMember,
  onRoleChange,
  primaryColor
}: {
  members: ClanMember[];
  isLeader: boolean;
  isLoading: boolean;
  onRemoveMember: (id: string) => void;
  onRoleChange: (id: string, role: string) => void;
  primaryColor: string;
}) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-muted-foreground"
      >
        Загрузка членов клана...
      </motion.div>
    );
  }

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = ['don', 'consigliere', 'underboss', 'capo', 'soldier', 'associate'];
    return roleOrder.indexOf(a.hierarchy_role) - roleOrder.indexOf(b.hierarchy_role);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-2"
    >
      {isLeader && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-4"
        >
          <p className="text-sm text-yellow-400 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Нажмите на карточку игрока в рейтинге, чтобы пригласить в клан
          </p>
        </motion.div>
      )}
      
      {sortedMembers.map((member, index) => (
        <MemberCard
          key={member.id}
          member={member}
          isLeader={isLeader}
          onRemove={() => onRemoveMember(member.id)}
          onRoleChange={(role) => onRoleChange(member.id, role)}
          primaryColor={primaryColor}
          index={index}
        />
      ))}
    </motion.div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center"
    >
      <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

function TopPlayerRow({ 
  member, 
  rank,
  primaryColor
}: { 
  member: ClanMember; 
  rank: number;
  primaryColor: string;
}) {
  const player = member.player;
  const role = CLAN_HIERARCHY[member.hierarchy_role as ClanRole] || CLAN_HIERARCHY.soldier;
  const colors = ROLE_COLORS[member.hierarchy_role] || ROLE_COLORS.soldier;
  
  const rankColors = ['text-yellow-400', 'text-zinc-300', 'text-amber-600'];
  const rankBgs = ['bg-yellow-500/20', 'bg-zinc-500/20', 'bg-amber-500/20'];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.1 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
        rankBgs[rank - 1],
        rankColors[rank - 1]
      )}>
        #{rank}
      </div>
      
      <Avatar className="w-10 h-10 border-2" style={{ borderColor: primaryColor }}>
        <AvatarImage src={player?.avatar_url || undefined} />
        <AvatarFallback>{player?.name?.charAt(0) || '?'}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{player?.name || 'Неизвестно'}</div>
        <div className="text-xs text-muted-foreground">{role.name}</div>
      </div>
      
      <div className="text-right">
        <div className="font-bold text-primary">{player?.elo_rating || 0}</div>
        <div className="text-[10px] text-muted-foreground">RPS</div>
      </div>
    </motion.div>
  );
}

function MemberCard({
  member,
  isLeader,
  onRemove,
  onRoleChange,
  primaryColor,
  index
}: {
  member: ClanMember;
  isLeader: boolean;
  onRemove: () => void;
  onRoleChange: (role: string) => void;
  primaryColor: string;
  index: number;
}) {
  const player = member.player;
  const role = CLAN_HIERARCHY[member.hierarchy_role as ClanRole] || CLAN_HIERARCHY.soldier;
  const colors = ROLE_COLORS[member.hierarchy_role] || ROLE_COLORS.soldier;
  const isDon = member.hierarchy_role === 'don';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border backdrop-blur-sm',
        colors.bg,
        colors.border
      )}
    >
      <Avatar className="w-12 h-12 border-2" style={{ borderColor: isDon ? '#FFD700' : primaryColor }}>
        <AvatarImage src={player?.avatar_url || undefined} />
        <AvatarFallback>{player?.name?.charAt(0) || '?'}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{player?.name || 'Неизвестно'}</span>
          {isDon && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="w-3 h-3" />
          {player?.elo_rating || 0} RPS
          <span className="text-muted-foreground/50">•</span>
          {player?.games_played || 0} игр
        </div>
      </div>
      
      {isLeader && !isDon ? (
        <div className="flex items-center gap-2">
          <Select value={member.hierarchy_role} onValueChange={onRoleChange}>
            <SelectTrigger className="w-28 h-8 text-xs">
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
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/20">
                <UserMinus className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Исключить из клана?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы уверены, что хотите исключить {player?.name} из клана?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove} className="bg-destructive hover:bg-destructive/90">
                  Исключить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <Badge className={cn('text-xs', colors.bg, colors.text, colors.border)}>
          {role.name}
        </Badge>
      )}
    </motion.div>
  );
}
