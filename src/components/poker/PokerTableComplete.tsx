import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PremiumPokerTable } from './PremiumPokerTable';
import { PlayerSeat, PlayerData } from './PlayerSeat';
import { ActionPanel, PreActionButtons } from './ActionPanel';
import { PotDisplay, CommunityCardsDisplay, HandStrengthIndicator } from './PotDisplay';
import { AtmosphericEffects, SpotlightEffect, WinnerCelebration, AllInEffect } from './AtmosphericEffects';
import { Settings, Volume2, VolumeX, MessageSquare, Users, Trophy } from 'lucide-react';

interface GameState {
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  sidePots: { amount: number; eligible: string[] }[];
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  activeSeat: number;
  communityCards: { suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; rank: string }[];
}

interface PokerTableCompleteProps {
  tableId: string;
  players: (PlayerData | null)[];
  gameState: GameState;
  currentPlayerId?: string;
  tableTheme?: 'green' | 'blue' | 'red' | 'purple';
  isSpectator?: boolean;
  onAction?: (action: string, amount?: number) => void;
  onLeave?: () => void;
  className?: string;
}

// Calculate seat positions around oval table
const getSeatPositions = (totalSeats: number = 9) => {
  const positions: { x: number; y: number; angle: number }[] = [];
  
  // Oval layout - seats distributed around the edge
  for (let i = 0; i < totalSeats; i++) {
    const angle = (Math.PI * 2 * i) / totalSeats - Math.PI / 2;
    const x = 50 + Math.cos(angle) * 42;
    const y = 50 + Math.sin(angle) * 38;
    positions.push({ x, y, angle });
  }
  
  return positions;
};

export const PokerTableComplete: React.FC<PokerTableCompleteProps> = ({
  tableId,
  players,
  gameState,
  currentPlayerId,
  tableTheme = 'green',
  isSpectator = false,
  onAction,
  onLeave,
  className
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [autoFold, setAutoFold] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [autoCall, setAutoCall] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [showAllIn, setShowAllIn] = useState(false);

  const seatPositions = useMemo(() => getSeatPositions(players.length || 9), [players.length]);

  const currentPlayer = useMemo(() => 
    players.find(p => p?.id === currentPlayerId),
    [players, currentPlayerId]
  );

  const activePlayer = useMemo(() =>
    players.find((_, index) => index === gameState.activeSeat),
    [players, gameState.activeSeat]
  );

  const isMyTurn = currentPlayer?.isActive ?? false;

  const handleAction = useCallback((action: string, amount?: number) => {
    onAction?.(action, amount);
    
    // Trigger effects
    if (action === 'allIn') {
      setShowAllIn(true);
      setTimeout(() => setShowAllIn(false), 2000);
    }
  }, [onAction]);

  // Calculate call amount and can check
  const callAmount = gameState.currentBet - (currentPlayer?.bet || 0);
  const canCheck = callAmount === 0;
  const canCall = callAmount > 0 && callAmount <= (currentPlayer?.stack || 0);

  return (
    <div className={cn(
      'relative w-full h-full min-h-[600px] overflow-hidden',
      'bg-gradient-to-b from-gray-950 via-gray-900 to-black',
      className
    )}>
      {/* Atmospheric background */}
      <AtmosphericEffects type="ambient" intensity="low" />
      
      {/* Spotlight for active player */}
      <SpotlightEffect 
        active={isMyTurn}
        position={{ x: 50, y: 70 }}
        color="rgba(255, 215, 0, 0.2)"
      />

      {/* All-in effect */}
      <AllInEffect active={showAllIn} />

      {/* Winner celebration */}
      <WinnerCelebration
        active={showWinner}
        amount={gameState.pot}
        playerName={players.find(p => p?.isWinner)?.name}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-bebas text-xl">Table #{tableId.slice(0, 8)}</h2>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Users className="w-4 h-4" />
              <span>{players.filter(Boolean).length}/{players.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showChat ? 'bg-casino-gold text-black' : 'bg-gray-800/80 text-gray-400 hover:text-white'
              )}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main table area */}
      <div className="absolute inset-0 flex items-center justify-center pt-16 pb-32">
        <div className="relative w-full max-w-5xl aspect-[16/10]">
          {/* Premium table background */}
          <PremiumPokerTable
            feltColor={tableTheme}
            showLogo={true}
            className="absolute inset-0"
          />

          {/* Community cards and pot - center of table */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
            <CommunityCardsDisplay
              cards={gameState.communityCards}
              phase={gameState.phase}
            />
            <PotDisplay
              mainPot={gameState.pot}
              sidePots={gameState.sidePots}
              showChips={true}
              size="lg"
            />
          </div>

          {/* Player seats */}
          {seatPositions.map((pos, index) => (
            <div
              key={index}
              className="absolute z-20"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <PlayerSeat
                player={players[index] || undefined}
                position={index}
                isEmpty={!players[index]}
                isCurrentPlayer={players[index]?.id === currentPlayerId}
                showCards={
                  players[index]?.id === currentPlayerId ||
                  gameState.phase === 'showdown'
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action area */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        {/* Pre-action buttons */}
        {!isSpectator && !isMyTurn && currentPlayer && (
          <div className="flex justify-center mb-2">
            <PreActionButtons
              autoFold={autoFold}
              autoCheck={autoCheck}
              autoCall={autoCall}
              onAutoFold={setAutoFold}
              onAutoCheck={setAutoCheck}
              onAutoCall={setAutoCall}
            />
          </div>
        )}

        {/* Hand strength indicator for current player */}
        {currentPlayer && currentPlayer.cards && currentPlayer.cards.length > 0 && (
          <div className="flex justify-center mb-2">
            <HandStrengthIndicator
              handName="Pair of Aces"
              strength={75}
            />
          </div>
        )}

        {/* Action panel */}
        {!isSpectator && currentPlayer && (
          <ActionPanel
            currentBet={gameState.currentBet}
            playerStack={currentPlayer.stack}
            minRaise={gameState.minRaise}
            maxRaise={currentPlayer.stack}
            pot={gameState.pot}
            canCheck={canCheck}
            canCall={canCall}
            callAmount={callAmount}
            isActive={isMyTurn}
            timeRemaining={currentPlayer.timeRemaining}
            onFold={() => handleAction('fold')}
            onCheck={() => handleAction('check')}
            onCall={() => handleAction('call')}
            onBet={(amount) => handleAction('bet', amount)}
            onRaise={(amount) => handleAction('raise', amount)}
            onAllIn={() => handleAction('allIn')}
          />
        )}

        {/* Spectator badge */}
        {isSpectator && (
          <div className="flex justify-center p-4">
            <div className="px-6 py-2 rounded-full bg-gray-800/80 border border-gray-600">
              <span className="text-gray-400 font-roboto-condensed">👁️ Spectating</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat sidebar */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="absolute top-16 right-0 bottom-32 w-80 bg-gray-900/95 border-l border-gray-700 z-40"
          >
            <div className="p-4">
              <h3 className="text-white font-bebas text-lg mb-4">Table Chat</h3>
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  {/* Chat messages would go here */}
                  <div className="text-gray-500 text-center py-8">
                    No messages yet
                  </div>
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-casino-gold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PokerTableComplete;
