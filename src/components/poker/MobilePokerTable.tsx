import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PokerPlayer } from '@/hooks/usePokerTable';
import { CommunityCards, CardHand } from './PokerCard';
import { PotDisplay } from './PokerChips';

interface MobilePokerTableProps {
  tableState: {
    phase: string;
    pot: number;
    currentBet: number;
    communityCards: string[];
    players: PokerPlayer[];
    dealerSeat: number | null;
    smallBlindSeat: number | null;
    bigBlindSeat: number | null;
    currentPlayerSeat: number | null;
  } | null;
  myCards: string[];
  playerId: string;
}

export function MobilePokerTable({ tableState, myCards, playerId }: MobilePokerTableProps) {
  if (!tableState) return null;

  // Compact player display for mobile
  const renderMobilePlayer = (player: PokerPlayer, index: number) => {
    const isDealer = tableState.dealerSeat === player.seatNumber;
    const isSB = tableState.smallBlindSeat === player.seatNumber;
    const isBB = tableState.bigBlindSeat === player.seatNumber;
    const isCurrentPlayer = tableState.currentPlayerSeat === player.seatNumber;
    const isMe = player.playerId === playerId;

    return (
      <motion.div
        key={player.playerId}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative p-2 rounded-lg",
          isCurrentPlayer && "ring-2 ring-primary",
          player.isFolded && "opacity-40",
          isMe && "bg-primary/10 border border-primary/30"
        )}
      >
        {/* Compact badges */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
          {isDealer && (
            <Badge className="text-[8px] h-4 px-1 bg-amber-500">D</Badge>
          )}
          {isSB && (
            <Badge variant="secondary" className="text-[8px] h-4 px-1">SB</Badge>
          )}
          {isBB && (
            <Badge variant="secondary" className="text-[8px] h-4 px-1">BB</Badge>
          )}
        </div>

        {/* Avatar */}
        <div className={cn(
          "w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center",
          isCurrentPlayer && "animate-pulse"
        )}>
          <span className="text-sm">{isMe ? '😎' : '👤'}</span>
        </div>

        {/* Stack */}
        <div className="text-center mt-1">
          <p className="text-[10px] font-medium truncate max-w-12">
            {isMe ? 'Вы' : `#${player.seatNumber}`}
          </p>
          <div className="flex items-center justify-center gap-0.5">
            <Coins className="h-2.5 w-2.5 text-amber-500" />
            <span className="text-[10px] font-bold">{player.stack >= 1000 ? `${Math.floor(player.stack/1000)}k` : player.stack}</span>
          </div>
        </div>

        {/* Bet amount */}
        {player.betAmount > 0 && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
            <Badge variant="outline" className="text-[8px] px-1 h-4">
              {player.betAmount}
            </Badge>
          </div>
        )}

        {/* Status */}
        {player.isFolded && (
          <div className="absolute -top-1 -right-1">
            <Badge variant="destructive" className="text-[7px] px-0.5 h-3">F</Badge>
          </div>
        )}
        {player.isAllIn && !player.isFolded && (
          <div className="absolute -top-1 -right-1">
            <Badge className="text-[7px] px-0.5 h-3 bg-amber-500">A</Badge>
          </div>
        )}
      </motion.div>
    );
  };

  const players = tableState.players || [];
  const topPlayers = players.filter((_, i) => i < Math.ceil(players.length / 2));
  const bottomPlayers = players.filter((_, i) => i >= Math.ceil(players.length / 2));

  return (
    <div className="relative rounded-xl bg-gradient-to-br from-green-900/60 via-green-800/50 to-green-900/60 border border-green-700/50 p-3 min-h-[300px]">
      {/* Top row of players */}
      <div className="flex justify-center gap-2 mb-4">
        {topPlayers.map((player, index) => renderMobilePlayer(player, index))}
      </div>

      {/* Center - Pot and Community Cards */}
      <div className="flex flex-col items-center justify-center gap-3 my-4">
        <AnimatePresence>
          {tableState.pot > 0 && (
            <PotDisplay pot={tableState.pot} />
          )}
        </AnimatePresence>

        {tableState.communityCards.length > 0 ? (
          <CommunityCards cards={tableState.communityCards} size="sm" />
        ) : (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i}
                className="w-10 h-14 rounded border border-dashed border-green-600/30 bg-green-800/20"
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom row of players */}
      <div className="flex justify-center gap-2 mb-4">
        {bottomPlayers.map((player, index) => renderMobilePlayer(player, index))}
      </div>

      {/* My Cards - Fixed at bottom */}
      <AnimatePresence>
        {myCards.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 p-2 rounded-lg bg-background/90 backdrop-blur border border-primary/30 shadow-lg"
          >
            <p className="text-[9px] text-muted-foreground text-center mb-1">Ваши карты</p>
            <CardHand cards={myCards} size="sm" overlap={false} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
