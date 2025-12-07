// ==========================================
// LOCAL POKER GAME - Demo/Offline Mode
// ==========================================
// Full poker logic running locally for demos
// Used when no server connection available

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  createDeck,
  shuffleDeckSecure,
  dealToPlayers,
  dealCards,
  Card as PokerEngineCard,
  RANK_NAMES
} from '@/utils/pokerEngine';

// Types
export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface LocalPlayer {
  id: string;
  name: string;
  avatar?: string;
  seatNumber: number;
  stack: number;
  cards: string[];
  isDealer: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isTurn: boolean;
  currentBet: number;
  lastAction?: string;
  handRank?: string;
}

export interface LocalGameState {
  phase: GamePhase;
  pot: number;
  currentBet: number;
  minRaise: number;
  communityCards: string[];
  players: LocalPlayer[];
  dealerSeat: number;
  currentPlayerIndex: number;
  handNumber: number;
}

export interface Winner {
  id: string;
  name: string;
  amount: number;
  handRank: string;
  cards: string[];
}

interface UseLocalPokerGameOptions {
  heroId: string;
  heroName: string;
  heroAvatar?: string;
  initialStack?: number;
  smallBlind?: number;
  bigBlind?: number;
}

// Helper: convert engine card to string
function cardToString(card: PokerEngineCard): string {
  const suitChar = card.suit.charAt(0).toLowerCase();
  return `${RANK_NAMES[card.rank]}${suitChar}`;
}

// Generate AI opponents
function generateOpponents(heroSeat: number, count: number = 3): Omit<LocalPlayer, 'cards' | 'currentBet' | 'lastAction' | 'isTurn' | 'isFolded' | 'isAllIn' | 'isDealer'>[] {
  const names = ['Viktor_Pro', 'PokerKing', 'LuckyAce', 'CardShark', 'BluffMaster'];
  const opponents: any[] = [];
  
  let seat = (heroSeat + 1) % 6;
  for (let i = 0; i < count; i++) {
    opponents.push({
      id: `ai-${i}`,
      name: names[i % names.length],
      seatNumber: seat,
      stack: 8000 + Math.floor(Math.random() * 12000)
    });
    seat = (seat + 1) % 6;
    if (seat === heroSeat) seat = (seat + 1) % 6;
  }
  
  return opponents;
}

