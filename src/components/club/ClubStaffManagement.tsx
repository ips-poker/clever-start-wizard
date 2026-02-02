import { useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useClubStaff } from "@/hooks/useClubStaff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  UserPlus, 
  MoreVertical, 
  Crown,
  Shield,
  Briefcase,
  User,
  Trash2,
  Loader2
} from "lucide-react";
import { ClubRole, ROLE_NAMES } from "@/types/club";

const ROLE_ICONS: Record<ClubRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  director: Briefcase,
  member: User
};

const ROLE_COLORS: Record<ClubRole, string> = {
  owner: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  admin: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  director: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  member: "bg-muted text-muted-foreground"
};

export function ClubStaffManagement() {
  const { club, isOwner } = useClub();
  const { staff, loading, updateStaffRole, removeStaffMember } = useClubStaff({ clanId: club?.id });
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Персонал клуба</h2>
          <p className="text-sm text-muted-foreground">
            {staff.length} сотрудников
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить сотрудника</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center text-muted-foreground">
              <p>Функция добавления сотрудников через выбор из членов клуба.</p>
              <p className="text-sm mt-2">Будет доступна в следующем обновлении.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff List */}
      <div className="grid gap-3">
        {staff.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role];
          const roleColor = ROLE_COLORS[member.role];
          const isOwnerRole = member.role === 'owner';

          return (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.player?.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.player?.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {member.player?.name || 'Неизвестный'}
                      </h3>
                      {isOwnerRole && (
                        <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={roleColor}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {ROLE_NAMES[member.role]}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  {isOwner && !isOwnerRole && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateStaffRole.mutate({ 
                            staffId: member.id, 
                            role: 'admin' 
                          })}
                          disabled={member.role === 'admin'}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Назначить админом
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStaffRole.mutate({ 
                            staffId: member.id, 
                            role: 'director' 
                          })}
                          disabled={member.role === 'director'}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          Назначить директором
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStaffRole.mutate({ 
                            staffId: member.id, 
                            role: 'member' 
                          })}
                          disabled={member.role === 'member'}
                        >
                          <User className="w-4 h-4 mr-2" />
                          Назначить участником
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => removeStaffMember.mutate(member.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Permissions */}
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                  {member.permissions.manage_tournaments && (
                    <Badge variant="secondary" className="text-xs">Турниры</Badge>
                  )}
                  {member.permissions.manage_players && (
                    <Badge variant="secondary" className="text-xs">Игроки</Badge>
                  )}
                  {member.permissions.manage_staff && (
                    <Badge variant="secondary" className="text-xs">Персонал</Badge>
                  )}
                  {member.permissions.view_analytics && (
                    <Badge variant="secondary" className="text-xs">Аналитика</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {staff.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет персонала</h3>
            <p className="text-sm text-muted-foreground">
              Добавьте сотрудников для управления клубом
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
