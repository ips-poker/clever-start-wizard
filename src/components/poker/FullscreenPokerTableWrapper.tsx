// ============================================
// FULLSCREEN POKER TABLE WRAPPER - Integration with Game Logic
// ============================================
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, VolumeX, Settings2, Menu, X, LogOut, Palette, RotateCcw, RotateCw, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNodePokerTable, PokerPlayer, TableState } from '@/hooks/useNodePokerTable';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { usePokerPreferences } from '@/hooks/usePokerPreferences';
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
import { TableSettingsPanel } from './TableSettingsPanel';
import { PersonalSettingsPanel } from './PersonalSettingsPanel';
import { FullscreenPokerTable } from './FullscreenPokerTable';
import { ProActionPanel } from './ProActionPanel';
import { BuyInDialog } from './BuyInDialog';
import { SeatRotationControl, getVisualPosition } from './SeatRotationControl';

// Syndikate branding
import syndikateLogo from '@/assets/syndikate-logo-main.png';

interface FullscreenPokerTableWrapperProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  minBuyIn?: number;
  maxBuyIn?: number;
  playerBalance?: number;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave?: () => void;
  onBalanceUpdate?: () => void;
  maxSeats?: number;
}

export function FullscreenPokerTableWrapper({
  tableId,
  playerId,
  buyIn,
  minBuyIn = 200,
  maxBuyIn = 2000,
  playerBalance = 10000,
  isTournament = false,
  tournamentId,
  onLeave,
  onBalanceUpdate,
  maxSeats = 6
}: FullscreenPokerTableWrapperProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  const [showBuyInDialog, setShowBuyInDialog] = useState(false);
  const [selectedSeatForJoin, setSelectedSeatForJoin] = useState<number | null>(null);
  const [isProcessingCashout, setIsProcessingCashout] = useState(false);
  const [actualBuyIn, setActualBuyIn] = useState<number>(buyIn);
  
  const { preferences, currentTableTheme, updatePreference } = usePokerPreferences();
  
  const sounds = usePokerSounds();
  const hasConnectedRef = useRef(false);

  // Use Node.js WebSocket server
  const pokerTable = useNodePokerTable({ tableId, playerId, buyIn: actualBuyIn });
  
  const {
    isConnected, isConnecting, error, tableState, myCards, mySeat, myPlayer, isMyTurn, canCheck, callAmount, lastAction, showdownResult,
    connect, disconnect, joinTable, fold, check, call, raise, allIn
  } = pokerTable;
  
  // Check if player can join (not yet seated)
  const canJoinTable = useMemo(() => {
    return isConnected && !myPlayer && mySeat === null;
  }, [isConnected, myPlayer, mySeat]);
  
  // Get occupied seats
  const occupiedSeats = useMemo(() => {
    return tableState?.players.map(p => p.seatNumber) || [];
  }, [tableState?.players]);

  useEffect(() => { sounds.setEnabled(soundEnabled); }, [soundEnabled]);

  // Timer effect
  useEffect(() => {
    const actionTimer = tableState?.actionTimer || 30;
    
    if (tableState?.timeRemaining !== null && tableState?.timeRemaining !== undefined) {
      setTurnTimeRemaining(Math.ceil(tableState.timeRemaining));
    } else if (tableState?.currentPlayerSeat !== null) {
      setTurnTimeRemaining(actionTimer);
    } else {
      setTurnTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      setTurnTimeRemaining(prev => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tableState?.currentPlayerSeat, tableState?.actionTimer, tableState?.timeRemaining]);

  // Auto-connect on mount
  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
    }
    return () => { 
      // Don't disconnect here - let handleLeave handle it
    };
  }, []);

  // Play sounds
  useEffect(() => {
    if (lastAction) {
      switch (lastAction.action) {
        case 'check': sounds.playCheck(); break;
        case 'call': sounds.playCall(); break;
        case 'raise':
        case 'bet': sounds.playRaise(); break;
        case 'fold': sounds.playFold(); break;
        case 'allin': sounds.playAllIn(); break;
      }
    }
  }, [lastAction]);

  useEffect(() => {
    if (showdownResult) { sounds.playWin(); }
  }, [showdownResult]);

  // Cashout - return diamonds when leaving table
  const performCashout = useCallback(async () => {
    if (!myPlayer || isProcessingCashout) return;
    
    setIsProcessingCashout(true);
    try {
      const stackToReturn = myPlayer.stack;
      
      if (stackToReturn > 0) {
        const { data, error: cashoutError } = await supabase.functions.invoke('poker-cashout', {
          body: {
            playerId,
            tableId,
            amount: stackToReturn,
            action: 'cashout'
          }
        });

        if (cashoutError) {
          console.error('Cashout error:', cashoutError);
          toast.error('Ошибка возврата алмазов');
        } else {
          toast.success(`Возвращено ${stackToReturn.toLocaleString()} 💎`);
          onBalanceUpdate?.();
        }
      }
    } catch (err) {
      console.error('Cashout failed:', err);
    } finally {
      setIsProcessingCashout(false);
    }
  }, [myPlayer, playerId, tableId, isProcessingCashout, onBalanceUpdate]);

  const handleLeave = useCallback(async () => {
    // Return diamonds first
    await performCashout();
    
    disconnect();
    onLeave?.();
  }, [disconnect, onLeave, performCashout]);

  // Handle seat click - show buy-in dialog for seat selection
  const handleSeatClick = useCallback((seatNumber: number) => {
    if (canJoinTable) {
      setSelectedSeatForJoin(seatNumber);
      setShowBuyInDialog(true);
    }
  }, [canJoinTable]);
  
  // Handle buy-in confirmation
  const handleBuyInConfirm = useCallback(async (seatNumber: number, buyInAmount: number) => {
    setShowBuyInDialog(false);
    
    // Deduct diamonds from wallet
    try {
      const { data, error: buyInError } = await supabase.functions.invoke('poker-cashout', {
        body: {
          playerId,
          tableId,
          amount: buyInAmount,
          action: 'buy_in'
        }
      });

      if (buyInError || data?.error) {
        toast.error(data?.error || 'Ошибка списания алмазов');
        return;
      }
      
      // Update actual buy-in for WebSocket
      setActualBuyIn(buyInAmount);
      
      // Join table with selected seat
      joinTable(seatNumber);
      toast.success(`Вход за ${buyInAmount.toLocaleString()} 💎`);
      onBalanceUpdate?.();
    } catch (err) {
      console.error('Buy-in failed:', err);
      toast.error('Ошибка входа за стол');
    }
  }, [playerId, tableId, joinTable, onBalanceUpdate]);

  const handleSettingsSave = useCallback((settings: any) => {
    console.log('Saving settings:', settings);
    setShowSettings(false);
  }, []);
  
  // Handle seat rotation change
  const handleRotationChange = useCallback((rotation: number) => {
    updatePreference('preferredSeatRotation', rotation);
  }, [updatePreference]);

  // Convert players for FullscreenPokerTable format
  const formattedPlayers: PokerPlayer[] = useMemo(() => {
    return tableState?.players || [];
  }, [tableState?.players]);

  // Find dealer/blind seats
  const dealerSeat = tableState?.dealerSeat ?? 0;
  const smallBlindSeat = tableState?.smallBlindSeat ?? 1;
  const bigBlindSeat = tableState?.bigBlindSeat ?? 2;
  const currentPlayerSeat = tableState?.currentPlayerSeat ?? null;

  // Betting info
  const minRaiseAmount = tableState?.minRaise || tableState?.bigBlindAmount || 20;
  const maxRaiseAmount = myPlayer?.stack || 10000;
  const currentBetValue = tableState?.currentBet || 0;
  const potValue = tableState?.pot || 0;
  const myBet = (myPlayer as any)?.currentBet || 0;

  // Connection status for banner
  const connectionStatus = isConnecting ? 'connecting' : (isConnected ? 'connected' : 'disconnected');

  // Apply preferences to sound
  useEffect(() => {
    setSoundEnabled(preferences.soundEnabled);
  }, [preferences.soundEnabled]);

  return (
    <PokerErrorBoundary>
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + var(--tg-safe-area-inset-top, 0px))',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--tg-safe-area-inset-bottom, 0px))'
        }}
      >
        {/* Connection status */}
        <ConnectionStatusBanner 
          status={connectionStatus as any}
          lastError={error || undefined}
          onReconnectNow={() => connect()}
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 pt-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:bg-black/60"
              onClick={() => setShowMenu(!showMenu)}
            >
              {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <img src={syndikateLogo} alt="Syndikate" className="h-8 drop-shadow-lg" />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:bg-black/60"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm text-amber-400 hover:bg-black/60"
              onClick={() => setShowPersonalSettings(true)}
            >
              <Palette className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:bg-black/60"
              onClick={() => setShowSettings(true)}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main poker table */}
        <div className="absolute inset-0 pt-20 pb-28">
          <FullscreenPokerTable
            tableState={tableState}
            players={formattedPlayers}
            heroSeat={mySeat}
            heroCards={myCards}
            communityCards={tableState?.communityCards || []}
            pot={tableState?.pot || 0}
            phase={tableState?.phase || 'waiting'}
            dealerSeat={dealerSeat}
            smallBlindSeat={smallBlindSeat}
            bigBlindSeat={bigBlindSeat}
            currentPlayerSeat={currentPlayerSeat}
            turnTimeRemaining={turnTimeRemaining || undefined}
            smallBlind={tableState?.smallBlindAmount || 10}
            bigBlind={tableState?.bigBlindAmount || 20}
            canJoinTable={canJoinTable}
            onSeatClick={handleSeatClick}
          />
        </div>

        {/* Seat rotation control - when not playing */}
        {!myPlayer && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
            <SeatRotationControl
              currentRotation={preferences.preferredSeatRotation}
              maxSeats={maxSeats}
              onChange={handleRotationChange}
            />
          </div>
        )}

        {/* Action buttons - Professional Panel */}
        {myPlayer && (
          <ProActionPanel
            isMyTurn={isMyTurn}
            canCheck={canCheck}
            callAmount={callAmount}
            minRaise={minRaiseAmount}
            maxRaise={maxRaiseAmount}
            currentBet={currentBetValue}
            pot={potValue}
            myStack={myPlayer.stack}
            timeRemaining={turnTimeRemaining || undefined}
            timeTotal={tableState?.actionTimer || 30}
            onFold={fold}
            onCheck={check}
            onCall={call}
            onRaise={raise}
            onAllIn={allIn}
          />
        )}
        
        {/* Buy-in Dialog */}
        <BuyInDialog
          isOpen={showBuyInDialog}
          onClose={() => setShowBuyInDialog(false)}
          onConfirm={handleBuyInConfirm}
          selectedSeat={selectedSeatForJoin}
          minBuyIn={minBuyIn}
          maxBuyIn={maxBuyIn}
          playerBalance={playerBalance}
          bigBlind={tableState?.bigBlindAmount || 20}
          occupiedSeats={occupiedSeats}
          maxSeats={maxSeats}
        />

        {/* Side menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="absolute left-0 top-16 bottom-0 w-64 bg-black/90 backdrop-blur-xl z-40 p-4"
            >
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  Звук {soundEnabled ? 'вкл' : 'выкл'}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  onClick={() => { setShowMenu(false); setShowPersonalSettings(true); }}
                >
                  <Palette className="h-5 w-5" />
                  Персонализация
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => { setShowMenu(false); setShowSettings(true); }}
                >
                  <Settings2 className="h-5 w-5" />
                  Настройки стола
                </Button>
                
                <div className="h-px bg-white/10 my-4" />
                
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={handleLeave}
                >
                  <LogOut className="h-5 w-5" />
                  Покинуть стол
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings panel */}
        <TableSettingsPanel
          isOpen={showSettings}
          settings={{
            smallBlind: tableState?.smallBlindAmount || 10,
            bigBlind: tableState?.bigBlindAmount || 20,
            actionTimeSeconds: tableState?.actionTimer || 15,
          }}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
          isHost={true}
        />

        {/* Personal settings panel */}
        <PersonalSettingsPanel
          isOpen={showPersonalSettings}
          onClose={() => setShowPersonalSettings(false)}
          maxSeats={maxSeats}
        />
      </div>
    </PokerErrorBoundary>
  );
}

export default FullscreenPokerTableWrapper;
