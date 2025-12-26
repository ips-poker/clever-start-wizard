// Dedicated Poker Table Page - Opens in popup window for multi-tabling
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { TournamentHUD } from '@/components/poker/TournamentHUD';
import { TournamentMoveNotification } from '@/components/poker/TournamentMoveNotification';
import { TournamentEliminationModal } from '@/components/poker/TournamentEliminationModal';
import { useTournamentReconnect } from '@/hooks/useTournamentReconnect';
import { supabase } from '@/integrations/supabase/client';
import { X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PokerTable() {
  const { tableId } = useParams<{ tableId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const playerId = searchParams.get('playerId') || localStorage.getItem('poker_player_id');
  const buyIn = parseInt(searchParams.get('buyIn') || '0', 10);
  const isTournament = searchParams.get('tournament') === 'true';
  
  const [playerBalance, setPlayerBalance] = useState(0);
  const [tableName, setTableName] = useState('');
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTableId, setCurrentTableId] = useState<string | null>(tableId || null);

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
    <div className="w-screen h-screen overflow-hidden relative bg-black">
      
      {/* Tournament HUD */}
      {tournamentId && (
        <TournamentHUD 
          tournamentId={tournamentId} 
          currentPlayerId={playerId}
          compact={true} 
        />
      )}

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

      {/* Window controls - for popup window */}
      <div 
        className="absolute top-0 left-0 right-0 h-7 z-50 flex items-center justify-between px-2"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
        }}
      >
        <span className="text-white/60 text-xs font-medium truncate max-w-[200px]">
          {tableName}
        </span>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-white/60 hover:text-white hover:bg-white/10 rounded"
            onClick={handleLeaveTable}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Poker table */}
      <div className="relative w-full h-full">
        <OnlinePokerTable
          tableId={activeTableId}
          playerId={playerId}
          buyIn={buyIn}
          playerBalance={playerBalance}
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
