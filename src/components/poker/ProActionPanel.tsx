// Professional Poker Action Panel - PPPoker/GGPoker Style
import React, { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Minus, Plus, Check, X } from 'lucide-react';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { StraddleControls } from './StraddleControls';

interface ProActionPanelProps {
  isMyTurn: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  currentBet: number;
  pot: number;
  myStack: number;
  smallBlind: number; // For step alignment
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  disabled?: boolean;
  // Straddle props (PokerStars/PPPoker standard)
  straddleEnabled?: boolean;
  mississippiStraddleEnabled?: boolean;
  bigBlind?: number;
  phase?: string;
  handId?: string | null;
  currentPlayerSeat?: number | null;
  mySeat?: number | null;
  dealerSeat?: number | null;
  // Position info for straddle validation (industry standard)
  smallBlindSeat?: number | null;
  bigBlindSeat?: number | null;
  players?: { seatNumber: number; status?: string }[];
  onStraddleRequest?: () => void;
  autoStraddleEnabled?: boolean;
  onAutoStraddleChange?: (enabled: boolean) => void;
}

// Format chip amount
const formatAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
};

// (Timer ring removed - using SmoothAvatarTimer around the avatar instead)

// Action Button Component
const ActionButton = memo(function ActionButton({
  label,
  subLabel,
  variant,
  onClick,
  disabled = false,
  icon,
  isActive = false,
  flex = 1
}: {
  label: string;
  subLabel?: string;
  variant: 'fold' | 'check' | 'call' | 'raise' | 'allin';
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  flex?: number;
}) {
  const variants = {
    fold: {
      bg: 'from-gray-600 to-gray-700',
      hover: 'hover:from-gray-500 hover:to-gray-600',
      border: 'border-gray-500/30',
      shadow: 'shadow-gray-600/20',
      text: 'text-white/90'
    },
    check: {
      bg: 'from-blue-500 to-blue-600',
      hover: 'hover:from-blue-400 hover:to-blue-500',
      border: 'border-blue-400/30',
      shadow: 'shadow-blue-500/30',
      text: 'text-white'
    },
    call: {
      bg: 'from-emerald-500 to-emerald-600',
      hover: 'hover:from-emerald-400 hover:to-emerald-500',
      border: 'border-emerald-400/30',
      shadow: 'shadow-emerald-500/30',
      text: 'text-white'
    },
    raise: {
      bg: isActive ? 'from-amber-400 to-amber-500' : 'from-amber-500 to-amber-600',
      hover: 'hover:from-amber-400 hover:to-amber-500',
      border: 'border-amber-400/30',
      shadow: 'shadow-amber-500/30',
      text: 'text-white'
    },
    allin: {
      bg: 'from-red-500 to-red-600',
      hover: 'hover:from-red-400 hover:to-red-500',
      border: 'border-red-400/30',
      shadow: 'shadow-red-500/40',
      text: 'text-white'
    }
  };

  const v = variants[variant];

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      style={{ flex }}
      className={cn(
        "relative h-14 px-3 rounded-xl font-bold transition-all duration-150",
        "bg-gradient-to-b shadow-lg",
        "flex flex-col items-center justify-center gap-0.5",
        "border-t",
        "active:brightness-110",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        v.bg, v.hover, v.border, v.shadow, v.text
      )}
    >
      {icon ? (
        <span className="flex items-center gap-1.5">
          {icon}
          <span className="text-sm font-bold">{label}</span>
        </span>
      ) : (
        <>
          <span className="text-sm font-bold">{label}</span>
          {subLabel && (
            <span className="text-[10px] opacity-80 font-semibold">{subLabel}</span>
          )}
        </>
      )}
    </motion.button>
  );
});

// Preset Button
const PresetButton = memo(function PresetButton({
  label,
  isActive,
  onClick
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-xs font-bold transition-all",
        "border",
        isActive
          ? "bg-amber-500/20 border-amber-400 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
          : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {label}
    </button>
  );
});

