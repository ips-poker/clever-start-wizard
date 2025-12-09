/**
 * Poker Engine - Core game logic
 * Lightweight version for Node.js server
 */

import { Player, HandState } from './PokerTable.js';

// Card constants
const SUITS = ['h', 'd', 'c', 's'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export interface ActionResult {
  success: boolean;
  error?: string;
  amount?: number;
  isAllIn?: boolean;
  isFolded?: boolean;
  handComplete?: boolean;
  phaseAdvanced?: boolean;
  newHandState?: HandState;
  winners?: { playerId: string; amount: number; handName: string }[];
}

export class PokerEngine {
  
  /**
   * Create and shuffle a deck
   */
  createDeck(): string[] {
    const deck: string[] = [];
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        deck.push(rank + suit);
      }
    }
    return this.shuffleDeck(deck);
  }
  
  /**
   * Cryptographically secure shuffle using Fisher-Yates
   */
  shuffleDeck(deck: string[]): string[] {
    const shuffled = [...deck];
    const randomBytes = new Uint32Array(shuffled.length);
    crypto.getRandomValues(randomBytes);
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Use rejection sampling to avoid modulo bias
      const maxValid = Math.floor(0xFFFFFFFF / (i + 1)) * (i + 1) - 1;
      let randomValue = randomBytes[i];
      
      while (randomValue > maxValid) {
        const newRandom = new Uint32Array(1);
        crypto.getRandomValues(newRandom);
        randomValue = newRandom[0];
      }
      
      const j = randomValue % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }
  
  /**
   * Deal cards from deck (public method)
   */
  dealCards(deck: string[], count: number): string[] {
    return deck.splice(0, count);
  }
  
  /**
   * Initialize a new hand
   */
  initializeHand(
    tableId: string,
    handNumber: number,
    players: Player[],
    dealerSeat: number,
    smallBlind: number,
    bigBlind: number,
    ante: number = 0
  ): HandState {
    const deck = this.createDeck();
    
    // Find SB and BB positions
    const activePlayers = players.filter(p => !p.isFolded);
    const seatNumbers = activePlayers.map(p => p.seatNumber).sort((a, b) => a - b);
    
    const headsUp = activePlayers.length === 2;
    
    // Get next seat after dealer
    const getNextSeat = (fromSeat: number): number => {
      for (let i = 1; i <= seatNumbers.length; i++) {
        const nextIdx = seatNumbers.findIndex(s => s > fromSeat);
        if (nextIdx !== -1) return seatNumbers[nextIdx];
      }
      return seatNumbers[0];
    };
    
    let sbSeat: number, bbSeat: number, utgSeat: number;
    
    if (headsUp) {
      // Heads-up: Dealer posts SB
      sbSeat = dealerSeat;
      bbSeat = getNextSeat(dealerSeat);
      utgSeat = dealerSeat; // Dealer acts first preflop
    } else {
      sbSeat = getNextSeat(dealerSeat);
      bbSeat = getNextSeat(sbSeat);
      utgSeat = getNextSeat(bbSeat);
    }
    
    // Post blinds
    const sbPlayer = activePlayers.find(p => p.seatNumber === sbSeat);
    const bbPlayer = activePlayers.find(p => p.seatNumber === bbSeat);
    
    if (sbPlayer) {
      const sbAmount = Math.min(smallBlind, sbPlayer.stack);
      sbPlayer.currentBet = sbAmount;
      sbPlayer.stack -= sbAmount;
      if (sbPlayer.stack === 0) sbPlayer.isAllIn = true;
    }
    
    if (bbPlayer) {
      const bbAmount = Math.min(bigBlind, bbPlayer.stack);
      bbPlayer.currentBet = bbAmount;
      bbPlayer.stack -= bbAmount;
      if (bbPlayer.stack === 0) bbPlayer.isAllIn = true;
    }
    
    // Post antes
    for (const player of activePlayers) {
      if (ante > 0) {
        const anteAmount = Math.min(ante, player.stack);
        player.currentBet += anteAmount;
        player.stack -= anteAmount;
        if (player.stack === 0) player.isAllIn = true;
      }
    }
    
    const totalAnte = activePlayers.length * ante;
    const initialPot = smallBlind + bigBlind + totalAnte;
    
    return {
      id: crypto.randomUUID(),
      handNumber,
      phase: 'preflop',
      pot: initialPot,
      communityCards: [],
      currentBet: bigBlind,
      dealerSeat,
      smallBlindSeat: sbSeat,
      bigBlindSeat: bbSeat,
      currentPlayerSeat: utgSeat,
      lastAggressor: null,
      minRaise: bigBlind,
      bigBlind, // Store BB for postflop min bet
      sidePots: [],
      deck,
      actionStartTime: null,
      playersActedThisRound: new Set<string>() // Track actions per round
    };
  }
  
  /**
   * Process a player action
   */
  processAction(
    handState: HandState,
    players: Player[],
    playerId: string,
    actionType: string,
    amount?: number
  ): ActionResult {
    const player = players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    switch (actionType.toLowerCase()) {
      case 'fold':
        return this.processFold(handState, player, players);
      
      case 'check':
        return this.processCheck(handState, player, players);
      
      case 'call':
        return this.processCall(handState, player, players);
      
      case 'bet':
      case 'raise':
        return this.processBetRaise(handState, player, players, amount || 0);
      
      case 'allin':
        return this.processAllIn(handState, player, players);
      
      default:
        return { success: false, error: 'Invalid action' };
    }
  }
  
  private processFold(handState: HandState, player: Player, players: Player[]): ActionResult {
    player.isFolded = true;
    
    // Mark player as having acted (folded players don't need to act again)
    handState.playersActedThisRound.add(player.id);
    
    const result = this.advanceAction(handState, players, player);
    return { success: true, isFolded: true, ...result };
  }
  
  private processCheck(handState: HandState, player: Player, players: Player[]): ActionResult {
    if (player.currentBet < handState.currentBet) {
      return { success: false, error: 'Cannot check, must call or fold' };
    }
    
    // Mark player as having acted this round
    handState.playersActedThisRound.add(player.id);
    
    console.log('[PokerEngine] processCheck:', {
      playerId: player.id,
      seatNumber: player.seatNumber,
      playersActed: Array.from(handState.playersActedThisRound)
    });
    
    const result = this.advanceAction(handState, players, player);
    return { success: true, ...result };
  }
  
  private processCall(handState: HandState, player: Player, players: Player[]): ActionResult {
    const callAmount = handState.currentBet - player.currentBet;
    const actualAmount = Math.min(callAmount, player.stack);
    
    player.currentBet += actualAmount;
    player.stack -= actualAmount;
    handState.pot += actualAmount;
    
    if (player.stack === 0) {
      player.isAllIn = true;
    }
    
    // Mark player as having acted
    handState.playersActedThisRound.add(player.id);
    
    console.log('[PokerEngine] processCall:', {
      playerId: player.id,
      seatNumber: player.seatNumber,
      callAmount: actualAmount,
      newBet: player.currentBet,
      playersActed: Array.from(handState.playersActedThisRound)
    });
    
    const result = this.advanceAction(handState, players, player);
    return { success: true, amount: actualAmount, isAllIn: player.isAllIn, ...result };
  }
  
  private processBetRaise(handState: HandState, player: Player, players: Player[], amount: number): ActionResult {
    // Determine if this is a bet (first aggression) or raise (re-aggression)
    const isBet = handState.currentBet === 0;
    
    let minAmount: number;
    if (isBet) {
      // BET: minimum is big blind (minRaise stores BB value at start of each street)
      minAmount = handState.minRaise;
    } else {
      // RAISE: minimum is current bet + last raise size
      minAmount = handState.currentBet + handState.minRaise;
    }
    
    // Allow all-in for less than minimum
    if (amount < minAmount && amount !== player.stack + player.currentBet) {
      if (isBet) {
        return { success: false, error: `Minimum bet is ${minAmount}` };
      } else {
        return { success: false, error: `Minimum raise is ${minAmount}` };
      }
    }
    
    const raiseAmount = amount - player.currentBet;
    const actualAmount = Math.min(raiseAmount, player.stack);
    
    player.currentBet += actualAmount;
    player.stack -= actualAmount;
    handState.pot += actualAmount;
    
    // Update min raise size for next raise
    const newRaiseSize = player.currentBet - handState.currentBet;
    if (newRaiseSize > handState.minRaise) {
      handState.minRaise = newRaiseSize;
    }
    handState.currentBet = player.currentBet;
    handState.lastAggressor = player.id;
    
    // IMPORTANT: Clear playersActedThisRound for everyone, then add the raiser
    // Everyone else needs to respond to the raise
    handState.playersActedThisRound.clear();
    handState.playersActedThisRound.add(player.id);
    
    console.log('[PokerEngine] processBetRaise:', {
      playerId: player.id,
      amount: actualAmount,
      newCurrentBet: handState.currentBet,
      playersActed: Array.from(handState.playersActedThisRound)
    });
    
    if (player.stack === 0) {
      player.isAllIn = true;
    }
    
    const result = this.advanceAction(handState, players, player);
    return { success: true, amount: actualAmount, isAllIn: player.isAllIn, ...result };
  }
  
  private processAllIn(handState: HandState, player: Player, players: Player[]): ActionResult {
    const allInAmount = player.stack;
    
    player.currentBet += allInAmount;
    player.stack = 0;
    player.isAllIn = true;
    handState.pot += allInAmount;
    
    if (player.currentBet > handState.currentBet) {
      const newRaise = player.currentBet - handState.currentBet;
      if (newRaise >= handState.minRaise) {
        handState.minRaise = newRaise;
      }
      handState.currentBet = player.currentBet;
      handState.lastAggressor = player.id;
      // Clear acted set since this is a raise
      handState.playersActedThisRound.clear();
    }
    
    // Mark player as having acted
    handState.playersActedThisRound.add(player.id);
    
    const result = this.advanceAction(handState, players, player);
    return { success: true, amount: allInAmount, isAllIn: true, ...result };
  }
  
  /**
   * Advance to next player or phase
   */
  private advanceAction(handState: HandState, players: Player[], currentPlayer: Player): Partial<ActionResult> {
    const activePlayers = players.filter(p => !p.isFolded);
    
    // Check for single winner
    if (activePlayers.length === 1) {
      return {
        handComplete: true,
        newHandState: handState,
        winners: [{ playerId: activePlayers[0].id, amount: handState.pot, handName: 'Last player' }]
      };
    }
    
    // Players who can still act (not folded, not all-in)
    const canActPlayers = activePlayers.filter(p => !p.isAllIn);
    
    // Simple logic: Find players who need to act
    // A player needs to act if:
    // 1. Their bet is less than the current bet (must call/fold/raise)
    // 2. OR they haven't acted this round yet (for checks when currentBet = 0)
    const playersToAct = canActPlayers.filter(p => {
      // If player's bet is less than current bet, they MUST act
      if (p.currentBet < handState.currentBet) {
        return true;
      }
      
      // If bets are equal, player only needs to act if they haven't acted this round
      // This handles the check-around scenario
      if (!handState.playersActedThisRound.has(p.id)) {
        return true;
      }
      
      return false;
    });
    
    console.log('[PokerEngine] advanceAction:', {
      currentPlayer: currentPlayer.id,
      currentPlayerSeat: currentPlayer.seatNumber,
      currentBet: handState.currentBet,
      playersActed: Array.from(handState.playersActedThisRound),
      playersToAct: playersToAct.map(p => ({ id: p.id, seat: p.seatNumber, bet: p.currentBet })),
      canActPlayers: canActPlayers.map(p => ({ id: p.id, seat: p.seatNumber, bet: p.currentBet }))
    });
    
    if (playersToAct.length === 0) {
      // Round complete, advance phase
      console.log('[PokerEngine] All players acted, advancing phase');
      return this.advancePhase(handState, players);
    }
    
    // Find next player in seat order after current player
    const sortedSeats = canActPlayers
      .map(p => p.seatNumber)
      .sort((a, b) => a - b);
    
    // Find next seat that needs to act
    let nextSeat: number | null = null;
    
    // First, look for seats after current player
    for (const seat of sortedSeats) {
      if (seat > currentPlayer.seatNumber) {
        const player = playersToAct.find(p => p.seatNumber === seat);
        if (player) {
          nextSeat = seat;
          break;
        }
      }
    }
    
    // If not found, wrap around to beginning
    if (nextSeat === null) {
      for (const seat of sortedSeats) {
        const player = playersToAct.find(p => p.seatNumber === seat);
        if (player) {
          nextSeat = seat;
          break;
        }
      }
    }
    
    if (nextSeat !== null) {
      handState.currentPlayerSeat = nextSeat;
      console.log('[PokerEngine] Next player seat:', nextSeat);
    }
    
    return { newHandState: handState };
  }
  
  /**
   * Advance to next betting round
   */
  private advancePhase(handState: HandState, players: Player[]): Partial<ActionResult> {
    const activePlayers = players.filter(p => !p.isFolded);
    const canAct = activePlayers.filter(p => !p.isAllIn);
    
    // Reset bets for new round
    for (const player of players) {
      player.currentBet = 0;
    }
    handState.currentBet = 0;
    handState.lastAggressor = null;
    // Reset minRaise to BB for new street (min bet = BB)
    handState.minRaise = handState.bigBlind;
    // Clear players acted for new betting round
    handState.playersActedThisRound.clear();
    
    const phases = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;
    const currentIdx = phases.indexOf(handState.phase as typeof phases[number]);
    
    // If only one player can act or fewer, run out the board
    if (canAct.length <= 1) {
      // Deal remaining cards
      while (handState.communityCards.length < 5) {
        const card = handState.deck.shift()!;
        handState.communityCards.push(card);
      }
      handState.phase = 'showdown';
      return this.determineWinners(handState, players);
    }
    
    // Advance phase
    handState.phase = phases[currentIdx + 1];
    
    switch (handState.phase) {
      case 'flop':
        handState.deck.shift(); // Burn
        handState.communityCards = [
          handState.deck.shift()!,
          handState.deck.shift()!,
          handState.deck.shift()!
        ];
        break;
      
      case 'turn':
        handState.deck.shift(); // Burn
        handState.communityCards.push(handState.deck.shift()!);
        break;
      
      case 'river':
        handState.deck.shift(); // Burn
        handState.communityCards.push(handState.deck.shift()!);
        break;
      
      case 'showdown':
        return this.determineWinners(handState, players);
    }
    
    // Set first player to act post-flop
    // In heads-up: Big Blind (out of position) acts FIRST post-flop
    // In multi-way: First active player after dealer acts first
    const headsUp = canAct.length === 2;
    let firstToAct: number;
    
    if (headsUp) {
      // In heads-up, BB acts first post-flop (BB is NOT the dealer)
      // Dealer = SB, so first to act is the OTHER player (BB)
      const dealerSeat = handState.dealerSeat;
      const otherPlayer = canAct.find(p => p.seatNumber !== dealerSeat);
      firstToAct = otherPlayer ? otherPlayer.seatNumber : canAct[0].seatNumber;
    } else {
      // Multi-way: first active player after dealer
      const dealerSeat = handState.dealerSeat;
      const sortedActive = canAct.map(p => p.seatNumber).sort((a, b) => a - b);
      firstToAct = sortedActive.find(s => s > dealerSeat) || sortedActive[0];
    }
    
    handState.currentPlayerSeat = firstToAct;
    
    return { phaseAdvanced: true, newHandState: handState };
  }
  
  /**
   * Determine winners at showdown
   */
  private determineWinners(handState: HandState, players: Player[]): Partial<ActionResult> {
    const activePlayers = players.filter(p => !p.isFolded);
    
    // Evaluate hands
    const evaluations = activePlayers.map(player => ({
      playerId: player.id,
      ...this.evaluateHand([...player.holeCards, ...handState.communityCards])
    }));
    
    // Sort by hand strength
    evaluations.sort((a, b) => b.value - a.value);
    
    // Find winners (handle ties)
    const bestValue = evaluations[0].value;
    const winners = evaluations.filter(e => e.value === bestValue);
    
    const prizePerWinner = Math.floor(handState.pot / winners.length);
    
    handState.phase = 'showdown';
    
    return {
      handComplete: true,
      newHandState: handState,
      winners: winners.map(w => ({
        playerId: w.playerId,
        amount: prizePerWinner,
        handName: w.name
      }))
    };
  }
  
  /**
   * Evaluate a poker hand
   */
  evaluateHand(cards: string[]): { value: number; name: string; bestCards: string[] } {
    const allCombinations = this.getCombinations(cards, 5);
    let bestHand = { value: 0, name: 'High Card', bestCards: cards.slice(0, 5) };
    
    for (const combo of allCombinations) {
      const evaluation = this.evaluateFiveCards(combo);
      if (evaluation.value > bestHand.value) {
        bestHand = evaluation;
      }
    }
    
    return bestHand;
  }
  
  /**
   * Evaluate exactly 5 cards
   */
  private evaluateFiveCards(cards: string[]): { value: number; name: string; bestCards: string[] } {
    const ranks = cards.map(c => c[0]);
    const suits = cards.map(c => c[1]);
    
    const rankCounts = this.countRanks(ranks);
    const isFlush = new Set(suits).size === 1;
    const isStraight = this.checkStraight(ranks);
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    // Determine hand rank
    if (isFlush && isStraight) {
      const highCard = this.getHighCard(ranks);
      if (highCard === 14 && ranks.includes('K')) {
        return { value: 10000000, name: 'Royal Flush', bestCards: cards };
      }
      return { value: 9000000 + highCard, name: 'Straight Flush', bestCards: cards };
    }
    
    if (counts[0] === 4) {
      return { value: 8000000 + this.getQuadsValue(rankCounts), name: 'Four of a Kind', bestCards: cards };
    }
    
    if (counts[0] === 3 && counts[1] === 2) {
      return { value: 7000000 + this.getFullHouseValue(rankCounts), name: 'Full House', bestCards: cards };
    }
    
    if (isFlush) {
      return { value: 6000000 + this.getFlushValue(ranks), name: 'Flush', bestCards: cards };
    }
    
    if (isStraight) {
      return { value: 5000000 + this.getHighCard(ranks), name: 'Straight', bestCards: cards };
    }
    
    if (counts[0] === 3) {
      return { value: 4000000 + this.getTripsValue(rankCounts), name: 'Three of a Kind', bestCards: cards };
    }
    
    if (counts[0] === 2 && counts[1] === 2) {
      return { value: 3000000 + this.getTwoPairValue(rankCounts), name: 'Two Pair', bestCards: cards };
    }
    
    if (counts[0] === 2) {
      return { value: 2000000 + this.getPairValue(rankCounts), name: 'One Pair', bestCards: cards };
    }
    
    return { value: 1000000 + this.getFlushValue(ranks), name: 'High Card', bestCards: cards };
  }
  
  private countRanks(ranks: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const r of ranks) {
      counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }
  
  private checkStraight(ranks: string[]): boolean {
    const values = ranks.map(r => RANK_VALUES[r]).sort((a, b) => a - b);
    
    // Check for wheel (A-2-3-4-5)
    if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5)) {
      return true;
    }
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }
  
  private getHighCard(ranks: string[]): number {
    const values = ranks.map(r => RANK_VALUES[r]);
    return Math.max(...values);
  }
  
  private getFlushValue(ranks: string[]): number {
    const values = ranks.map(r => RANK_VALUES[r]).sort((a, b) => b - a);
    return values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4];
  }
  
  private getQuadsValue(rankCounts: Record<string, number>): number {
    let quads = 0, kicker = 0;
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 4) quads = RANK_VALUES[rank];
      else kicker = RANK_VALUES[rank];
    }
    return quads * 100 + kicker;
  }
  
  private getFullHouseValue(rankCounts: Record<string, number>): number {
    let trips = 0, pair = 0;
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 3) trips = RANK_VALUES[rank];
      if (count === 2) pair = RANK_VALUES[rank];
    }
    return trips * 100 + pair;
  }
  
  private getTripsValue(rankCounts: Record<string, number>): number {
    let trips = 0;
    const kickers: number[] = [];
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 3) trips = RANK_VALUES[rank];
      else kickers.push(RANK_VALUES[rank]);
    }
    kickers.sort((a, b) => b - a);
    return trips * 10000 + kickers[0] * 100 + kickers[1];
  }
  
  private getTwoPairValue(rankCounts: Record<string, number>): number {
    const pairs: number[] = [];
    let kicker = 0;
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 2) pairs.push(RANK_VALUES[rank]);
      else kicker = RANK_VALUES[rank];
    }
    pairs.sort((a, b) => b - a);
    return pairs[0] * 10000 + pairs[1] * 100 + kicker;
  }
  
  private getPairValue(rankCounts: Record<string, number>): number {
    let pair = 0;
    const kickers: number[] = [];
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count === 2) pair = RANK_VALUES[rank];
      else kickers.push(RANK_VALUES[rank]);
    }
    kickers.sort((a, b) => b - a);
    return pair * 1000000 + kickers[0] * 10000 + kickers[1] * 100 + kickers[2];
  }
  
  /**
   * Get all combinations of k elements from array
   */
  private getCombinations<T>(arr: T[], k: number): T[][] {
    const result: T[][] = [];
    
    const combine = (start: number, combo: T[]) => {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    };
    
    combine(0, []);
    return result;
  }
}
