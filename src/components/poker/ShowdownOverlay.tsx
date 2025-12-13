// ============================================
// SHOWDOWN OVERLAY - Premium Winner Display with Card Highlighting
// ============================================
import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface ShowdownPlayer {
  playerId: string;
  name: string;
  seatNumber: number;
  holeCards: string[];
  isFolded: boolean;
  handName?: string;
  bestCards?: string[];
}

interface Winner {
  playerId: string;
  name?: string;
  amount: number;
  handName?: string;
  bestCards?: string[];
}

interface ShowdownOverlayProps {
  winners: Winner[];
  showdownPlayers?: ShowdownPlayer[];
  communityCards?: string[];
  onClose: () => void;
}

// Card display helper
const ShowdownCard = memo(function ShowdownCard({ 
  card, 
  index, 
  isWinningCard = false,
  size = 'md'
}: { 
  card: string; 
  index: number; 
  isWinningCard?: boolean;
  size?: 'sm' | 'md';
}) {
  const suit = card[1]?.toLowerCase();
  const rank = card[0]?.toUpperCase() === 'T' ? '10' : card[0]?.toUpperCase();
  const suitSymbol = { h: '♥', d: '♦', c: '♣', s: '♠' }[suit] || suit;
  const isRed = suit === 'h' || suit === 'd';
  
  const sizeClasses = size === 'sm' 
    ? 'w-8 h-12 text-xs' 
    : 'w-10 h-14 text-sm';
  
  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ delay: 0.5 + index * 0.1, type: 'spring' }}
      className={cn(
        sizeClasses,
        "rounded-md flex flex-col items-center justify-center font-bold shadow-lg relative",
        isWinningCard && "ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent"
      )}
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%)',
        border: isWinningCard ? '2px solid #fbbf24' : '1px solid rgba(0,0,0,0.2)'
      }}
    >
      <span className={isRed ? 'text-red-500' : 'text-gray-900'}>{rank}</span>
      <span className={cn("text-base -mt-1", isRed ? 'text-red-500' : 'text-gray-900')}>{suitSymbol}</span>
      
      {/* Winner glow effect */}
      {isWinningCard && (
        <motion.div
          className="absolute inset-0 rounded-md bg-yellow-400/20"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
});

export const ShowdownOverlay = memo(function ShowdownOverlay({
  winners,
  showdownPlayers,
  communityCards = [],
  onClose
}: ShowdownOverlayProps) {
  const [countdown, setCountdown] = useState(6);
  const [showChipsAnimation, setShowChipsAnimation] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCountdown(prev => prev <= 1 ? 0 : prev - 1), 1000);
    const timer = setTimeout(onClose, 6000);
    const chipsTimer = setTimeout(() => setShowChipsAnimation(false), 1500);
    return () => { clearInterval(interval); clearTimeout(timer); clearTimeout(chipsTimer); };
  }, [onClose]);

  if (!winners.length) return null;
  
  const mainWinner = winners[0];
  const winnerIds = new Set(winners.map(w => w.playerId));
  const winnerBestCards = new Set(winners.flatMap(w => w.bestCards || []));

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Flying chips animation */}
      <AnimatePresence>
        {showChipsAnimation && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`chip-${i}`}
                initial={{ x: 0, y: 0, scale: 0, rotate: Math.random() * 360 }}
                animate={{ 
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 150 - 50,
                  scale: [0, 1.2, 0.8],
                  rotate: Math.random() * 720
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 1, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute z-50"
                style={{ left: '50%', top: '50%', width: 24, height: 24 }}
              >
                <div 
                  className="w-full h-full rounded-full shadow-lg"
                  style={{
                    background: i % 3 === 0 
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                      : i % 3 === 1
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: '2px solid rgba(255,255,255,0.5)'
                  }}
                />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Winner card with showdown info */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
        className="relative rounded-2xl overflow-hidden text-center max-w-[420px] w-[95%] pointer-events-auto z-50"
        style={{
          background: 'linear-gradient(180deg, #1e2530 0%, #12171f 100%)',
          border: '2px solid rgba(34,197,94,0.6)',
          boxShadow: '0 0 60px rgba(34,197,94,0.4), 0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Winner header */}
        <div className="relative pt-4 pb-2">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-4xl mb-1"
          >
            🏆
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-black tracking-wider"
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #22c55e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            ПОБЕДА!
          </motion.div>
        </div>

        {/* Winner info */}
        <div className="px-4 pb-3">
          <div className="text-white font-bold text-lg mb-1">{mainWinner.name || 'Игрок'}</div>
          
          {/* Winning amount */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 400 }}
            className="flex items-center justify-center gap-2 mb-2"
          >
            <span className="text-3xl font-black text-emerald-400">+{mainWinner.amount.toLocaleString()}</span>
          </motion.div>
          
          {/* Hand rank badge */}
          {mainWinner.handName && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))',
                border: '1px solid rgba(139,92,246,0.5)'
              }}
            >
              <span className="text-white/90 font-semibold text-sm">{mainWinner.handName}</span>
            </motion.div>
          )}
        </div>

        {/* Community cards with winning cards highlighted */}
        {communityCards.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.85 }}
            className="px-4 py-3 border-t border-white/10"
            style={{ background: 'rgba(0,0,0,0.15)' }}
          >
            <div className="text-white/50 text-xs uppercase tracking-wider mb-2">Общие карты</div>
            <div className="flex justify-center gap-1.5">
              {communityCards.map((card, idx) => (
                <ShowdownCard 
                  key={`community-${idx}`}
                  card={card} 
                  index={idx} 
                  isWinningCard={winnerBestCards.has(card)}
                  size="sm"
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* SHOWDOWN PLAYERS CARDS */}
        {showdownPlayers && showdownPlayers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.9 }}
            className="px-4 py-3 border-t border-white/10"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <div className="text-white/70 text-xs uppercase tracking-wider mb-3">Вскрытие карт</div>
            <div className="space-y-3">
              {showdownPlayers.map((player) => {
                const isWinner = winnerIds.has(player.playerId);
                return (
                  <motion.div
                    key={player.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      isWinner 
                        ? "bg-gradient-to-r from-emerald-500/20 to-transparent border border-emerald-500/30" 
                        : "bg-white/5"
                    )}
                  >
                    {/* Player name */}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-semibold text-sm truncate",
                        isWinner ? "text-emerald-400" : "text-white/80"
                      )}>
                        {isWinner && <span className="mr-1">👑</span>}
                        {player.name}
                      </div>
                      {player.handName && (
                        <div className="text-xs text-white/50">{player.handName}</div>
                      )}
                    </div>
                    
                    {/* Player cards - highlight bestCards */}
                    <div className="flex gap-1">
                      {player.holeCards.map((card, idx) => (
                        <ShowdownCard 
                          key={`${player.playerId}-${idx}`}
                          card={card} 
                          index={idx} 
                          isWinningCard={isWinner && player.bestCards?.includes(card)}
                          size="sm"
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Countdown footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="px-4 py-3 border-t border-white/10"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="text-white/50 text-xs mb-1">Следующая раздача через</div>
          <motion.div 
            key={countdown} 
            initial={{ scale: 1.5, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="text-2xl font-black text-emerald-400"
          >
            {countdown}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

export default ShowdownOverlay;
