/**
 * EV Cashout Panel Component
 * Professional all-in insurance interface similar to GGPoker
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Check,
  X,
  Percent,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CashoutOffer, 
  InsuranceOption,
  calculateCashoutOffers,
  calculateInsuranceOptions,
  formatChips,
  AllInScenario
} from '@/utils/evCashoutCalculator';

interface EVCashoutPanelProps {
  scenario: AllInScenario;
  playerId: string;
  onAcceptCashout?: (amount: number) => void;
  onDeclineCashout?: () => void;
  onBuyInsurance?: (option: InsuranceOption) => void;
  className?: string;
}

export function EVCashoutPanel({
  scenario,
  playerId,
  onAcceptCashout,
  onDeclineCashout,
  onBuyInsurance,
  className = ''
}: EVCashoutPanelProps) {
  
  const offers = useMemo(() => {
    return calculateCashoutOffers(scenario);
  }, [scenario]);
  
  const myOffer = useMemo(() => {
    return offers.find(o => o.playerId === playerId);
  }, [offers, playerId]);
  
  const insuranceOptions = useMemo(() => {
    if (!myOffer) return [];
    const myPlayer = scenario.players.find(p => p.playerId === playerId);
    if (!myPlayer) return [];
    
    return calculateInsuranceOptions(
      myOffer.currentEquity / 100,
      scenario.pot,
      myPlayer.contribution
    );
  }, [myOffer, scenario, playerId]);
  
  if (!myOffer || scenario.phase === 'river') {
    return null;
  }
  
  const equityColor = myOffer.currentEquity > 60 ? 'text-green-400' :
                      myOffer.currentEquity > 40 ? 'text-yellow-400' : 'text-red-400';
  
  const recommendationConfig = {
    accept: { color: 'bg-green-500/20 border-green-500/50 text-green-400', icon: Check, text: 'Рекомендуем принять' },
    decline: { color: 'bg-red-500/20 border-red-500/50 text-red-400', icon: X, text: 'Рекомендуем отказаться' },
    neutral: { color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400', icon: AlertCircle, text: 'На ваше усмотрение' }
  };
  
  const recConfig = recommendationConfig[myOffer.recommendation];
  const RecIcon = recConfig.icon;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`
          ${className}
          bg-gradient-to-br from-black/95 to-gray-900/95
          backdrop-blur-xl rounded-xl
          border border-border/50
          shadow-2xl shadow-black/50
          overflow-hidden
          max-w-md
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-border/30">
          <div className="p-2 rounded-full bg-amber-500/20">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">EV Cashout</h3>
            <p className="text-xs text-muted-foreground">All-In страхование</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-mono text-amber-400">
              {formatChips(scenario.pot)}
            </span>
          </div>
        </div>
        
        {/* Equity Display */}
        <div className="p-4 space-y-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Ваше эквити</div>
            <div className={`text-4xl font-bold ${equityColor}`}>
              {myOffer.currentEquity.toFixed(1)}%
            </div>
            <Progress 
              value={myOffer.currentEquity} 
              className="h-2 mt-2"
            />
          </div>
          
          {/* Cashout Offer */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ваша доля банка:</span>
              <span className="font-mono text-foreground">{formatChips(Math.floor(myOffer.potShare))}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Предложение Cashout:</span>
              <span className="font-mono text-lg text-green-400 font-bold">
                {formatChips(myOffer.cashoutAmount)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Комиссия:</span>
              <span className="text-red-400">
                -{formatChips(Math.floor(myOffer.potShare - myOffer.cashoutAmount))} 
                ({((1 - myOffer.cashoutAmount / myOffer.potShare) * 100).toFixed(1)}%)
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Снижение риска:</span>
              <span className="text-blue-400">
                {myOffer.riskReduction.toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* Recommendation */}
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${recConfig.color}`}>
            <RecIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{recConfig.text}</span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={onDeclineCashout}
            >
              <X className="w-4 h-4 mr-2" />
              Отказаться
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
              onClick={() => onAcceptCashout?.(myOffer.cashoutAmount)}
            >
              <Check className="w-4 h-4 mr-2" />
              Принять {formatChips(myOffer.cashoutAmount)}
            </Button>
          </div>
        </div>
        
        {/* Insurance Options */}
        {insuranceOptions.length > 0 && (
          <div className="border-t border-border/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Страхование рук</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {insuranceOptions.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onBuyInsurance?.(option)}
                  className={`
                    p-3 rounded-lg border text-center transition-colors
                    ${option.ev > 0 
                      ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20' 
                      : 'border-border/50 bg-muted/30 hover:bg-muted/50'}
                  `}
                >
                  <div className="text-xs text-muted-foreground">
                    {option.coverage}% покрытие
                  </div>
                  <div className="text-sm font-bold text-foreground mt-1">
                    {formatChips(option.premium)}
                  </div>
                  <div className={`text-xs mt-1 ${option.ev > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    EV: {option.ev > 0 ? '+' : ''}{formatChips(option.ev)}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
        
        {/* Other Players Equity */}
        <div className="border-t border-border/30 p-4">
          <div className="text-xs text-muted-foreground mb-2">Эквити соперников</div>
          <div className="space-y-2">
            {offers.filter(o => o.playerId !== playerId).map((offer) => (
              <div key={offer.playerId} className="flex items-center justify-between">
                <span className="text-sm truncate max-w-[120px]">{offer.playerName}</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={offer.currentEquity} 
                    className="w-20 h-1.5"
                  />
                  <span className={`text-xs font-mono w-12 text-right ${
                    offer.currentEquity > myOffer.currentEquity ? 'text-red-400' : 'text-muted-foreground'
                  }`}>
                    {offer.currentEquity.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact EV indicator for table display
 */
export function EVIndicator({ 
  equity, 
  potShare,
  className = '' 
}: { 
  equity: number;
  potShare: number;
  className?: string;
}) {
  const color = equity > 60 ? 'text-green-400' : 
                equity > 40 ? 'text-yellow-400' : 'text-red-400';
  
  return (
    <div className={`${className} flex items-center gap-2 text-xs`}>
      <Percent className={`w-3 h-3 ${color}`} />
      <span className={color}>{equity.toFixed(1)}%</span>
      <span className="text-muted-foreground">
        ({formatChips(Math.floor(potShare))})
      </span>
    </div>
  );
}
