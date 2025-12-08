import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Ban, UserX, Search, Shield, Clock, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BannedPlayer {
  id: string;
  player_id: string;
  player_name: string;
  reason: string;
  banned_at: string;
  expires_at: string | null;
  banned_by: string;
  is_permanent: boolean;
}

interface Player {
  id: string;
  name: string;
  email: string | null;
}

// Store bans in localStorage as we don't have a dedicated table
const BANS_STORAGE_KEY = 'poker_player_bans';

export function PlayerBanList() {
  const [bans, setBans] = useState<BannedPlayer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');

  useEffect(() => {
    loadBans();
    loadPlayers();
  }, []);

  const loadBans = () => {
    try {
      const stored = localStorage.getItem(BANS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out expired bans
        const activeBans = parsed.filter((ban: BannedPlayer) => {
          if (ban.is_permanent) return true;
          if (!ban.expires_at) return true;
          return new Date(ban.expires_at) > new Date();
        });
        setBans(activeBans);
        // Update storage with only active bans
        localStorage.setItem(BANS_STORAGE_KEY, JSON.stringify(activeBans));
      }
    } catch (error) {
      console.error('Error loading bans:', error);
    }
  };

  const loadPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('id, name, email')
      .order('name');
    
    if (data) {
      setPlayers(data);
    }
  };

  const handleBanPlayer = async () => {
    if (!selectedPlayerId) {
      toast.error('Выберите игрока');
      return;
    }

    if (!banReason.trim()) {
      toast.error('Укажите причину бана');
      return;
    }

    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) return;

    // Check if already banned
    if (bans.some(b => b.player_id === selectedPlayerId)) {
      toast.error('Игрок уже заблокирован');
      return;
    }

    // Remove player from all tables
    await supabase
      .from('poker_table_players')
      .delete()
      .eq('player_id', selectedPlayerId);

    const newBan: BannedPlayer = {
      id: crypto.randomUUID(),
      player_id: selectedPlayerId,
      player_name: player.name,
      reason: banReason,
      banned_at: new Date().toISOString(),
      expires_at: banDuration === 'permanent' ? null : calculateExpiry(banDuration),
      banned_by: 'Admin',
      is_permanent: banDuration === 'permanent',
    };

    const updatedBans = [...bans, newBan];
    setBans(updatedBans);
    localStorage.setItem(BANS_STORAGE_KEY, JSON.stringify(updatedBans));

    toast.success(`Игрок ${player.name} заблокирован`);
    setShowBanDialog(false);
    setSelectedPlayerId('');
    setBanReason('');
    setBanDuration('permanent');
  };

  const handleUnbanPlayer = (banId: string) => {
    const updatedBans = bans.filter(b => b.id !== banId);
    setBans(updatedBans);
    localStorage.setItem(BANS_STORAGE_KEY, JSON.stringify(updatedBans));
    toast.success('Игрок разблокирован');
  };

  const calculateExpiry = (duration: string): string => {
    const now = new Date();
    switch (duration) {
      case '1h': now.setHours(now.getHours() + 1); break;
      case '24h': now.setHours(now.getHours() + 24); break;
      case '7d': now.setDate(now.getDate() + 7); break;
      case '30d': now.setDate(now.getDate() + 30); break;
    }
    return now.toISOString();
  };

  const formatExpiry = (expiresAt: string | null, isPermanent: boolean): string => {
    if (isPermanent || !expiresAt) return 'Навсегда';
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    
    if (diff < 0) return 'Истек';
    if (diff < 3600000) return `${Math.round(diff / 60000)} мин`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)} ч`;
    return `${Math.round(diff / 86400000)} дн`;
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !bans.some(b => b.player_id === p.id)
  );

  const isPlayerBanned = (playerId: string): boolean => {
    return bans.some(b => b.player_id === playerId);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-500" />
                Бан-лист игроков
              </CardTitle>
              <CardDescription>
                Заблокированные игроки не могут присоединяться к столам
              </CardDescription>
            </div>
            <Button onClick={() => setShowBanDialog(true)} variant="destructive">
              <UserX className="h-4 w-4 mr-2" />
              Заблокировать игрока
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Нет заблокированных игроков</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Игрок</TableHead>
                    <TableHead>Причина</TableHead>
                    <TableHead>Дата бана</TableHead>
                    <TableHead>Истекает</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bans.map((ban) => (
                    <TableRow key={ban.id}>
                      <TableCell className="font-medium">{ban.player_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ban.reason}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ban.banned_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ban.is_permanent ? 'destructive' : 'secondary'}>
                          {formatExpiry(ban.expires_at, ban.is_permanent)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnbanPlayer(ban.id)}
                        >
                          Разблокировать
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Заблокировать игрока
            </DialogTitle>
            <DialogDescription>
              Игрок будет удален со всех столов и не сможет присоединяться к играм
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Поиск игрока</Label>
              <Input
                placeholder="Введите имя..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {searchQuery && (
              <ScrollArea className="h-[150px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredPlayers.slice(0, 10).map((player) => (
                    <button
                      key={player.id}
                      className={`w-full text-left p-2 rounded hover:bg-muted ${selectedPlayerId === player.id ? 'bg-primary/10 border border-primary' : ''}`}
                      onClick={() => setSelectedPlayerId(player.id)}
                    >
                      <div className="font-medium">{player.name}</div>
                      {player.email && (
                        <div className="text-sm text-muted-foreground">{player.email}</div>
                      )}
                    </button>
                  ))}
                  {filteredPlayers.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      Игроки не найдены
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {selectedPlayerId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  Выбран: <span className="font-medium">{players.find(p => p.id === selectedPlayerId)?.name}</span>
                </p>
              </div>
            )}

            <div>
              <Label>Причина блокировки</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Укажите причину..."
                rows={2}
              />
            </div>

            <div>
              <Label>Срок блокировки</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 час</SelectItem>
                  <SelectItem value="24h">24 часа</SelectItem>
                  <SelectItem value="7d">7 дней</SelectItem>
                  <SelectItem value="30d">30 дней</SelectItem>
                  <SelectItem value="permanent">Навсегда</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleBanPlayer}>
              <Ban className="h-4 w-4 mr-2" />
              Заблокировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function isPlayerBanned(playerId: string): boolean {
  try {
    const stored = localStorage.getItem(BANS_STORAGE_KEY);
    if (!stored) return false;
    
    const bans = JSON.parse(stored) as BannedPlayer[];
    const ban = bans.find(b => b.player_id === playerId);
    
    if (!ban) return false;
    if (ban.is_permanent) return true;
    if (!ban.expires_at) return true;
    
    return new Date(ban.expires_at) > new Date();
  } catch {
    return false;
  }
}