// Pre-action Checkbox
const PreActionCheckbox = memo(function PreActionCheckbox({
  label,
  checked,
  onChange,
  variant
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  variant: 'fold' | 'check' | 'call' | 'callAny';
}) {
  const colors = {
    fold: { active: 'text-red-400', border: 'border-red-400', bg: 'bg-red-500' },
    check: { active: 'text-blue-400', border: 'border-blue-400', bg: 'bg-blue-500' },
    call: { active: 'text-emerald-400', border: 'border-emerald-400', bg: 'bg-emerald-500' },
    callAny: { active: 'text-amber-400', border: 'border-amber-400', bg: 'bg-amber-500' }
  };
  const c = colors[variant];

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={onChange}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          checked ? `${c.bg} ${c.border}` : "border-white/30 bg-transparent"
        )}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className={cn(
        "text-sm font-medium transition-colors",
        checked ? c.active : "text-white/60"
      )}>
        {label}
      </span>
    </label>
  );
});

export const ProActionPanel = memo(function ProActionPanel({
  isMyTurn,
  canCheck,
  callAmount,
  minRaise,
  maxRaise,
  currentBet,
  pot,
  myStack,
  smallBlind,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
  disabled = false,
  // Straddle props (PokerStars/PPPoker standard)
  straddleEnabled = false,
  mississippiStraddleEnabled = false,
  bigBlind = 20,
  phase = 'waiting',
  handId = null,
  currentPlayerSeat = null,
  mySeat = null,
  dealerSeat = null,
  // Position info for straddle validation
  smallBlindSeat = null,
  bigBlindSeat = null,
  players = [],
  onStraddleRequest,
  autoStraddleEnabled = false,
  onAutoStraddleChange
}: ProActionPanelProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showSlider, setShowSlider] = useState(false);
  const [preAction, setPreAction] = useState<'fold' | 'check' | 'call' | 'callAny' | null>(null);
  const sounds = usePokerSounds();

  // Sync raise amount with minRaise
  useEffect(() => {
    setRaiseAmount(Math.max(minRaise, Math.min(raiseAmount, maxRaise)));
  }, [minRaise, maxRaise]);

  // Close slider when turn ends
  useEffect(() => {
    if (!isMyTurn) setShowSlider(false);
  }, [isMyTurn]);

  // Execute pre-action
  useEffect(() => {
    if (isMyTurn && preAction && !disabled) {
      const timeout = setTimeout(() => {
        switch (preAction) {
          case 'fold': 
            sounds.playFold();
            onFold(); 
            break;
          case 'check': 
            if (canCheck) {
              sounds.playCheck();
              onCheck();
            }
            break;
          case 'call': 
            if (!canCheck && callAmount <= myStack) {
              sounds.playCall();
              onCall();
            }
            break;
          case 'callAny':
            if (canCheck) {
              sounds.playCheck();
              onCheck();
            } else if (callAmount <= myStack) {
              sounds.playCall();
              onCall();
            }
            break;
        }
        setPreAction(null);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isMyTurn, preAction, canCheck, callAmount, myStack, disabled, onFold, onCheck, onCall, sounds]);

  // Round to nearest small blind (all bets must be multiples of SB)
  const roundToSB = useCallback((amount: number): number => {
    const sb = smallBlind || 1;
    return Math.round(amount / sb) * sb;
  }, [smallBlind]);

  // Handle preset click - round to SB
  const handlePreset = useCallback((multiplier: number) => {
    const potBet = roundToSB(pot * multiplier);
    const clamped = Math.max(minRaise, Math.min(potBet, maxRaise));
    setRaiseAmount(roundToSB(clamped));
  }, [pot, minRaise, maxRaise, roundToSB]);

  // Handle raise confirm
  const handleRaiseConfirm = useCallback(() => {
    const finalAmount = roundToSB(Math.max(raiseAmount, minRaise));
    console.log('[ProActionPanel] handleRaiseConfirm - finalAmount:', finalAmount, 'minRaise:', minRaise, 'maxRaise:', maxRaise);
    sounds.playRaise();
    onRaise(finalAmount);
    setShowSlider(false);
  }, [raiseAmount, minRaise, maxRaise, onRaise, sounds, roundToSB]);

  // Wrapped action handlers with sounds
  const handleFold = useCallback(() => {
    sounds.playFold();
    onFold();
  }, [onFold, sounds]);

  const handleCheck = useCallback(() => {
    sounds.playCheck();
    onCheck();
  }, [onCheck, sounds]);

  const handleCall = useCallback(() => {
    sounds.playCall();
    onCall();
  }, [onCall, sounds]);

  const handleAllIn = useCallback(() => {
    sounds.playAllIn();
    onAllIn();
  }, [onAllIn, sounds]);

  // Step for slider - always equals small blind
  const step = smallBlind || 1;

  // Pre-action panel (when not my turn)
  if (!isMyTurn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--tg-safe-area-inset-bottom, 0px) + 16px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingTop: '24px'
        }}
      >
        {/* Seamless bottom scrim (NO blur; lighter so it doesn't cover hero cards) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 bottom-0 -z-0"
          style={{
            top: '-64px',
            WebkitMaskImage:
              'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
            maskImage:
              'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/25 to-transparent" />
        </div>

        <div className="relative z-10 space-y-3">
          {/* Straddle Controls - shown when straddle is enabled */}
          {(straddleEnabled || mississippiStraddleEnabled) && onStraddleRequest && onAutoStraddleChange && (
            <StraddleControls
              straddleEnabled={straddleEnabled}
              mississippiStraddleEnabled={mississippiStraddleEnabled}
              bigBlind={bigBlind}
              playerStack={myStack}
              phase={phase}
              handId={handId}
              currentPlayerSeat={currentPlayerSeat}
              mySeat={mySeat}
              dealerSeat={dealerSeat}
              smallBlindSeat={smallBlindSeat}
              bigBlindSeat={bigBlindSeat}
              players={players}
              onStraddleRequest={onStraddleRequest}
              autoStraddleEnabled={autoStraddleEnabled}
              onAutoStraddleChange={onAutoStraddleChange}
            />
          )}
          
          {/* Pre-action checkboxes */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <PreActionCheckbox
              label="Fold"
              checked={preAction === 'fold'}
              onChange={() => setPreAction(p => p === 'fold' ? null : 'fold')}
              variant="fold"
            />
            <PreActionCheckbox
              label="Check/Fold"
              checked={preAction === 'check'}
              onChange={() => setPreAction(p => p === 'check' ? null : 'check')}
              variant="check"
            />
            {callAmount > 0 && callAmount <= myStack && (
              <PreActionCheckbox
                label={`Call ${formatAmount(callAmount)}`}
                checked={preAction === 'call'}
                onChange={() => setPreAction(p => p === 'call' ? null : 'call')}
                variant="call"
              />
            )}
            <PreActionCheckbox
              label="Call Any"
              checked={preAction === 'callAny'}
              onChange={() => setPreAction(p => p === 'callAny' ? null : 'callAny')}
              variant="callAny"
            />
          </div>
          <p className="text-center text-white/40 text-xs mt-2">Ожидание хода...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--tg-safe-area-inset-bottom, 0px) + 16px)',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '24px'
      }}
    >
      {/* Seamless bottom scrim (NO blur; lighter so it doesn't cover hero cards) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 bottom-0 -z-0"
        style={{
          top: '-64px',
          WebkitMaskImage:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
          maskImage:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/25 to-transparent" />
      </div>

      <div className="relative z-10">
        <AnimatePresence>
          {showSlider && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative overflow-hidden mb-3"
            >
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10">
              {/* Presets - check if rounded value matches */}
              <div className="flex justify-center gap-2 mb-3">
                <PresetButton
                  label="1/3"
                  isActive={raiseAmount === roundToSB(pot / 3)}
                  onClick={() => handlePreset(1/3)}
                />
                <PresetButton
                  label="1/2"
                  isActive={raiseAmount === roundToSB(pot / 2)}
                  onClick={() => handlePreset(0.5)}
                />
                <PresetButton
                  label="2/3"
                  isActive={raiseAmount === roundToSB(pot * 2/3)}
                  onClick={() => handlePreset(2/3)}
                />
                <PresetButton
                  label="POT"
                  isActive={raiseAmount === roundToSB(pot)}
                  onClick={() => handlePreset(1)}
                />
              </div>

              {/* Slider with controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRaiseAmount(a => roundToSB(Math.max(minRaise, a - step)))}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-5 h-5 text-white" />
                </button>

                <div className="flex-1 relative pt-8">
                  {/* Floating bubble ABOVE slider - always visible */}
                  <div 
                    className="absolute -top-1 pointer-events-none z-10"
                    style={{
                      left: `calc(${((raiseAmount - minRaise) / Math.max(1, maxRaise - minRaise)) * 100}% - 28px)`,
                      transform: 'translateX(0)'
                    }}
                  >
                    <div className="bg-amber-500 text-white text-sm font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap min-w-[56px] text-center">
                      {formatAmount(raiseAmount)}
                    </div>
                    {/* Arrow pointing down */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-500" />
                  </div>

                  <input
                    type="range"
                    min={minRaise}
                    max={maxRaise}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(roundToSB(Number(e.target.value)))}
                    step={step}
                    className="w-full h-3 appearance-none cursor-pointer rounded-full"
                    style={{
                      background: `linear-gradient(to right, #f59e0b ${((raiseAmount - minRaise) / Math.max(1, maxRaise - minRaise)) * 100}%, rgba(255,255,255,0.2) ${((raiseAmount - minRaise) / Math.max(1, maxRaise - minRaise)) * 100}%)`
                    }}
                  />
                  
                  {/* Min/Max labels */}
                  <div className="flex justify-between mt-1 text-[10px] text-white/50">
                    <span>{formatAmount(minRaise)}</span>
                    <span>{formatAmount(maxRaise)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setRaiseAmount(a => roundToSB(Math.min(maxRaise, a + step)))}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowSlider(false)}
                className="absolute top-2 right-2 p-1 text-white/40 hover:text-white/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main action buttons - relative to appear above blur background */}
      <div className="relative flex gap-2">
        <ActionButton
          label="Fold"
          variant="fold"
          onClick={handleFold}
          disabled={disabled}
        />

        {canCheck ? (
          <ActionButton
            label="Check"
            variant="check"
            onClick={handleCheck}
            disabled={disabled}
          />
        ) : (
          <ActionButton
            label="Call"
            subLabel={formatAmount(callAmount)}
            variant="call"
            onClick={handleCall}
            disabled={disabled || callAmount > myStack}
          />
        )}

        {/* Raise/Bet button - show slider on first click, confirm on second */}
        {showSlider ? (
          // When slider is open, show CONFIRM button
          <ActionButton
            label="Confirm"
            subLabel={formatAmount(raiseAmount)}
            variant="raise"
            onClick={() => {
              console.log('[ProActionPanel] Confirm clicked, raiseAmount:', raiseAmount, 'minRaise:', minRaise, 'maxRaise:', maxRaise);
              handleRaiseConfirm();
            }}
            disabled={disabled}
            isActive={true}
          />
        ) : (
          // When slider is closed, show Raise/Bet button
          // Disable only if player can't afford minimum raise
          // minRaise is TOTAL amount, myStack is what player has left
          // Player can raise if: minRaise <= myStack (since we send TOTAL to server)
          <ActionButton
            label={currentBet > 0 ? "Raise" : "Bet"}
            variant="raise"
            onClick={() => {
              console.log('[ProActionPanel] Raise/Bet clicked, opening slider. minRaise:', minRaise, 'maxRaise:', maxRaise, 'myStack:', myStack, 'currentBet:', currentBet);
              setShowSlider(true);
            }}
            disabled={disabled || minRaise > maxRaise}
          />
        )}

        <ActionButton
          label="All-In"
          subLabel={formatAmount(myStack)}
          variant="allin"
          onClick={handleAllIn}
          disabled={disabled}
          icon={<Zap className="w-4 h-4" />}
          flex={0.8}
        />
      </div>

      {/* Stack info */}
      <div className="flex justify-center mt-2">
        <span className="text-white/50 text-xs">
          Стек: <span className="text-amber-400 font-bold">{formatAmount(myStack)}</span>
        </span>
      </div>
    </div>
  </motion.div>
);
});

export default ProActionPanel;
