// ============================================
// FULLSCREEN POKER TABLE WRAPPER - Integration with Game Logic
// ============================================
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, VolumeX, Settings2, Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNodePokerTable, PokerPlayer, TableState } from '@/hooks/useNodePokerTable';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
import { TableSettingsPanel } from './TableSettingsPanel';
import { FullscreenPokerTable } from './FullscreenPokerTable';
import { PPPokerActionButtons } from './PPPokerActionButtons';

// Syndikate branding
import syndikateLogo from '@/assets/syndikate-logo-main.png';

interface FullscreenPokerTableWrapperProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave?: () => void;
  maxSeats?: number;
}

export function FullscreenPokerTableWrapper({
  tableId,
  playerId,
  buyIn,
  isTournament = false,
  tournamentId,
  onLeave,
  maxSeats = 6
}: FullscreenPokerTableWrapperProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const sounds = usePokerSounds();
  const hasConnectedRef = useRef(false);

  // Use Node.js WebSocket server
  const pokerTable = useNodePokerTable({ tableId, playerId, buyIn });
  
  const {
    isConnected, isConnecting, error, tableState, myCards, mySeat, myPlayer, isMyTurn, canCheck, callAmount, lastAction, showdownResult,
    connect, disconnect, joinTable, fold, check, call, raise, allIn
  } = pokerTable;
  
  // Check if player can join (not yet seated)
  const canJoinTable = useMemo(() => {
    return isConnected && !myPlayer && mySeat === null;
  }, [isConnected, myPlayer, mySeat]);

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
    return () => { disconnect(); };
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

  const handleLeave = useCallback(() => {
    disconnect();
    onLeave?.();
  }, [disconnect, onLeave]);

  const handleSeatClick = useCallback((seatNumber: number) => {
    if (canJoinTable) {
      joinTable(seatNumber);
    }
  }, [canJoinTable, joinTable]);

  const handleSettingsSave = useCallback((settings: any) => {
    console.log('Saving settings:', settings);
    setShowSettings(false);
  }, []);

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
  const minRaise = tableState?.minRaise || tableState?.bigBlindAmount || 20;
  const maxRaise = myPlayer?.stack || 10000;
  const currentBetValue = tableState?.currentBet || 0;
  const potValue = tableState?.pot || 0;
  const myBet = (myPlayer as any)?.currentBet || 0;

  // Connection status for banner
  const connectionStatus = isConnecting ? 'connecting' : (isConnected ? 'connected' : 'disconnected');

  return (
    <PokerErrorBoundary>
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d1e36] to-[#0a1628] overflow-hidden">
        {/* Connection status */}
        <ConnectionStatusBanner 
          status={connectionStatus as any}
          lastError={error || undefined}
          onReconnectNow={() => connect()}
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
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
              className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:bg-black/60"
              onClick={() => setShowSettings(true)}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main poker table */}
        <div className="absolute inset-0 pt-16 pb-32">
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

        {/* Action buttons */}
        {isMyTurn && myPlayer && (
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <PPPokerActionButtons
              isMyTurn={isMyTurn}
              canCheck={canCheck}
              callAmount={callAmount}
              minRaise={minRaise}
              maxRaise={maxRaise}
              currentBet={currentBetValue}
              pot={potValue}
              myStack={myPlayer.stack}
              myCurrentBet={myBet}
              timeRemaining={turnTimeRemaining}
              onFold={fold}
              onCheck={check}
              onCall={call}
              onRaise={raise}
              onAllIn={allIn}
            />
          </div>
        )}

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
                  className="w-full justify-start gap-3 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => { setShowMenu(false); setShowSettings(true); }}
                >
                  <Settings2 className="h-5 w-5" />
                  Настройки
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
      </div>
    </PokerErrorBoundary>
  );
}

export default FullscreenPokerTableWrapper;
