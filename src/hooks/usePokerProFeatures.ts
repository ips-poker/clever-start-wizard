/**
 * Hook for managing Pro poker features
 * - Rabbit Hunt
 * - Run It Twice
 * - All-In Insurance
 * - EV Cashout
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  rabbitHunt, 
  runItTwice, 
  canRunItTwice,
  calculateRabbitHuntCost,
  RabbitHuntResult,
  RunItTwiceResult 
} from '@/utils/rabbitHunt';
import { 
  calculateCashoutOffers,
  calculateInsuranceOptions,
  AllInScenario,
  CashoutOffer,
  InsuranceOption
} from '@/utils/evCashoutCalculator';
import { parseCards } from '@/utils/pokerEngine';
import { toast } from 'sonner';

export interface ProFeaturesState {
  rabbitHuntActive: boolean;
  rabbitHuntResult: RabbitHuntResult | null;
  runItTwiceActive: boolean;
  runItTwiceResult: RunItTwiceResult | null;
  insuranceModalOpen: boolean;
  cashoutModalOpen: boolean;
  currentInsuranceOptions: InsuranceOption[];
  currentCashoutOffer: CashoutOffer | null;
}

export interface UsePokerProFeaturesProps {
  playerId: string;
  playerStack: number;
  communityCards: string[];
  holeCards: string[];
  pot: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  allInPlayers: { playerId: string; name: string; cards: string[]; contribution: number }[];
  usedCards: string[];
  onChipsChange?: (amount: number) => void;
}

export function usePokerProFeatures({
  playerId,
  playerStack,
  communityCards,
  holeCards,
  pot,
  phase,
  allInPlayers,
  usedCards,
  onChipsChange
}: UsePokerProFeaturesProps) {
  const [state, setState] = useState<ProFeaturesState>({
    rabbitHuntActive: false,
    rabbitHuntResult: null,
    runItTwiceActive: false,
    runItTwiceResult: null,
    insuranceModalOpen: false,
    cashoutModalOpen: false,
    currentInsuranceOptions: [],
    currentCashoutOffer: null
  });

  // Can use rabbit hunt (only after folding, before river)
  const canRabbitHunt = useMemo(() => {
    return phase !== 'river' && phase !== 'showdown' && communityCards.length < 5;
  }, [phase, communityCards]);

  // Rabbit hunt cost
  const rabbitHuntCost = useMemo(() => {
    if (!canRabbitHunt) return 0;
    const currentPhase = communityCards.length <= 3 ? 'flop' : 'turn';
    return calculateRabbitHuntCost(pot, currentPhase);
  }, [canRabbitHunt, pot, communityCards]);

  // Can run it twice
  const canUseRunItTwice = useMemo(() => {
    return canRunItTwice(
      parseCards(communityCards.join(',')),
      allInPlayers.length,
      allInPlayers.length
    );
  }, [communityCards, allInPlayers]);

  // Calculate EV scenario for all-in situations
  const allInScenario = useMemo((): AllInScenario | null => {
    if (allInPlayers.length < 2) return null;
    if (phase === 'showdown') return null;
    
    return {
      pot,
      phase: phase as 'preflop' | 'flop' | 'turn' | 'river',
      communityCards,
      players: allInPlayers.map(p => ({
        playerId: p.playerId,
        playerName: p.name,
        cards: p.cards,
        stack: 0, // Already all-in
        contribution: p.contribution
      }))
    };
  }, [pot, phase, communityCards, allInPlayers, playerId]);

  // Calculate cashout offers
  const cashoutOffers = useMemo(() => {
    if (!allInScenario) return [];
    return calculateCashoutOffers(allInScenario);
  }, [allInScenario]);

  // My cashout offer
  const myCashoutOffer = useMemo(() => {
    return cashoutOffers.find(o => o.playerId === playerId) || null;
  }, [cashoutOffers, playerId]);

  // Insurance options
  const insuranceOptions = useMemo(() => {
    if (!myCashoutOffer || !allInScenario) return [];
    const myPlayer = allInScenario.players.find(p => p.playerId === playerId);
    if (!myPlayer) return [];
    
    return calculateInsuranceOptions(
      myCashoutOffer.currentEquity / 100,
      pot,
      myPlayer.contribution
    );
  }, [myCashoutOffer, allInScenario, pot, playerId]);

  // Purchase rabbit hunt
  const purchaseRabbitHunt = useCallback(() => {
    if (!canRabbitHunt || playerStack < rabbitHuntCost) {
      toast.error('Недостаточно фишек для rabbit hunt');
      return;
    }

    const foldedCards = parseCards(holeCards.join(','));
    const community = parseCards(communityCards.join(','));
    const used = parseCards(usedCards.join(','));
    const cardsToReveal = 5 - communityCards.length;

    const result = rabbitHunt(foldedCards, community, used, cardsToReveal);
    
    setState(prev => ({
      ...prev,
      rabbitHuntActive: true,
      rabbitHuntResult: result
    }));

    onChipsChange?.(-rabbitHuntCost);
    toast.success(`Rabbit Hunt активирован за ${rabbitHuntCost} фишек`);
  }, [canRabbitHunt, playerStack, rabbitHuntCost, holeCards, communityCards, usedCards, onChipsChange]);

  // Request run it twice
  const requestRunItTwice = useCallback(() => {
    if (!canUseRunItTwice) {
      toast.error('Run It Twice недоступен');
      return;
    }

    setState(prev => ({
      ...prev,
      runItTwiceActive: true
    }));

    toast.info('Запрос на Run It Twice отправлен');
  }, [canUseRunItTwice]);

  // Accept run it twice (both players agreed)
  const executeRunItTwice = useCallback(() => {
    if (!allInScenario || allInPlayers.length < 2) return;

    const playersMap = new Map<string, ReturnType<typeof parseCards>>();
    allInPlayers.forEach(p => {
      playersMap.set(p.playerId, parseCards(p.cards.join(',')));
    });

    const result = runItTwice(
      playersMap,
      parseCards(communityCards.join(',')),
      pot
    );

    setState(prev => ({
      ...prev,
      runItTwiceResult: result
    }));

    toast.success('Run It Twice выполнен!');
  }, [allInScenario, allInPlayers, communityCards, pot]);

  // Open insurance modal
  const openInsuranceModal = useCallback(() => {
    if (insuranceOptions.length === 0) {
      toast.error('Страхование недоступно');
      return;
    }

    setState(prev => ({
      ...prev,
      insuranceModalOpen: true,
      currentInsuranceOptions: insuranceOptions
    }));
  }, [insuranceOptions]);

  // Close insurance modal
  const closeInsuranceModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      insuranceModalOpen: false
    }));
  }, []);

  // Purchase insurance
  const purchaseInsurance = useCallback((option: InsuranceOption) => {
    if (playerStack < option.premium) {
      toast.error('Недостаточно фишек для страхования');
      return;
    }

    onChipsChange?.(-option.premium);
    closeInsuranceModal();
    toast.success(`Страхование на ${option.coverage}% приобретено за ${option.premium} фишек`);
  }, [playerStack, onChipsChange, closeInsuranceModal]);

  // Open cashout modal
  const openCashoutModal = useCallback(() => {
    if (!myCashoutOffer) {
      toast.error('EV Cashout недоступен');
      return;
    }

    setState(prev => ({
      ...prev,
      cashoutModalOpen: true,
      currentCashoutOffer: myCashoutOffer
    }));
  }, [myCashoutOffer]);

  // Close cashout modal
  const closeCashoutModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      cashoutModalOpen: false
    }));
  }, []);

  // Accept cashout
  const acceptCashout = useCallback((amount: number) => {
    onChipsChange?.(amount);
    closeCashoutModal();
    toast.success(`EV Cashout принят: +${amount.toLocaleString()} фишек`);
  }, [onChipsChange, closeCashoutModal]);

  // Reset pro features state
  const resetProFeatures = useCallback(() => {
    setState({
      rabbitHuntActive: false,
      rabbitHuntResult: null,
      runItTwiceActive: false,
      runItTwiceResult: null,
      insuranceModalOpen: false,
      cashoutModalOpen: false,
      currentInsuranceOptions: [],
      currentCashoutOffer: null
    });
  }, []);

  return {
    // State
    ...state,
    
    // Computed
    canRabbitHunt,
    rabbitHuntCost,
    canUseRunItTwice,
    allInScenario,
    cashoutOffers,
    myCashoutOffer,
    insuranceOptions,
    
    // Actions
    purchaseRabbitHunt,
    requestRunItTwice,
    executeRunItTwice,
    openInsuranceModal,
    closeInsuranceModal,
    purchaseInsurance,
    openCashoutModal,
    closeCashoutModal,
    acceptCashout,
    resetProFeatures
  };
}
