import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Settings,
  Coins, Timer, Users, Crown, Zap, Hand, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { fixStorageUrl } from '@/utils/storageUtils';
import { 
  createDeck, 
  shuffleDeckSecure, 
  dealToPlayers, 
  dealCards,
  evaluateHand, 
  determineWinners,
  Card as PokerCard,
  HandEvaluation,
  SUIT_NAMES,
  RANK_NAMES,
  getSuitColor
} from '@/utils/pokerEngine';

interface TelegramMobileTableProps {
  tableId: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerBalance: number;
  onLeave: () => void;
}

interface PlayerAtTable {
  id: string;
  seat_number: number;
  stack: number;
  player: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  is_folded?: boolean;
  is_all_in?: boolean;
  current_bet?: number;
}

export function TelegramMobileTable({
  tableId,
  playerId,
  playerName,
  playerAvatar,
  playerBalance,
  onLeave
}: TelegramMobileTableProps) {
  const [table, setTable] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerAtTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [myCards, setMyCards] = useState<PokerCard[]>([]);
  const [communityCards, setCommunityCards] = useState<PokerCard[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('waiting');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [myHandEvaluation, setMyHandEvaluation] = useState<HandEvaluation | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [betAmount, setBetAmount] = useState(0);

  useEffect(() => {
    fetchTableData();
    
    const channel = supabase
      .channel(`telegram-table-${tableId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_table_players', filter: `table_id=eq.${tableId}` }, fetchTableData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_tables', filter: `id=eq.${tableId}` }, fetchTableData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId]);

  const fetchTableData = useCallback(async () => {
    try {
      const [tableRes, playersRes] = await Promise.all([
        supabase.from('poker_tables').select('*').eq('id', tableId).single(),
        supabase.from('poker_table_players')
          .select(`
            *,
            player:players(id, name, avatar_url)
          `)
          .eq('table_id', tableId)
          .eq('status', 'active')
      ]);

      if (tableRes.data) setTable(tableRes.data);
      if (playersRes.data) {
        setPlayers(playersRes.data.map(p => ({
          ...p,
          player: p.player as { id: string; name: string; avatar_url?: string }
        })));
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  // Demo game logic
  const startDemoHand = () => {
    const deck = shuffleDeckSecure(createDeck());
    const { playerHands, remainingDeck } = dealToPlayers(deck, players.length || 2, 2);
    
    if (playerHands.length > 0) {
      setMyCards(playerHands[0]);
    }
    setCommunityCards([]);
    setPot(table?.big_blind || 20 + (table?.small_blind || 10));
    setGamePhase('preflop');
    setShowActions(true);
    setBetAmount(table?.big_blind || 20);
  };

  const handleAction = (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in') => {
    switch (action) {
      case 'fold':
        toast.info('Вы сбросили карты');
        setGamePhase('waiting');
        setShowActions(false);
        break;
      case 'check':
        toast.info('Чек');
        advancePhase();
        break;
      case 'call':
        toast.info(`Колл ${currentBet}`);
        setPot(p => p + currentBet);
        advancePhase();
        break;
      case 'raise':
        toast.info(`Рейз до ${betAmount}`);
        setPot(p => p + betAmount);
        setCurrentBet(betAmount);
        advancePhase();
        break;
      case 'all-in':
        toast.info('Ол-ин!');
        advancePhase();
        break;
    }
  };

  const advancePhase = () => {
    const deck = shuffleDeckSecure(createDeck());
    
    if (gamePhase === 'preflop') {
      const { dealtCards } = dealCards(deck, 3);
      setCommunityCards(dealtCards);
      setGamePhase('flop');
    } else if (gamePhase === 'flop') {
      const { dealtCards } = dealCards(deck, 1);
      setCommunityCards(prev => [...prev.slice(0, 3), dealtCards[0]]);
      setGamePhase('turn');
    } else if (gamePhase === 'turn') {
      const { dealtCards } = dealCards(deck, 1);
      setCommunityCards(prev => [...prev.slice(0, 4), dealtCards[0]]);
      setGamePhase('river');
    } else if (gamePhase === 'river') {
      // Evaluate hand
      if (myCards.length > 0 && communityCards.length >= 5) {
        const evaluation = evaluateHand([...myCards, ...communityCards]);
        setMyHandEvaluation(evaluation);
      }
      setGamePhase('showdown');
      setShowActions(false);
    }
  };

  const handleLeaveTable = async () => {
    try {
      await supabase
        .from('poker_table_players')
        .delete()
        .eq('table_id', tableId)
        .eq('player_id', playerId);
      
      toast.success('Вы покинули стол');
      onLeave();
    } catch (error) {
      console.error('Error leaving table:', error);
      toast.error('Ошибка при выходе со стола');
    }
  };

  const renderCard = (card: PokerCard, faceDown = false) => {
    if (faceDown) {
      return (
        <motion.div
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 0 }}
          className="w-12 h-16 rounded-lg bg-gradient-to-br from-syndikate-orange to-syndikate-red border border-syndikate-orange/50 flex items-center justify-center shadow-lg"
        >
          <div className="text-white/30 text-2xl">♠</div>
        </motion.div>
      );
    }

    const color = getSuitColor(card.suit);
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`
          w-12 h-16 rounded-lg bg-white border-2 border-border
          flex flex-col items-center justify-center shadow-lg
          ${color === 'red' ? 'text-red-500' : 'text-gray-800'}
        `}
      >
        <span className="text-sm font-bold">{RANK_NAMES[card.rank]}</span>
        <span className="text-lg">{SUIT_NAMES[card.suit]}</span>
      </motion.div>
    );
  };

  const renderPlayerSeat = (seatNumber: number, position: string) => {
    const player = players.find(p => p.seat_number === seatNumber);
    const isMe = player?.player?.id === playerId;
    
    return (
      <div className={`absolute ${position} flex flex-col items-center`}>
        <div className={`
          w-14 h-14 rounded-full border-2 overflow-hidden
          ${isMe ? 'border-syndikate-orange ring-2 ring-syndikate-orange/50' : 'border-border'}
          ${player ? 'bg-syndikate-metal' : 'bg-muted/30 border-dashed'}
        `}>
          {player ? (
            <Avatar className="w-full h-full">
              <AvatarImage src={fixStorageUrl(player.player?.avatar_url, player.player?.id)} />
              <AvatarFallback className="bg-syndikate-metal text-xs">
                {player.player?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Users className="w-5 h-5" />
            </div>
          )}
        </div>
        {player && (
          <div className="mt-1 text-center">
            <p className="text-[10px] font-medium truncate max-w-[60px]">
              {isMe ? 'Вы' : player.player?.name}
            </p>
            <div className="flex items-center justify-center gap-0.5 text-[9px] text-syndikate-orange">
              <Coins className="w-2.5 h-2.5" />
              {player.stack?.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-syndikate-orange border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 15%, #0d1a0d 50%, #0a0a0a 85%, #0a0505 100%)',
      }}
    >
      {/* Mafia syndicate atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Dark vignette edges */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.7) 100%)'
        }} />
        
        {/* Subtle smoke effect */}
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='smoke'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23smoke)' fill='%23223322'/%3E%3C/svg%3E")`
        }} />
        
        {/* Golden accent glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 opacity-10" style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)',
          filter: 'blur(50px)'
        }} />
        
        {/* Red mafia accent */}
        <div className="absolute bottom-0 left-0 w-40 h-40 opacity-10" style={{
          background: 'radial-gradient(circle, rgba(220,38,38,0.6) 0%, transparent 70%)',
          filter: 'blur(40px)'
        }} />
        
        {/* Art deco corners */}
        <svg className="absolute top-2 left-2 w-10 h-10 opacity-15" viewBox="0 0 100 100">
          <path d="M0 0 L100 0 L100 15 L15 15 L15 100 L0 100 Z" fill="rgba(251,191,36,0.6)" />
        </svg>
        <svg className="absolute top-2 right-2 w-10 h-10 opacity-15 rotate-90" viewBox="0 0 100 100">
          <path d="M0 0 L100 0 L100 15 L15 15 L15 100 L0 100 Z" fill="rgba(251,191,36,0.6)" />
        </svg>
        <svg className="absolute bottom-2 left-2 w-10 h-10 opacity-15 -rotate-90" viewBox="0 0 100 100">
          <path d="M0 0 L100 0 L100 15 L15 15 L15 100 L0 100 Z" fill="rgba(251,191,36,0.6)" />
        </svg>
        <svg className="absolute bottom-2 right-2 w-10 h-10 opacity-15 rotate-180" viewBox="0 0 100 100">
          <path d="M0 0 L100 0 L100 15 L15 15 L15 100 L0 100 Z" fill="rgba(251,191,36,0.6)" />
        </svg>
        
        {/* Diamond pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='%23fbbf24' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px'
        }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-3 bg-black/40 backdrop-blur-sm border-b border-amber-900/20">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLeaveTable}
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center flex-1">
          <h1 className="text-sm font-semibold text-white/90 truncate">{table?.name || 'Покерный стол'}</h1>
          <div className="flex items-center justify-center gap-2 text-[10px] text-amber-500/80">
            <span>{table?.small_blind}/{table?.big_blind}</span>
            <span>•</span>
            <span>{players.length}/{table?.max_players} игроков</span>
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 relative p-4 z-10">
        {/* Poker Table - Vertical orientation */}
        <div className="relative w-full max-w-xs mx-auto" style={{ aspectRatio: '3/4' }}>
          {/* Table outer frame */}
          <div 
            className="absolute inset-0"
            style={{
              borderRadius: '45% 45% 45% 45% / 20% 20% 20% 20%',
              background: 'linear-gradient(180deg, #5a6a7a 0%, #3d4a5a 20%, #2a3440 50%, #3d4a5a 80%, #5a6a7a 100%)',
              boxShadow: '0 10px 60px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.5), inset 0 2px 30px rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          />
          
          {/* Leather rail */}
          <div 
            className="absolute"
            style={{
              top: '2%',
              left: '3%',
              right: '3%',
              bottom: '2%',
              borderRadius: '44% 44% 44% 44% / 19% 19% 19% 19%',
              background: 'linear-gradient(180deg, #3a2820 0%, #2a1a14 30%, #1a0f0a 60%, #2a1a14 85%, #3a2820 100%)',
              boxShadow: 'inset 0 5px 30px rgba(0,0,0,0.8)'
            }}
          />
          
          {/* Felt surface */}
          <div 
            className="absolute"
            style={{
              top: '4%',
              left: '6%',
              right: '6%',
              bottom: '4%',
              borderRadius: '40% 40% 40% 40% / 17% 17% 17% 17%',
              background: 'radial-gradient(ellipse at 50% 30%, #2d5a3d 0%, #1a4a2e 30%, #0d3320 60%, #0a2818 100%)',
              boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4)'
            }}
          >
            {/* Pot in center */}
            {pot > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 rounded-lg px-4 py-2 backdrop-blur-sm border border-amber-500/30"
              >
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Coins className="h-4 w-4" />
                  <span className="font-bold text-lg">{pot.toLocaleString()}</span>
                </div>
              </motion.div>
            )}

            {/* Community Cards */}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 flex gap-1">
              <AnimatePresence>
                {communityCards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {renderCard(card)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Player Seats for vertical table */}
          {renderPlayerSeat(1, 'bottom-0 left-1/2 -translate-x-1/2 translate-y-10')}
          {renderPlayerSeat(2, 'bottom-[30%] left-0 -translate-x-6')}
          {renderPlayerSeat(3, 'top-[30%] left-0 -translate-x-6')}
          {renderPlayerSeat(4, 'top-0 left-1/2 -translate-x-1/2 -translate-y-10')}
          {renderPlayerSeat(5, 'top-[30%] right-0 translate-x-6')}
          {renderPlayerSeat(6, 'bottom-[30%] right-0 translate-x-6')}
        </div>

        {/* My Cards */}
        {myCards.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {myCards.map((card) => renderCard(card))}
          </div>
        )}

        {/* Hand Evaluation */}
        {myHandEvaluation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2"
          >
            <Badge className="bg-amber-600 text-white px-3 py-1 border border-amber-400/50">
              {myHandEvaluation.name}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="relative z-10 p-4 bg-black/60 backdrop-blur-lg border-t border-amber-900/30">
        {gamePhase === 'waiting' ? (
          <div className="flex gap-2">
            <Button
              onClick={startDemoHand}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border border-amber-500/30"
            >
              <Zap className="h-4 w-4 mr-2" />
              Начать раздачу
            </Button>
            <Button
              onClick={handleLeaveTable}
              variant="outline"
              className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-2" />
              Покинуть стол
            </Button>
          </div>
        ) : showActions ? (
          <div className="space-y-3">
            {/* Bet Slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12">Ставка:</span>
              <input
                type="range"
                min={table?.big_blind || 20}
                max={playerBalance}
                step={table?.big_blind || 20}
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value))}
                className="flex-1 accent-syndikate-orange"
              />
              <span className="text-sm font-bold text-syndikate-orange w-16 text-right">
                {betAmount.toLocaleString()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={() => handleAction('fold')}
                variant="outline"
                size="sm"
                className="text-red-400 border-red-400/50"
              >
                Фолд
              </Button>
              <Button
                onClick={() => handleAction('check')}
                variant="outline"
                size="sm"
              >
                Чек
              </Button>
              <Button
                onClick={() => handleAction('call')}
                variant="outline"
                size="sm"
                className="text-green-400 border-green-400/50"
              >
                Колл
              </Button>
              <Button
                onClick={() => handleAction('raise')}
                size="sm"
                className="bg-syndikate-orange hover:bg-syndikate-orange-glow"
              >
                Рейз
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Button
              onClick={() => {
                setGamePhase('waiting');
                setMyCards([]);
                setCommunityCards([]);
                setPot(0);
                setMyHandEvaluation(null);
              }}
              className="bg-syndikate-orange hover:bg-syndikate-orange-glow"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Новая раздача
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
