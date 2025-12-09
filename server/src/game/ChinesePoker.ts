/**
 * Open-Face Chinese Poker (OFC) Engine
 * Supports: Classic, Pineapple, Turbo variants
 * 
 * Game Rules:
 * - Players arrange 13 cards into 3 rows: top (3), middle (5), bottom (5)
 * - Bottom must beat middle, middle must beat top (or "foul")
 * - Royalties for strong hands, Fantasyland for QQ+ on top
 */

import { 
  evaluateHand, 
  compareHands, 
  RANK_VALUES,
  prepareDeck,
  shuffleDeck,
  HandResult
} from './PokerEngineV3.js';

// ==========================================
// TYPES
// ==========================================
export type OFCVariant = 'classic' | 'pineapple' | 'turbo';

export interface OFCHand {
  top: string[];    // 3 cards
  middle: string[]; // 5 cards
  bottom: string[]; // 5 cards
}

export interface OFCPlayerState {
  playerId: string;
  name: string;
  hand: OFCHand;
  cardsToPlace: string[];
  fantasyland: boolean;
  fantasylandCards: number;
  isComplete: boolean;
  score: number;
  totalScore: number;
}

export interface OFCGameState {
  id: string;
  variant: OFCVariant;
  players: OFCPlayerState[];
  deck: string[];
  round: number;
  currentPlayerIndex: number;
  isFantasylandRound: boolean;
  status: 'waiting' | 'dealing' | 'placing' | 'scoring' | 'complete';
  lastAction: string | null;
}

export interface OFCAction {
  type: 'place' | 'discard';
  cardId: string;
  row?: 'top' | 'middle' | 'bottom';
}

export interface OFCActionResult {
  success: boolean;
  error?: string;
  newState?: OFCGameState;
  roundComplete?: boolean;
  gameComplete?: boolean;
  scores?: { playerId: string; roundScore: number; totalScore: number }[];
}

// ==========================================
// ROYALTY POINTS
// ==========================================
const OFC_TOP_ROYALTIES: Record<string, number> = {
  '66': 1, '77': 2, '88': 3, '99': 4, 'TT': 5, 'JJ': 6, 'QQ': 7, 'KK': 8, 'AA': 9,
  '222': 10, '333': 11, '444': 12, '555': 13, '666': 14, '777': 15, '888': 16, 
  '999': 17, 'TTT': 18, 'JJJ': 19, 'QQQ': 20, 'KKK': 21, 'AAA': 22
};

const OFC_MIDDLE_ROYALTIES: Record<number, number> = {
  4: 2,   // Three of a kind
  5: 4,   // Straight
  6: 8,   // Flush
  7: 12,  // Full House
  8: 20,  // Four of a kind
  9: 30,  // Straight Flush
  10: 50  // Royal Flush
};

const OFC_BOTTOM_ROYALTIES: Record<number, number> = {
  5: 2,   // Straight
  6: 4,   // Flush
  7: 6,   // Full House
  8: 10,  // Four of a kind
  9: 15,  // Straight Flush
  10: 25  // Royal Flush
};

// ==========================================
// GAME CREATION
// ==========================================
export function createOFCGame(
  variant: OFCVariant,
  playerIds: string[],
  playerNames: string[]
): OFCGameState {
  const deck = prepareDeck();
  const initialCards = variant === 'pineapple' ? 5 : 5;
  
  let cardIndex = 0;
  const players: OFCPlayerState[] = playerIds.map((playerId, i) => ({
    playerId,
    name: playerNames[i] || `Player ${i + 1}`,
    hand: { top: [], middle: [], bottom: [] },
    cardsToPlace: deck.slice(cardIndex, cardIndex += initialCards),
    fantasyland: false,
    fantasylandCards: 0,
    isComplete: false,
    score: 0,
    totalScore: 0
  }));

  return {
    id: crypto.randomUUID(),
    variant,
    players,
    deck: deck.slice(cardIndex),
    round: 1,
    currentPlayerIndex: 0,
    isFantasylandRound: false,
    status: 'placing',
    lastAction: null
  };
}

