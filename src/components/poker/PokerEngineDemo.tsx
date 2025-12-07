import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  createDeck, 
  shuffleDeckSecure, 
  dealToPlayers, 
  dealCards,
  evaluateHand, 
  determineWinners,
  formatCard,
  getSuitColor,
  Card as PokerCard,
  HandEvaluation,
  SUIT_NAMES,
  RANK_NAMES
} from '@/utils/pokerEngine';
import { Shuffle, Users, Award, RotateCcw } from 'lucide-react';

interface PlayerHand {
  cards: PokerCard[];
  evaluation?: HandEvaluation;
}

export function PokerEngineDemo() {
  const [deck, setDeck] = useState<PokerCard[]>([]);
  const [communityCards, setCommunityCards] = useState<PokerCard[]>([]);
  const [playerHands, setPlayerHands] = useState<PlayerHand[]>([]);
  const [winners, setWinners] = useState<number[]>([]);
  const [gamePhase, setGamePhase] = useState<'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('idle');

  const startNewGame = () => {
    const newDeck = shuffleDeckSecure(createDeck());
    const { playerHands: hands, remainingDeck } = dealToPlayers(newDeck, 4, 2);
    
    setDeck(remainingDeck);
    setPlayerHands(hands.map(cards => ({ cards })));
    setCommunityCards([]);
    setWinners([]);
    setGamePhase('preflop');
  };

  const dealFlop = () => {
    // Burn one card, deal 3
    const { dealtCards, remainingDeck } = dealCards(deck.slice(1), 3);
    setDeck(remainingDeck);
    setCommunityCards(dealtCards);
    setGamePhase('flop');
  };

  const dealTurn = () => {
    // Burn one card, deal 1
    const { dealtCards, remainingDeck } = dealCards(deck.slice(1), 1);
    setDeck(remainingDeck);
    setCommunityCards(prev => [...prev, ...dealtCards]);
    setGamePhase('turn');
  };

  const dealRiver = () => {
    // Burn one card, deal 1
    const { dealtCards, remainingDeck } = dealCards(deck.slice(1), 1);
    setDeck(remainingDeck);
    setCommunityCards(prev => [...prev, ...dealtCards]);
    setGamePhase('river');
  };

  const showdown = () => {
    const evaluatedHands = playerHands.map(hand => ({
      ...hand,
      evaluation: evaluateHand([...hand.cards, ...communityCards])
    }));
    
    setPlayerHands(evaluatedHands);
    
    const evaluations = evaluatedHands.map(h => h.evaluation!);
    setWinners(determineWinners(evaluations));
    setGamePhase('showdown');
  };

  const renderCard = (card: PokerCard, index: number) => {
    const color = getSuitColor(card.suit);
    return (
      <div 
        key={card.id + index}
        className={`
          w-12 h-16 sm:w-14 sm:h-20 rounded-lg border-2 border-border
          flex flex-col items-center justify-center
          bg-card shadow-md font-bold text-lg
          ${color === 'red' ? 'text-red-500' : 'text-foreground'}
          transition-all duration-300 hover:scale-105
        `}
      >
        <span className="text-sm sm:text-base">{RANK_NAMES[card.rank]}</span>
        <span className="text-lg sm:text-xl">{SUIT_NAMES[card.suit]}</span>
      </div>
    );
  };

  const renderBackCard = () => (
    <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg border-2 border-border bg-gradient-to-br from-syndikate-orange to-syndikate-orange-glow flex items-center justify-center shadow-md">
      <div className="w-8 h-12 border-2 border-white/30 rounded" />
    </div>
  );

  return (
    <Card className="brutal-border bg-syndikate-metal">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-syndikate-orange" />
          Покерный движок - Демо
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Управление */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={startNewGame} className="bg-syndikate-orange hover:bg-syndikate-orange-glow">
            <RotateCcw className="h-4 w-4 mr-2" />
            Новая игра
          </Button>
          
          {gamePhase === 'preflop' && (
            <Button onClick={dealFlop} variant="outline">
              Флоп
            </Button>
          )}
          
          {gamePhase === 'flop' && (
            <Button onClick={dealTurn} variant="outline">
              Тёрн
            </Button>
          )}
          
          {gamePhase === 'turn' && (
            <Button onClick={dealRiver} variant="outline">
              Ривер
            </Button>
          )}
          
          {gamePhase === 'river' && (
            <Button onClick={showdown} variant="outline">
              <Award className="h-4 w-4 mr-2" />
              Вскрытие
            </Button>
          )}
        </div>

        {/* Общие карты */}
        {gamePhase !== 'idle' && (
          <div className="p-4 bg-green-900/30 rounded-xl border border-green-700/50">
            <div className="text-sm text-muted-foreground mb-2">Общие карты (борд)</div>
            <div className="flex gap-2 justify-center min-h-[80px] items-center">
              {communityCards.length === 0 ? (
                <span className="text-muted-foreground">Ожидание флопа...</span>
              ) : (
                communityCards.map((card, i) => renderCard(card, i))
              )}
            </div>
          </div>
        )}

        {/* Игроки */}
        {playerHands.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {playerHands.map((hand, playerIndex) => {
              const isWinner = winners.includes(playerIndex);
              return (
                <div 
                  key={playerIndex}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-300
                    ${isWinner 
                      ? 'border-syndikate-orange bg-syndikate-orange/10 shadow-lg shadow-syndikate-orange/20' 
                      : 'border-border bg-muted/20'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">Игрок {playerIndex + 1}</span>
                    </div>
                    {isWinner && (
                      <Badge className="bg-syndikate-orange">
                        <Award className="h-3 w-3 mr-1" />
                        Победитель
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-3">
                    {gamePhase === 'showdown' 
                      ? hand.cards.map((card, i) => renderCard(card, i))
                      : hand.cards.map((_, i) => <div key={i}>{renderBackCard()}</div>)
                    }
                  </div>
                  
                  {hand.evaluation && (
                    <div className="space-y-1">
                      <Badge 
                        variant="secondary" 
                        className={isWinner ? 'bg-syndikate-orange text-white' : ''}
                      >
                        {hand.evaluation.name}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {hand.evaluation.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Состояние */}
        {gamePhase !== 'idle' && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Фаза: {gamePhase.toUpperCase()}</span>
            <span>Карт в колоде: {deck.length}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