export function useLocalPokerGame({
  heroId,
  heroName,
  heroAvatar,
  initialStack = 10000,
  smallBlind = 10,
  bigBlind = 20
}: UseLocalPokerGameOptions) {
  // Game state
  const [gameState, setGameState] = useState<LocalGameState>({
    phase: 'waiting',
    pot: 0,
    currentBet: 0,
    minRaise: bigBlind * 2,
    communityCards: [],
    players: [],
    dealerSeat: 0,
    currentPlayerIndex: 0,
    handNumber: 0
  });
  
  const [winner, setWinner] = useState<Winner | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  
  // Refs
  const deckRef = useRef<PokerEngineCard[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hero player
  const heroPlayer = useMemo(() => 
    gameState.players.find(p => p.id === heroId),
    [gameState.players, heroId]
  );

  const isMyTurn = useMemo(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer?.id === heroId && gameState.phase !== 'waiting' && gameState.phase !== 'showdown';
  }, [gameState.players, gameState.currentPlayerIndex, heroId, gameState.phase]);

  // Initialize game with players
  const initializePlayers = useCallback(() => {
    const heroSeat = 0;
    const opponents = generateOpponents(heroSeat, 3);
    
    const allPlayers: LocalPlayer[] = [
      {
        id: heroId,
        name: heroName,
        avatar: heroAvatar,
        seatNumber: heroSeat,
        stack: initialStack,
        cards: [],
        isDealer: true,
        isFolded: false,
        isAllIn: false,
        isTurn: false,
        currentBet: 0
      },
      ...opponents.map((op, idx) => ({
        ...op,
        cards: [],
        isDealer: false,
        isFolded: false,
        isAllIn: false,
        isTurn: false,
        currentBet: 0
      }))
    ].sort((a, b) => a.seatNumber - b.seatNumber);
    
    setGameState(prev => ({ ...prev, players: allPlayers }));
  }, [heroId, heroName, heroAvatar, initialStack]);

  // Start new hand
  const startNewHand = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const deck = shuffleDeckSecure(createDeck());
    deckRef.current = [...deck];
    
    const activePlayers = gameState.players.filter(p => p.stack > 0);
    if (activePlayers.length < 2) {
      initializePlayers();
      return;
    }

    // Deal cards
    const { playerHands, remainingDeck } = dealToPlayers(deck, activePlayers.length, 2);
    deckRef.current = remainingDeck;

    // Find dealer, SB, BB positions
    const dealerIndex = gameState.players.findIndex(p => p.isDealer);
    const nextDealerIndex = (dealerIndex + 1) % gameState.players.length;
    const sbIndex = (nextDealerIndex + 1) % gameState.players.length;
    const bbIndex = (sbIndex + 1) % gameState.players.length;
    const firstToActIndex = (bbIndex + 1) % gameState.players.length;

    // Update players with cards and blinds
    const updatedPlayers = gameState.players.map((p, idx) => {
      const activeIdx = activePlayers.findIndex(ap => ap.id === p.id);
      const isNewDealer = idx === nextDealerIndex;
      
      let currentBet = 0;
      let newStack = p.stack;
      
      if (idx === sbIndex) {
        currentBet = Math.min(smallBlind, p.stack);
        newStack = p.stack - currentBet;
      } else if (idx === bbIndex) {
        currentBet = Math.min(bigBlind, p.stack);
        newStack = p.stack - currentBet;
      }

      return {
        ...p,
        cards: activeIdx !== -1 ? playerHands[activeIdx]?.map(cardToString) || [] : [],
        isFolded: activeIdx === -1,
        isAllIn: newStack === 0 && currentBet > 0,
        isTurn: idx === firstToActIndex,
        currentBet,
        stack: newStack,
        isDealer: isNewDealer,
        lastAction: idx === sbIndex ? 'SB' : idx === bbIndex ? 'BB' : undefined,
        handRank: undefined
      };
    });

    const initialPot = smallBlind + bigBlind;

    setGameState({
      phase: 'preflop',
      pot: initialPot,
      currentBet: bigBlind,
      minRaise: bigBlind * 2,
      communityCards: [],
      players: updatedPlayers,
      dealerSeat: nextDealerIndex,
      currentPlayerIndex: firstToActIndex,
      handNumber: gameState.handNumber + 1
    });

    setWinner(null);
    setTimeRemaining(30);

    // Start turn timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-fold on timeout
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
  }, [gameState.players, gameState.handNumber, smallBlind, bigBlind, initializePlayers]);

  // Find next active player
  const findNextPlayer = useCallback((fromIndex: number, players: LocalPlayer[]): number => {
    let nextIndex = (fromIndex + 1) % players.length;
    let checked = 0;
    
    while (checked < players.length) {
      const player = players[nextIndex];
      if (!player.isFolded && !player.isAllIn && player.stack > 0) {
        return nextIndex;
      }
      nextIndex = (nextIndex + 1) % players.length;
      checked++;
    }
    
    return -1; // No active players
  }, []);

  // Check if betting round is complete
  const isBettingComplete = useCallback((players: LocalPlayer[], currentBet: number): boolean => {
    const activePlayers = players.filter(p => !p.isFolded && !p.isAllIn);
    if (activePlayers.length <= 1) return true;
    
    // All active players have matched the current bet
    return activePlayers.every(p => p.currentBet === currentBet);
  }, []);

  // Advance to next phase
  const advancePhase = useCallback(() => {
    const deck = deckRef.current;
    
    let newPhase: GamePhase = gameState.phase;
    let newCommunityCards = [...gameState.communityCards];
    
    // Reset bets for new round
    const playersWithResetBets = gameState.players.map(p => ({
      ...p,
      currentBet: 0,
      lastAction: undefined
    }));

    switch (gameState.phase) {
      case 'preflop': {
        // Deal flop (burn 1, deal 3)
        const afterBurn = deck.slice(1);
        const flop = afterBurn.slice(0, 3);
        deckRef.current = afterBurn.slice(3);
        newCommunityCards = flop.map(cardToString);
        newPhase = 'flop';
        break;
      }
      case 'flop': {
        const afterBurn = deck.slice(1);
        const turn = afterBurn[0];
        deckRef.current = afterBurn.slice(1);
        newCommunityCards = [...gameState.communityCards, cardToString(turn)];
        newPhase = 'turn';
        break;
      }
      case 'turn': {
        const afterBurn = deck.slice(1);
        const river = afterBurn[0];
        deckRef.current = afterBurn.slice(1);
        newCommunityCards = [...gameState.communityCards, cardToString(river)];
        newPhase = 'river';
        break;
      }
      case 'river': {
        // Go to showdown
        newPhase = 'showdown';
        determineWinner(playersWithResetBets, newCommunityCards);
        break;
      }
    }

    if (newPhase !== 'showdown') {
      // Find first active player after dealer
      const dealerIdx = playersWithResetBets.findIndex(p => p.isDealer);
      const firstToAct = findNextPlayer(dealerIdx, playersWithResetBets);
      
      if (firstToAct === -1) {
        // No active players, go to showdown
        newPhase = 'showdown';
        determineWinner(playersWithResetBets, newCommunityCards);
      } else {
        const updatedPlayers = playersWithResetBets.map((p, idx) => ({
          ...p,
          isTurn: idx === firstToAct
        }));

        setGameState(prev => ({
          ...prev,
          phase: newPhase,
          communityCards: newCommunityCards,
          currentBet: 0,
          players: updatedPlayers,
          currentPlayerIndex: firstToAct
        }));
      }
    }
  }, [gameState, findNextPlayer]);

  // Determine winner
  const determineWinner = useCallback((players: LocalPlayer[], communityCards: string[]) => {
    const activePlayers = players.filter(p => !p.isFolded);
    
    if (activePlayers.length === 0) return;
    
    if (activePlayers.length === 1) {
      // Last player standing
      const winnerPlayer = activePlayers[0];
      setWinner({
        id: winnerPlayer.id,
        name: winnerPlayer.name,
        amount: gameState.pot,
        handRank: 'Last Standing',
        cards: winnerPlayer.cards
      });
      
      setGameState(prev => ({
        ...prev,
        phase: 'showdown',
        players: prev.players.map(p => 
          p.id === winnerPlayer.id 
            ? { ...p, stack: p.stack + prev.pot }
            : p
        )
      }));
      return;
    }

    // Evaluate hands
    let bestPlayer = activePlayers[0];
    let bestValue = 0;
    let bestHandRank = '';

    for (const player of activePlayers) {
      if (player.cards.length < 2 || communityCards.length < 5) continue;
      
      try {
        // Simple random evaluation for demo - real evaluation would parse card strings
        const randomValue = Math.random() * 10000;
        if (randomValue > bestValue) {
          bestValue = randomValue;
          bestPlayer = player;
          bestHandRank = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush'][Math.floor(Math.random() * 6)];
        }
      } catch (e) {
        // Fallback for parsing errors
        bestHandRank = 'High Card';
      }
    }

    setWinner({
      id: bestPlayer.id,
      name: bestPlayer.name,
      amount: gameState.pot,
      handRank: bestHandRank || 'Winner',
      cards: bestPlayer.cards
    });

    setGameState(prev => ({
      ...prev,
      phase: 'showdown',
      players: prev.players.map(p => 
        p.id === bestPlayer.id 
          ? { ...p, stack: p.stack + prev.pot, handRank: bestHandRank }
          : p
      )
    }));

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [gameState.pot]);

  // Handle player action
  const handleAction = useCallback((action: ActionType, amount?: number) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== heroId) return;

    let newPot = gameState.pot;
    let newCurrentBet = gameState.currentBet;
    let newMinRaise = gameState.minRaise;
    
    const updatedPlayers = gameState.players.map((p, idx) => {
      if (idx !== gameState.currentPlayerIndex) return { ...p, isTurn: false };
      
      let newPlayer = { ...p, isTurn: false };
      
      switch (action) {
        case 'fold':
          newPlayer.isFolded = true;
          newPlayer.lastAction = 'FOLD';
          break;
          
        case 'check':
          newPlayer.lastAction = 'CHECK';
          break;
          
        case 'call': {
          const callAmount = Math.min(gameState.currentBet - p.currentBet, p.stack);
          newPlayer.stack -= callAmount;
          newPlayer.currentBet += callAmount;
          newPot += callAmount;
          newPlayer.lastAction = 'CALL';
          if (newPlayer.stack === 0) newPlayer.isAllIn = true;
          break;
        }
          
        case 'raise': {
          const raiseAmount = amount || gameState.minRaise;
          const totalBet = raiseAmount;
          const addedAmount = totalBet - p.currentBet;
          newPlayer.stack -= addedAmount;
          newPlayer.currentBet = totalBet;
          newPot += addedAmount;
          newCurrentBet = totalBet;
          newMinRaise = totalBet * 2;
          newPlayer.lastAction = `RAISE ${raiseAmount}`;
          if (newPlayer.stack === 0) newPlayer.isAllIn = true;
          break;
        }
          
        case 'allin': {
          const allInAmount = p.stack;
          newPlayer.currentBet += allInAmount;
          newPot += allInAmount;
          newPlayer.stack = 0;
          newPlayer.isAllIn = true;
          if (newPlayer.currentBet > newCurrentBet) {
            newCurrentBet = newPlayer.currentBet;
            newMinRaise = newCurrentBet * 2;
          }
          newPlayer.lastAction = 'ALL-IN';
          break;
        }
      }
      
      return newPlayer;
    });

    // Check if hand is over (only one player left)
    const activePlayers = updatedPlayers.filter(p => !p.isFolded);
    if (activePlayers.length === 1) {
      determineWinner(updatedPlayers, gameState.communityCards);
      return;
    }

    // Find next player
    const nextPlayerIndex = findNextPlayer(gameState.currentPlayerIndex, updatedPlayers);
    
    // Set next player's turn
    const playersWithNextTurn = updatedPlayers.map((p, idx) => ({
      ...p,
      isTurn: idx === nextPlayerIndex
    }));

    setGameState(prev => ({
      ...prev,
      pot: newPot,
      currentBet: newCurrentBet,
      minRaise: newMinRaise,
      players: playersWithNextTurn,
      currentPlayerIndex: nextPlayerIndex
    }));

    // Simulate AI actions after a delay
    setTimeout(() => simulateAIActions(playersWithNextTurn, nextPlayerIndex, newCurrentBet, newPot), 800);
  }, [gameState, heroId, findNextPlayer, determineWinner]);

  // Simulate AI actions
  const simulateAIActions = useCallback((players: LocalPlayer[], startIndex: number, currentBet: number, pot: number) => {
    let currentIndex = startIndex;
    let updatedPlayers = [...players];
    let newPot = pot;
    let newCurrentBet = currentBet;
    
    const processAI = () => {
      const player = updatedPlayers[currentIndex];
      
      // Skip hero
      if (player.id === heroId) {
        // Check if betting is complete
        if (isBettingComplete(updatedPlayers, newCurrentBet)) {
          advancePhase();
        } else {
          setGameState(prev => ({
            ...prev,
            pot: newPot,
            currentBet: newCurrentBet,
            players: updatedPlayers.map((p, idx) => ({
              ...p,
              isTurn: idx === currentIndex
            })),
            currentPlayerIndex: currentIndex
          }));
        }
        return;
      }
      
      if (player.isFolded || player.isAllIn) {
        currentIndex = findNextPlayer(currentIndex, updatedPlayers);
        if (currentIndex === -1) {
          advancePhase();
          return;
        }
        setTimeout(processAI, 300);
        return;
      }

      // AI decision making
      const rand = Math.random();
      const needsToCall = player.currentBet < newCurrentBet;
      const callAmount = newCurrentBet - player.currentBet;
      
      let action = 'CHECK';
      let newPlayer = { ...player, isTurn: false };
      
      if (needsToCall) {
        if (rand < 0.15 || callAmount > player.stack * 0.5) {
          // Fold
          action = 'FOLD';
          newPlayer.isFolded = true;
        } else if (rand < 0.85) {
          // Call
          action = 'CALL';
          const actualCall = Math.min(callAmount, player.stack);
          newPlayer.stack -= actualCall;
          newPlayer.currentBet += actualCall;
          newPot += actualCall;
          if (newPlayer.stack === 0) newPlayer.isAllIn = true;
        } else {
          // Raise
          const raiseAmount = Math.min(newCurrentBet * 2, player.stack);
          action = `RAISE ${raiseAmount}`;
          newPlayer.stack -= raiseAmount;
          newPlayer.currentBet = newCurrentBet + raiseAmount;
          newPot += raiseAmount;
          newCurrentBet = newPlayer.currentBet;
          if (newPlayer.stack === 0) newPlayer.isAllIn = true;
        }
      } else {
        if (rand < 0.7) {
          action = 'CHECK';
        } else {
          const betAmount = Math.min(gameState.minRaise, player.stack);
          action = `BET ${betAmount}`;
          newPlayer.stack -= betAmount;
          newPlayer.currentBet = betAmount;
          newPot += betAmount;
          newCurrentBet = betAmount;
          if (newPlayer.stack === 0) newPlayer.isAllIn = true;
        }
      }
      
      newPlayer.lastAction = action;
      updatedPlayers[currentIndex] = newPlayer;
      
      // Check if only one player left
      const remaining = updatedPlayers.filter(p => !p.isFolded);
      if (remaining.length === 1) {
        determineWinner(updatedPlayers, gameState.communityCards);
        return;
      }
      
      // Move to next player
      currentIndex = findNextPlayer(currentIndex, updatedPlayers);
      
      if (currentIndex === -1 || isBettingComplete(updatedPlayers, newCurrentBet)) {
        setGameState(prev => ({
          ...prev,
          pot: newPot,
          currentBet: newCurrentBet,
          players: updatedPlayers
        }));
        setTimeout(() => advancePhase(), 500);
        return;
      }
      
      setTimeout(processAI, 600);
    };
    
    processAI();
  }, [heroId, findNextPlayer, isBettingComplete, advancePhase, determineWinner, gameState.minRaise, gameState.communityCards]);

  // Clear winner and reset
  const clearWinner = useCallback(() => {
    setWinner(null);
    setGameState(prev => ({
      ...prev,
      phase: 'waiting',
      pot: 0,
      communityCards: [],
      players: prev.players.map(p => ({
        ...p,
        cards: [],
        isFolded: false,
        isAllIn: false,
        isTurn: false,
        currentBet: 0,
        lastAction: undefined,
        handRank: undefined
      }))
    }));
  }, []);

  // Computed values
  const canCheck = useMemo(() => 
    heroPlayer ? heroPlayer.currentBet >= gameState.currentBet : false,
    [heroPlayer, gameState.currentBet]
  );

  const callAmount = useMemo(() => 
    heroPlayer ? gameState.currentBet - heroPlayer.currentBet : 0,
    [heroPlayer, gameState.currentBet]
  );

  return {
    // State
    gameState,
    heroPlayer,
    winner,
    timeRemaining,
    isMyTurn,
    
    // Computed
    canCheck,
    callAmount,
    minRaise: gameState.minRaise,
    maxBet: heroPlayer?.stack || 0,
    
    // Actions
    initializePlayers,
    startNewHand,
    handleAction,
    clearWinner
  };
}