// ==========================================
// CARD PLACEMENT
// ==========================================
export function ofcPlaceCard(
  state: OFCGameState,
  playerId: string,
  cardId: string,
  row: 'top' | 'middle' | 'bottom'
): OFCActionResult {
  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    return { success: false, error: 'Player not found' };
  }
  
  const player = state.players[playerIndex];
  
  if (!player.cardsToPlace.includes(cardId)) {
    return { success: false, error: 'Card not available to place' };
  }
  
  // Check row capacity
  const maxCards = row === 'top' ? 3 : 5;
  if (player.hand[row].length >= maxCards) {
    return { success: false, error: `${row} row is full` };
  }
  
  const newHand: OFCHand = {
    ...player.hand,
    [row]: [...player.hand[row], cardId]
  };
  
  const newCardsToPlace = player.cardsToPlace.filter(c => c !== cardId);
  const isComplete = 
    newHand.top.length === 3 && 
    newHand.middle.length === 5 && 
    newHand.bottom.length === 5;
  
  const newPlayer: OFCPlayerState = {
    ...player,
    hand: newHand,
    cardsToPlace: newCardsToPlace,
    isComplete
  };
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = newPlayer;
  
  // Check if all players need more cards or if round is complete
  const allPlayersComplete = newPlayers.every(p => p.isComplete);
  const allCardsPlaced = newPlayers.every(p => p.cardsToPlace.length === 0);
  
  let newState: OFCGameState = {
    ...state,
    players: newPlayers,
    lastAction: `${player.name} placed ${cardId} on ${row}`
  };
  
  // Deal more cards if needed
  if (allCardsPlaced && !allPlayersComplete) {
    newState = ofcDealNextCards(newState);
  }
  
  // Score if all complete
  if (allPlayersComplete) {
    return scoreOFCRound(newState);
  }
  
  return {
    success: true,
    newState,
    roundComplete: allCardsPlaced && !allPlayersComplete
  };
}

// ==========================================
// PINEAPPLE DISCARD
// ==========================================
export function ofcPineappleDiscard(
  state: OFCGameState,
  playerId: string,
  cardToDiscard: string
): OFCActionResult {
  if (state.variant !== 'pineapple') {
    return { success: false, error: 'Not pineapple variant' };
  }
  
  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    return { success: false, error: 'Player not found' };
  }
  
  const player = state.players[playerIndex];
  
  if (!player.cardsToPlace.includes(cardToDiscard)) {
    return { success: false, error: 'Card not available' };
  }
  
  if (player.cardsToPlace.length !== 3) {
    return { success: false, error: 'Must have 3 cards to discard' };
  }
  
  const newCardsToPlace = player.cardsToPlace.filter(c => c !== cardToDiscard);
  
  const newPlayer: OFCPlayerState = {
    ...player,
    cardsToPlace: newCardsToPlace
  };
  
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = newPlayer;
  
  return {
    success: true,
    newState: {
      ...state,
      players: newPlayers,
      lastAction: `${player.name} discarded a card`
    }
  };
}

// ==========================================
// DEAL NEXT CARDS
// ==========================================
function ofcDealNextCards(state: OFCGameState): OFCGameState {
  let deckIndex = 0;
  const cardsPerPlayer = state.variant === 'pineapple' ? 3 : 1;
  
  const newPlayers = state.players.map(player => {
    if (player.isComplete) return player;
    
    const newCards = state.deck.slice(deckIndex, deckIndex + cardsPerPlayer);
    deckIndex += cardsPerPlayer;
    
    return {
      ...player,
      cardsToPlace: [...player.cardsToPlace, ...newCards]
    };
  });
  
  return {
    ...state,
    players: newPlayers,
    deck: state.deck.slice(deckIndex),
    round: state.round + 1
  };
}

// ==========================================
// HAND EVALUATION
// ==========================================
export interface OFCHandEvaluation {
  top: HandResult;
  middle: HandResult;
  bottom: HandResult;
  isFoul: boolean;
  royalties: { top: number; middle: number; bottom: number };
  qualifiesForFantasyland: boolean;
  fantasylandCards: number;
}

