import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Trophy,
  Skull,
  Crown,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  player_id: string;
  player_name: string;
  player_avatar?: string | null;
  status: 'registered' | 'playing' | 'eliminated';
  chips: number;
  rebuys_count: number;
  addons_count: number;
  table_number?: number;
  seat_number?: number;
  finish_position?: number | null;
  prize_amount?: number;
  eliminated_at?: string | null;
}

interface PlayersListTabProps {
  players: Player[];
  currentPlayerId?: string;
  bigBlind: number;
  averageStack: number;
  className?: string;
}

type SortField = 'chips' | 'name' | 'table' | 'position';
type SortOrder = 'asc' | 'desc';

export function PlayersListTab({ 
  players, 
  currentPlayerId, 
  bigBlind, 
  averageStack,
  className 
}: PlayersListTabProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('chips');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showEliminated, setShowEliminated] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredPlayers = useMemo(() => {
    let result = [...players];
    
    // Filter by status
    if (!showEliminated) {
      result = result.filter(p => p.status !== 'eliminated');
    }
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p => 
        p.player_name.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'chips':
          comparison = (a.chips || 0) - (b.chips || 0);
          break;
        case 'name':
          comparison = a.player_name.localeCompare(b.player_name);
          break;
        case 'table':
          comparison = (a.table_number || 0) - (b.table_number || 0);
          break;
        case 'position':
          comparison = (a.finish_position || 999) - (b.finish_position || 999);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [players, search, sortField, sortOrder, showEliminated]);

  const activePlayers = players.filter(p => p.status !== 'eliminated');
  const eliminatedPlayers = players.filter(p => p.status === 'eliminated');
  const chipLeader = activePlayers.reduce((max, p) => p.chips > (max?.chips || 0) ? p : max, activePlayers[0]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const getStackIndicator = (chips: number) => {
    if (chips === 0) return null;
    const ratio = chips / averageStack;
    if (ratio >= 1.5) return 'text-emerald-500';
    if (ratio >= 1.0) return 'text-primary';
    if (ratio >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Stats Bar */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">В игре:</span>
          <span className="font-bold">{activePlayers.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Skull className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Выбыло:</span>
          <span className="font-medium">{eliminatedPlayers.length}</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск игрока..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showEliminated ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowEliminated(!showEliminated)}
        >
          <Skull className="h-4 w-4 mr-1" />
          Выбывшие
        </Button>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-lg mb-2 text-xs font-medium text-muted-foreground">
        <div className="col-span-1">#</div>
        <button 
          className="col-span-4 flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => handleSort('name')}
        >
          Игрок <SortIcon field="name" />
        </button>
        <button 
          className="col-span-3 flex items-center gap-1 hover:text-foreground transition-colors text-right"
          onClick={() => handleSort('chips')}
        >
          Фишки <SortIcon field="chips" />
        </button>
        <div className="col-span-2 text-center">BB</div>
        <button 
          className="col-span-2 flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => handleSort('table')}
        >
          Стол <SortIcon field="table" />
        </button>
      </div>

      {/* Players List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {filteredPlayers.map((player, index) => {
            const isCurrentPlayer = player.player_id === currentPlayerId;
            const isChipLeader = player.player_id === chipLeader?.player_id && player.status !== 'eliminated';
            const bbCount = bigBlind > 0 ? Math.floor(player.chips / bigBlind) : 0;
            const stackColor = getStackIndicator(player.chips);

            return (
              <div
                key={player.id}
                className={cn(
                  "grid grid-cols-12 gap-2 px-3 py-2 rounded-lg items-center transition-colors",
                  isCurrentPlayer && "bg-primary/10 border border-primary/30",
                  player.status === 'eliminated' && "opacity-60",
                  !isCurrentPlayer && player.status !== 'eliminated' && "hover:bg-muted/50"
                )}
              >
                {/* Rank */}
                <div className="col-span-1 text-sm text-muted-foreground">
                  {player.status === 'eliminated' && player.finish_position ? (
                    <span className="font-medium">#{player.finish_position}</span>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Player Info */}
                <div className="col-span-4 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={player.player_avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {player.player_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm truncate">
                        {player.player_name}
                      </span>
                      {isChipLeader && (
                        <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      )}
                      {isCurrentPlayer && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">Вы</Badge>
                      )}
                    </div>
                    {(player.rebuys_count > 0 || player.addons_count > 0) && (
                      <div className="text-[10px] text-muted-foreground">
                        {player.rebuys_count > 0 && `R×${player.rebuys_count}`}
                        {player.rebuys_count > 0 && player.addons_count > 0 && ' '}
                        {player.addons_count > 0 && `A×${player.addons_count}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chips */}
                <div className={cn("col-span-3 text-right font-mono text-sm", stackColor)}>
                  {player.status === 'eliminated' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    player.chips.toLocaleString()
                  )}
                </div>

                {/* Big Blinds */}
                <div className="col-span-2 text-center text-sm text-muted-foreground">
                  {player.status === 'eliminated' ? '—' : `${bbCount}`}
                </div>

                {/* Table/Seat or Prize */}
                <div className="col-span-2 text-sm">
                  {player.status === 'eliminated' ? (
                    player.prize_amount && player.prize_amount > 0 ? (
                      <Badge className="bg-amber-500 text-black text-[10px]">
                        +{player.prize_amount.toLocaleString()}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  ) : player.table_number ? (
                    <span className="text-muted-foreground">
                      T{player.table_number}-S{player.seat_number}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredPlayers.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Игроки не найдены</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
