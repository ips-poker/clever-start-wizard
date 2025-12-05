import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ClanCreationModal } from './ClanCreationModal';
import { useClanSystem, ClanMember } from '@/hooks/useClanSystem';
import { CLAN_HIERARCHY, ClanRole } from '@/utils/clanEmblems';
import {
  Crown,
  Users,
  Settings,
  UserMinus,
  LogOut,
  Plus,
  Trophy,
  Shield
} from 'lucide-react';

export function ClanManagementPanel() {
  const {
    myClan,
    myMembership,
    isDon,
    createClan,
    removeMember,
    leaveClan,
    updateMemberRole,
    loadClanMembers
  } = useClanSystem();

  const [members, setMembers] = useState<ClanMember[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      if (myClan?.id) {
        setIsLoadingMembers(true);
        const data = await loadClanMembers(myClan.id);
        setMembers(data);
        setIsLoadingMembers(false);
      }
    };
    loadMembers();
  }, [myClan?.id, loadClanMembers]);

  // Если нет клана и игрок Дон - показываем кнопку создания
  if (!myClan && isDon) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Crown className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Создайте свой клан</h3>
            <p className="text-muted-foreground mb-6">
              Вы достигли ранга Дон! Теперь вы можете создать свою семью
              и собрать команду до 20 игроков.
            </p>
            <Button onClick={() => setShowCreateModal(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Создать клан
            </Button>
          </div>

          <ClanCreationModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
            onCreateClan={createClan}
          />
        </CardContent>
      </Card>
    );
  }

  // Если нет клана и не Дон
  if (!myClan) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">Вы не состоите в клане</h3>
            <p className="text-muted-foreground">
              Дождитесь приглашения от Дона или достигните ранга Дон,
              чтобы создать свой клан.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLeader = myMembership?.hierarchy_role === 'don';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Мой клан
          </div>
          {isLeader && (
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Настройки
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Информация о клане */}
        <div className="flex items-center gap-4">
          <ClanEmblemDisplay
            emblemId={myClan.emblem_id}
            sealId={myClan.seal_id}
            clanName={myClan.name}
            size="lg"
          />
          <div className="flex-1">
            {myClan.description && (
              <p className="text-sm text-muted-foreground italic mb-2">
                "{myClan.description}"
              </p>
            )}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{myClan.members_count || 0}/20</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>{myClan.total_rating} RPS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Список членов */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Члены семьи ({members.length})
          </h4>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {isLoadingMembers ? (
              <div className="text-center py-4 text-muted-foreground">
                Загрузка...
              </div>
            ) : (
              members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isLeader={isLeader}
                  onRemove={() => removeMember(member.id)}
                  onRoleChange={(role) => updateMemberRole(member.id, role)}
                />
              ))
            )}
          </div>
        </div>

        {/* Кнопка выхода для не-лидеров */}
        {!isLeader && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Покинуть клан
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Покинуть клан?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы уверены, что хотите покинуть клан "{myClan.name}"?
                  Вы сможете вступить в другой клан после выхода.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={leaveClan}>
                  Покинуть
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}

function MemberRow({
  member,
  isLeader,
  onRemove,
  onRoleChange
}: {
  member: ClanMember;
  isLeader: boolean;
  onRemove: () => void;
  onRoleChange: (role: string) => void;
}) {
  const player = member.player;
  const role = CLAN_HIERARCHY[member.hierarchy_role as ClanRole] || CLAN_HIERARCHY.soldier;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={player?.avatar_url || undefined} />
        <AvatarFallback>{player?.name?.charAt(0) || '?'}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{player?.name || 'Неизвестно'}</div>
        <div className="text-xs text-muted-foreground">
          {player?.elo_rating || 0} RPS
        </div>
      </div>

      {isLeader && member.hierarchy_role !== 'don' ? (
        <Select value={member.hierarchy_role} onValueChange={onRoleChange}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CLAN_HIERARCHY)
              .filter(([key]) => key !== 'don')
              .map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant={member.hierarchy_role === 'don' ? 'default' : 'secondary'}>
          {role.name}
        </Badge>
      )}

      {isLeader && member.hierarchy_role !== 'don' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive">
              <UserMinus className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить из клана?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить {player?.name} из клана?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={onRemove}>
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
}
