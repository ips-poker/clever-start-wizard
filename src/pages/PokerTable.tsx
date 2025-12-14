// Dedicated Poker Table Page - Opens in popup window for multi-tabling
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { supabase } from '@/integrations/supabase/client';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import syndikateBg from '@/assets/syndikate-poker-bg.jpg';

export default function PokerTable() {
  const { tableId } = useParams<{ tableId: string }>();
  const [searchParams] = useSearchParams();
  
  const playerId = searchParams.get('playerId') || localStorage.getItem('poker_player_id');
  const buyIn = parseInt(searchParams.get('buyIn') || '0', 10);
  const isTournament = searchParams.get('tournament') === 'true';
  
  const [playerBalance, setPlayerBalance] = useState(0);
  const [tableName, setTableName] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch table info and player balance
  useEffect(() => {
    const fetchData = async () => {
      if (!tableId || !playerId) {
        setLoading(false);
        return;
      }

      // Fetch table name
      const { data: tableData } = await supabase
        .from('poker_tables')
        .select('name')
        .eq('id', tableId)
        .single();
      
      if (tableData) {
        setTableName(tableData.name);
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
  }, [tableId, playerId]);

  const handleLeaveTable = () => {
    window.close();
  };

  const handleMinimize = () => {
    // Can't truly minimize browser window, but can resize
    window.resizeTo(300, 200);
  };

  if (!tableId) {
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
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Syndikate luxury background */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${syndikateBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Dark vignette overlay */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.6) 100%)'
      }} />
      
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
          tableId={tableId}
          playerId={playerId}
          buyIn={buyIn}
          playerBalance={playerBalance}
          isTournament={isTournament}
          tournamentId={isTournament ? tableId : undefined}
          onLeave={handleLeaveTable}
          onBalanceUpdate={() => {
            // Refresh balance
          }}
        />
      </div>
    </div>
  );
}
