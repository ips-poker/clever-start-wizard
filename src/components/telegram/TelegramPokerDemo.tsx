import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Award, RotateCcw, Users, Spade } from 'lucide-react';

interface PlayerHand {
  cards: PokerCard[];
  evaluation?: HandEvaluation;
}

export function TelegramPokerDemo() {
  const [deck, setDeck] = useState<PokerCard[]>([]);
  const [communityCards, setCommunityCards] = useState<PokerCard[]>([]);
  const [playerHands, setPlayerHands] = useState<PlayerHand[]>([]);
  const [winners, setWinners] = useState<number[]>([]);
  const [gamePhase, setGamePhase] = useState<'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('idle');

  const startNewGame = () => {
    const newDeck = shuffleDeckSecure(createDeck());
    const { playerHands: hands, remainingDeck } = dealToPlayers(newDeck, 2, 2);
    
    setDeck(remainingDeck);
    setPlayerHands(hands.map(cards => ({ cards })));
    setCommunityCards([]);
    setWinners([]);
    setGamePhase('preflop');
  };

  const nextStep = () => {
    if (gamePhase === 'preflop') {
      const { dealtCards, remainingDeck } = dealCards(deck.slice(1), 3);
      setDeck(remainingDeck);
      setCommunityCards(dealtCards);
      setGamePhase('flop');
    } else if (gamePhase === 'flop') {
      const { dealtCards, remainingDeck } = dealCards(deck.slice(1), 1);
      setDeck(remainingDeck);
      setCommunityCards(prev => [...prev, ...dealtCards]);
      setGamePhase('turn');
    } else if (gamePhase === 'turn') {
      const { dealtCards, remainingDeck } = dealCards(deck.slice(1), 1);
      setDeck(remainingDeck);
      setCommunityCards(prev => [...prev, ...dealtCards]);
      setGamePhase('river');
    } else if (gamePhase === 'river') {
      const evaluatedHands = playerHands.map(hand => ({
        ...hand,
        evaluation: evaluateHand([...hand.cards, ...communityCards])
      }));
      setPlayerHands(evaluatedHands);
      const evaluations = evaluatedHands.map(h => h.evaluation!);
      setWinners(determineWinners(evaluations));
      setGamePhase('showdown');
    }
  };

  const renderCard = (card: PokerCard, size: 'sm' | 'md' = 'sm') => {
    const color = getSuitColor(card.suit);
    const sizeClasses = size === 'sm' ? 'w-10 h-14' : 'w-12 h-16';
    return (
      <div 
        key={card.id}
        className={`
          ${sizeClasses} rounded-lg border border-border
          flex flex-col items-center justify-center
          bg-card shadow-sm font-bold
          ${color === 'red' ? 'text-red-500' : 'text-foreground'}
        `}
      >
        <span className="text-xs">{RANK_NAMES[card.rank]}</span>
        <span className="text-sm">{SUIT_NAMES[card.suit]}</span>
      </div>
    );
  };

  const renderBackCard = () => (
    <div className="w-10 h-14 rounded-lg border border-border bg-gradient-to-br from-syndikate-orange to-syndikate-orange-glow flex items-center justify-center">
      <Spade className="h-4 w-4 text-white/50" />
    </div>
  );

  const getNextButtonText = () => {
    switch (gamePhase) {
      case 'preflop': return 'Флоп';
      case 'flop': return 'Тёрн';
      case 'turn': return 'Ривер';
      case 'river': return 'Вскрытие';
      default: return '';
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-bold flex items-center justify-center gap-2">
          <Award className="h-5 w-5 text-syndikate-orange" />
          Покерный движок
        </h2>
        <p className="text-xs text-muted-foreground">Демо Texas Hold'em</p>
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        <Button 
          size="sm" 
          onClick={startNewGame} 
          className="bg-syndikate-orange hover:bg-syndikate-orange-glow"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Новая игра
        </Button>
        
        {gamePhase !== 'idle' && gamePhase !== 'showdown' && (
          <Button size="sm" variant="outline" onClick={nextStep}>
            {getNextButtonText()}
          </Button>
        )}
      </div>

      {/* Community Cards */}
      {gamePhase !== 'idle' && (
        <div className="p-3 bg-green-900/30 rounded-xl border border-green-700/50">
          <div className="text-xs text-muted-foreground mb-2 text-center">Борд</div>
          <div className="flex gap-1.5 justify-center min-h-[56px] items-center">
            {communityCards.length === 0 ? (
              <span className="text-xs text-muted-foreground">Ожидание...</span>
            ) : (
              communityCards.map((card) => renderCard(card))
            )}
          </div>
        </div>
      )}

      {/* Players */}
      {playerHands.length > 0 && (
        <div className="space-y-3">
          {playerHands.map((hand, idx) => {
            const isWinner = winners.includes(idx);
            return (
              <div 
                key={idx}
                className={`
                  p-3 rounded-xl border-2 transition-all
                  ${isWinner 
                    ? 'border-syndikate-orange bg-syndikate-orange/10' 
                    : 'border-border bg-muted/20'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {idx === 0 ? 'Вы' : 'Оппонент'}
                    </span>
                  </div>
                  {isWinner && (
                    <Badge className="bg-syndikate-orange text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      WIN
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-1.5 mb-2">
                  {gamePhase === 'showdown' || idx === 0
                    ? hand.cards.map((card) => renderCard(card))
                    : hand.cards.map((_, i) => <div key={i}>{renderBackCard()}</div>)
                  }
                </div>
                
                {hand.evaluation && (
                  <Badge variant="secondary" className={isWinner ? 'bg-syndikate-orange/20' : ''}>
                    {hand.evaluation.name}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      {gamePhase === 'idle' && (
        <div className="text-center text-xs text-muted-foreground p-4">
          Нажмите "Новая игра" чтобы начать
        </div>
      )}
    </div>
  );
}
