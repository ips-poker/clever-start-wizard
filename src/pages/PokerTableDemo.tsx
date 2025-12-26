import React, { useState } from 'react';
import { PokerTableComplete } from '@/components/poker/PokerTableComplete';
import { PlayerData } from '@/components/poker/PlayerSeat';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Demo data
const DEMO_PLAYERS: (PlayerData | null)[] = [
  {
    id: 'player1',
    name: 'PokerPro777',
    stack: 15420,
    bet: 200,
    isDealer: true,
    cards: [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'K' }
    ]
  },
  {
    id: 'player2',
    name: 'LuckyAce',
    stack: 8750,
    bet: 100,
    isSmallBlind: true,
    cards: [
      { suit: 'diamonds', rank: 'Q' },
      { suit: 'clubs', rank: 'Q' }
    ]
  },
  {
    id: 'player3',
    name: 'BluffMaster',
    stack: 22100,
    bet: 200,
    isBigBlind: true,
    isActive: true,
    timeRemaining: 20,
    timeBank: 30,
    cards: [
      { suit: 'hearts', rank: '10' },
      { suit: 'hearts', rank: 'J' }
    ]
  },
  null, // Empty seat
  {
    id: 'player5',
    name: 'ChipLeader',
    stack: 45600,
    bet: 0,
    isFolded: true,
    lastAction: 'Fold'
  },
  {
    id: 'player6',
    name: 'AllInAndy',
    stack: 5200,
    bet: 5200,
    isAllIn: true,
    lastAction: 'All In',
    cards: [
      { suit: 'clubs', rank: 'A' },
      { suit: 'diamonds', rank: 'A' }
    ]
  },
  null, // Empty seat
  {
    id: 'player8',
    name: 'TightPlayer',
    stack: 12800,
    bet: 400,
    lastAction: 'Raise',
    cards: [
      { suit: 'spades', rank: 'K' },
      { suit: 'clubs', rank: 'K' }
    ]
  },
  {
    id: 'player9',
    name: 'FishyMcFish',
    stack: 3200,
    bet: 200,
    lastAction: 'Call'
  }
];

const DEMO_GAME_STATE = {
  phase: 'flop' as const,
  pot: 6500,
  sidePots: [{ amount: 1200, eligible: ['player6'] }],
  currentBet: 400,
  minRaise: 800,
  dealerSeat: 0,
  activeSeat: 2,
  communityCards: [
    { suit: 'hearts' as const, rank: '7' },
    { suit: 'spades' as const, rank: '8' },
    { suit: 'diamonds' as const, rank: '9' }
  ]
};

const PokerTableDemo: React.FC = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'green' | 'blue' | 'red' | 'purple'>('green');
  const [isSpectator, setIsSpectator] = useState(false);

  const handleAction = (action: string, amount?: number) => {
    console.log('Action:', action, amount);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Demo controls */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="bg-gray-800/80 border-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-2">
          {(['green', 'blue', 'red', 'purple'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                theme === t ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{
                background: {
                  green: '#1a5f3c',
                  blue: '#1e3a5f',
                  red: '#5f1e1e',
                  purple: '#3d1e5f'
                }[t]
              }}
            />
          ))}
        </div>

        <Button
          variant={isSpectator ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsSpectator(!isSpectator)}
          className="bg-gray-800/80 border-gray-700"
        >
          {isSpectator ? '👁️ Spectating' : '🎮 Playing'}
        </Button>
      </div>

      {/* Poker table */}
      <PokerTableComplete
        tableId="demo-table-001"
        players={DEMO_PLAYERS}
        gameState={DEMO_GAME_STATE}
        currentPlayerId="player3"
        tableTheme={theme}
        isSpectator={isSpectator}
        onAction={handleAction}
        className="w-full h-screen"
      />
    </div>
  );
};

export default PokerTableDemo;
