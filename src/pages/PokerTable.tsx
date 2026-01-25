// Dedicated Poker Table Page - Opens in popup window for multi-tabling
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { TournamentMoveNotification } from '@/components/poker/TournamentMoveNotification';
import { TournamentEliminationModal } from '@/components/poker/TournamentEliminationModal';
import { useTournamentReconnect } from '@/hooks/useTournamentReconnect';
import { supabase } from '@/integrations/supabase/client';
import { X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Make body transparent for immersive theme backgrounds
const useTransparentBody = () => {
  useEffect(() => {
    // Add immersive class to html element
    document.documentElement.classList.add('poker-immersive');
    
    return () => {
      document.documentElement.classList.remove('poker-immersive');
    };
  }, []);
};

export default function PokerTable() {
  // Make body transparent for immersive full-screen theme backgrounds
  useTransparentBody();
  
  const { tableId } = useParams<{ tableId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // If playerId is explicitly provided in URL, we respect it (useful for testbots).
  // Otherwise, we resolve the "real" player for the signed-in user and avoid accidentally using a TestBot id.
  const urlPlayerId = searchParams.get('playerId');
  const [playerId, setPlayerId] = useState<string | null>(
    urlPlayerId || localStorage.getItem('poker_player_id')
  );

  const buyIn = parseInt(searchParams.get('buyIn') || '0', 10);
  const isTournament = searchParams.get('tournament') === 'true';
  const urlSpectator = searchParams.get('spectator') === 'true';
  const [playerBalance, setPlayerBalance] = useState(0);
  const [tableName, setTableName] = useState('');
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTableId, setCurrentTableId] = useState<string | null>(tableId || null);
  const [isSpectator, setIsSpectator] = useState(urlSpectator);

  // If user is authenticated and we didn't explicitly request a playerId in the URL,
  // prefer the "real" player (non-TestBot) for this user.
  useEffect(() => {
    if (urlPlayerId) return;

    let cancelled = false;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data } = await supabase
        .from('players')
        .select('id, name')
        .eq('user_id', user.id)
        .not('name', 'ilike', 'TestBot%')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (data?.id && data.id !== playerId) {
        setPlayerId(data.id);
        localStorage.setItem('poker_player_id', data.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlPlayerId, playerId]);

  // Tournament reconnect logic
  const {
    isReconnecting,
    wasDisconnected,
    recoveredSession,
    attemptReconnect,
    startHeartbeat,
    clearSession,
  } = useTournamentReconnect(playerId);

  // Fetch table info and player balance
  useEffect(() => {
    const fetchData = async () => {
      const activeTableId = currentTableId || tableId;
      if (!activeTableId || !playerId) {
        setLoading(false);
        return;
      }

      // Fetch table name and tournament_id
      const { data: tableData } = await supabase
        .from('poker_tables')
        .select('name, tournament_id')
        .eq('id', activeTableId)
        .single();
      
      if (tableData) {
        setTableName(tableData.name);
        setTournamentId(tableData.tournament_id);
        document.title = `${tableData.name} - Syndikate Poker`;
        
        // Check if player is eliminated from this tournament (spectator mode)
        if (tableData.tournament_id) {
          const { data: participantData } = await supabase
            .from('online_poker_tournament_participants')
            .select('status')
            .eq('tournament_id', tableData.tournament_id)
            .eq('player_id', playerId)
            .single();
          
          if (participantData?.status === 'eliminated') {
            setIsSpectator(true);
          }
        }
      }

      // Fetch player balance
      const { data: walletData } = await supabase
        .from('diamond_wallets')
        .select('balance')
        .eq('player_id', playerId)
        .single();
      
      if (walletData) {
        setPlayerBalance(walletData.balance);
      }

      setLoading(false);
    };

    fetchData();
  }, [currentTableId, tableId, playerId]);
  
  // Subscribe to elimination status changes
  useEffect(() => {
    if (!tournamentId || !playerId) return;
    
    const channel = supabase
      .channel(`spectator-check-${playerId}-${tournamentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `player_id=eq.${playerId}`
      }, (payload) => {
        const newData = payload.new as { status?: string };
        if (newData.status === 'eliminated') {
          setIsSpectator(true);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, playerId]);

  // Handle table move notification
  const handleJoinNewTable = useCallback((newTableId: string) => {
    setCurrentTableId(newTableId);
    // Update URL without full reload
    const params = new URLSearchParams(searchParams);
    navigate(`/poker-table/${newTableId}?${params.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  const handleLeaveTable = () => {
    clearSession();
    window.close();
  };

  const activeTableId = currentTableId || tableId;

  // Start reconnect heartbeat when table loads
  useEffect(() => {
    if (activeTableId && playerId && tournamentId) {
      startHeartbeat({
        tournamentId,
        tableId: activeTableId,
        playerId,
        seatNumber: 0,
        stack: 0,
      });
    }
  }, [activeTableId, playerId, tournamentId, startHeartbeat]);

  if (!activeTableId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Стол не найден</p>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white flex-col gap-4">
        <p>Необходимо войти в аккаунт</p>
        <Button onClick={() => window.close()}>Закрыть</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-transparent">
      
      {/* Tournament HUD is rendered inside OnlinePokerTable -> FullscreenPokerTableWrapper */}

      {/* Tournament Move Notification */}
      {tournamentId && playerId && (
        <TournamentMoveNotification
          playerId={playerId}
          tournamentId={tournamentId}
          onJoinNewTable={handleJoinNewTable}
        />
      )}

      {/* Tournament Elimination Modal */}
      {tournamentId && playerId && (
        <TournamentEliminationModal
          playerId={playerId}
          tournamentId={tournamentId}
        />
      )}

      {/* Spectator indicator */}
      {isSpectator && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-full backdrop-blur-sm">
            <Eye className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Режим наблюдателя</span>
          </div>
        </div>
      )}

      {/* Window controls - for popup window */}
      {!((window as any).Telegram?.WebApp || window.location.pathname.startsWith('/telegram') || window.location.pathname.startsWith('/telegram-mini-app')) && (
        <div 
          className="absolute top-0 left-0 right-0 h-7 z-50 flex items-center justify-between px-2"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--background) / 0.85) 0%, hsl(var(--background) / 0.55) 50%, transparent 100%)',
          }}
        >
          <span className="text-foreground/70 text-xs font-medium truncate max-w-[200px]">
            {tableName}
          </span>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-foreground/70 hover:text-foreground hover:bg-background/20 rounded"
              onClick={handleLeaveTable}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Poker table */}
      <div className="relative w-full h-full">
        <OnlinePokerTable
          tableId={activeTableId}
          playerId={playerId}
          buyIn={buyIn}
          playerBalance={playerBalance}
          isSpectator={isSpectator}
          isTournament={isTournament || !!tournamentId}
          tournamentId={tournamentId || undefined}
          onLeave={handleLeaveTable}
          onBalanceUpdate={() => {
            // Refresh balance
          }}
        />
      </div>
    </div>
  );
}