export function evaluateOFCHand(hand: OFCHand): OFCHandEvaluation {
  const topEval = evaluateHand(hand.top, []);
  const middleEval = evaluateHand(hand.middle, []);
  const bottomEval = evaluateHand(hand.bottom, []);
  
  // Check for foul: bottom >= middle >= top
  const isFoul = 
    compareHands(bottomEval, middleEval) < 0 ||
    compareHands(middleEval, topEval) < 0;
  
  // Calculate royalties
  let topRoyalty = 0;
  if (!isFoul && hand.top.length === 3) {
    // Check for pairs and trips in top row
    const values = hand.top.map(c => c[0]);
    const counts = new Map<string, number>();
    values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    
    for (const [rank, count] of counts) {
      if (count === 2) {
        const key = rank + rank;
        topRoyalty = OFC_TOP_ROYALTIES[key] || 0;
      } else if (count === 3) {
        const key = rank + rank + rank;
        topRoyalty = OFC_TOP_ROYALTIES[key] || 0;
      }
    }
  }
  
  const middleRoyalty = isFoul ? 0 : (OFC_MIDDLE_ROYALTIES[middleEval.handRank] || 0);
  const bottomRoyalty = isFoul ? 0 : (OFC_BOTTOM_ROYALTIES[bottomEval.handRank] || 0);
  
  // Fantasyland qualification: QQ+ on top without fouling
  let qualifiesForFantasyland = false;
  let fantasylandCards = 0;
  
  if (!isFoul && hand.top.length === 3) {
    const values = hand.top.map(c => RANK_VALUES[c[0]]);
    const counts = new Map<number, number>();
    values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    
    for (const [rankValue, count] of counts) {
      if (count >= 2 && rankValue >= 12) { // Q or higher pair
        qualifiesForFantasyland = true;
        if (rankValue === 12) fantasylandCards = 14; // QQ
        else if (rankValue === 13) fantasylandCards = 15; // KK
        else if (rankValue === 14) fantasylandCards = 16; // AA
      }
      if (count === 3) { // Trips on top
        qualifiesForFantasyland = true;
        fantasylandCards = 17;
      }
    }
  }
  
  return {
    top: topEval,
    middle: middleEval,
    bottom: bottomEval,
    isFoul,
    royalties: {
      top: isFoul ? 0 : topRoyalty,
      middle: middleRoyalty,
      bottom: bottomRoyalty
    },
    qualifiesForFantasyland,
    fantasylandCards
  };
}

// ==========================================
// SCORING
// ==========================================
export function calculateOFCScore(
  player1Hand: OFCHand,
  player2Hand: OFCHand
): { player1Score: number; player2Score: number } {
  const eval1 = evaluateOFCHand(player1Hand);
  const eval2 = evaluateOFCHand(player2Hand);
  
  let p1Score = 0;
  let p2Score = 0;
  
  // If one fouls, other gets 6 points + their royalties
  if (eval1.isFoul && !eval2.isFoul) {
    p2Score = 6 + eval2.royalties.top + eval2.royalties.middle + eval2.royalties.bottom;
    return { player1Score: -p2Score, player2Score: p2Score };
  }
  if (eval2.isFoul && !eval1.isFoul) {
    p1Score = 6 + eval1.royalties.top + eval1.royalties.middle + eval1.royalties.bottom;
    return { player1Score: p1Score, player2Score: -p1Score };
  }
  if (eval1.isFoul && eval2.isFoul) {
    return { player1Score: 0, player2Score: 0 };
  }
  
  // Compare each row
  let p1Wins = 0;
  let p2Wins = 0;
  
  const topComp = compareHands(eval1.top, eval2.top);
  if (topComp > 0) p1Wins++;
  else if (topComp < 0) p2Wins++;
  
  const midComp = compareHands(eval1.middle, eval2.middle);
  if (midComp > 0) p1Wins++;
  else if (midComp < 0) p2Wins++;
  
  const botComp = compareHands(eval1.bottom, eval2.bottom);
  if (botComp > 0) p1Wins++;
  else if (botComp < 0) p2Wins++;
  
  // Points for winning rows
  p1Score = p1Wins - p2Wins;
  p2Score = p2Wins - p1Wins;
  
  // Scoop bonus (winning all 3 rows = +3)
  if (p1Wins === 3) p1Score += 3;
  if (p2Wins === 3) p2Score += 3;
  
  // Add royalties
  p1Score += eval1.royalties.top + eval1.royalties.middle + eval1.royalties.bottom;
  p2Score += eval2.royalties.top + eval2.royalties.middle + eval2.royalties.bottom;
  
  // Net difference
  const netDiff = p1Score - p2Score;
  
  return {
    player1Score: netDiff,
    player2Score: -netDiff
  };
}

function scoreOFCRound(state: OFCGameState): OFCActionResult {
  const scores: { playerId: string; roundScore: number; totalScore: number }[] = [];
  
  // For 2-player game, direct comparison
  if (state.players.length === 2) {
    const result = calculateOFCScore(
      state.players[0].hand,
      state.players[1].hand
    );
    
    state.players[0].score = result.player1Score;
    state.players[0].totalScore += result.player1Score;
    state.players[1].score = result.player2Score;
    state.players[1].totalScore += result.player2Score;
    
    scores.push(
      { playerId: state.players[0].playerId, roundScore: result.player1Score, totalScore: state.players[0].totalScore },
      { playerId: state.players[1].playerId, roundScore: result.player2Score, totalScore: state.players[1].totalScore }
    );
  } else {
    // Multi-player: each player vs each other
    for (let i = 0; i < state.players.length; i++) {
      let totalRoundScore = 0;
      for (let j = 0; j < state.players.length; j++) {
        if (i !== j) {
          const result = calculateOFCScore(
            state.players[i].hand,
            state.players[j].hand
          );
          totalRoundScore += result.player1Score;
        }
      }
      state.players[i].score = totalRoundScore;
      state.players[i].totalScore += totalRoundScore;
      scores.push({
        playerId: state.players[i].playerId,
        roundScore: totalRoundScore,
        totalScore: state.players[i].totalScore
      });
    }
  }
  
  // Check for Fantasyland qualification
  for (const player of state.players) {
    const eval_ = evaluateOFCHand(player.hand);
    if (eval_.qualifiesForFantasyland) {
      player.fantasyland = true;
      player.fantasylandCards = eval_.fantasylandCards;
    }
  }
  
  return {
    success: true,
    newState: {
      ...state,
      status: 'complete'
    },
    gameComplete: true,
    scores
  };
}

// ==========================================
// START NEW ROUND
// ==========================================
export function startNewOFCRound(state: OFCGameState): OFCGameState {
  const deck = prepareDeck();
  let cardIndex = 0;
  
  const initialCards = state.variant === 'pineapple' ? 5 : 5;
  const isFantasylandRound = state.players.some(p => p.fantasyland);
  
  const newPlayers = state.players.map(player => {
    const cardsToGet = player.fantasyland ? player.fantasylandCards : initialCards;
    
    return {
      ...player,
      hand: { top: [], middle: [], bottom: [] },
      cardsToPlace: deck.slice(cardIndex, cardIndex += cardsToGet),
      isComplete: false,
      score: 0
    };
  });
  
  return {
    ...state,
    players: newPlayers,
    deck: deck.slice(cardIndex),
    round: 1,
    currentPlayerIndex: 0,
    isFantasylandRound,
    status: 'placing',
    lastAction: null
  };
}

// ==========================================
// GET GAME STATE FOR CLIENT
// ==========================================
export function getOFCPublicState(state: OFCGameState, forPlayerId?: string): object {
  return {
    id: state.id,
    variant: state.variant,
    round: state.round,
    status: state.status,
    currentPlayerIndex: state.currentPlayerIndex,
    isFantasylandRound: state.isFantasylandRound,
    lastAction: state.lastAction,
    players: state.players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      hand: p.hand,
      cardsToPlace: p.playerId === forPlayerId ? p.cardsToPlace : p.cardsToPlace.length,
      fantasyland: p.fantasyland,
      isComplete: p.isComplete,
      score: p.score,
      totalScore: p.totalScore
    }))
  };
}
