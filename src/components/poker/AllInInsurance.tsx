import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, TrendingUp, Coins, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsuranceOption {
  coverage: number; // Amount to insure
  premium: number; // Cost of insurance
  payout: number; // Amount received if lose
  odds: number; // Odds of winning
}

interface AllInInsuranceProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (coverage: number) => void;
  potAmount: number;
  playerEquity: number; // 0-100
  maxInsurable: number;
  playerStack: number;
  communityCards: string[];
  holeCards: string[];
  opponentCards?: string[];
  className?: string;
}

export const AllInInsurance: React.FC<AllInInsuranceProps> = ({
  isOpen,
  onClose,
  onPurchase,
  potAmount,
  playerEquity,
  maxInsurable,
  playerStack,
  communityCards,
  holeCards,
  opponentCards,
  className
}) => {
  const [coveragePercent, setCoveragePercent] = useState(50);
  
  // Calculate insurance parameters
  const insuranceCalc = useMemo(() => {
    const coverageAmount = Math.floor(maxInsurable * (coveragePercent / 100));
    
    // Premium calculation based on equity
    // If you have 70% equity, you pay 30% premium (inverse of losing odds)
    const loseOdds = 100 - playerEquity;
    const premiumRate = Math.max(5, Math.min(50, loseOdds * 1.1)); // 5-50% range with slight house edge
    const premium = Math.floor(coverageAmount * (premiumRate / 100));
    
    // Payout is coverage amount minus premium (net gain if you lose)
    const payout = coverageAmount;
    
    // Expected value calculation
    const evWithInsurance = (playerEquity / 100) * potAmount + 
                            ((100 - playerEquity) / 100) * (payout - premium);
    const evWithoutInsurance = (playerEquity / 100) * potAmount;
    const evDifference = evWithInsurance - evWithoutInsurance;
    
    return {
      coverageAmount,
      premium,
      payout,
      premiumRate,
      evWithInsurance,
      evWithoutInsurance,
      evDifference,
      isPositiveEV: evDifference > 0
    };
  }, [coveragePercent, maxInsurable, playerEquity, potAmount]);

  // Quick insurance options
  const quickOptions: { label: string; percent: number }[] = [
    { label: '25%', percent: 25 },
    { label: '50%', percent: 50 },
    { label: '75%', percent: 75 },
    { label: '100%', percent: 100 }
  ];

  const canAffordPremium = playerStack >= insuranceCalc.premium;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={cn("w-full max-w-md mx-4", className)}
        >
          <Card className="border-amber-500/30 bg-gradient-to-br from-background via-background to-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-amber-500" />
                  All-In Insurance
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Equity Display */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="text-sm text-muted-foreground">Ваш эквити</div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${playerEquity}%` }}
                      className={cn(
                        "h-full rounded-full",
                        playerEquity > 60 ? "bg-green-500" :
                        playerEquity > 40 ? "bg-amber-500" : "bg-red-500"
                      )}
                    />
                  </div>
                  <span className="font-bold text-lg">{playerEquity.toFixed(1)}%</span>
                </div>
              </div>

              {/* Pot Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted/30">
                  <div className="text-muted-foreground text-xs">Банк</div>
                  <div className="font-bold flex items-center gap-1">
                    <Coins className="h-3 w-3 text-amber-500" />
                    {potAmount.toLocaleString()}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <div className="text-muted-foreground text-xs">Макс. страховка</div>
                  <div className="font-bold flex items-center gap-1">
                    <Shield className="h-3 w-3 text-blue-500" />
                    {maxInsurable.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Coverage Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Покрытие страховки</span>
                  <span className="font-bold">{coveragePercent}%</span>
                </div>
                <Slider
                  value={[coveragePercent]}
                  onValueChange={([val]) => setCoveragePercent(val)}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
                
                {/* Quick Options */}
                <div className="flex gap-2">
                  {quickOptions.map(opt => (
                    <Button
                      key={opt.percent}
                      variant={coveragePercent === opt.percent ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCoveragePercent(opt.percent)}
                      className="flex-1 text-xs"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Insurance Summary */}
              <div className="p-3 rounded-lg border border-border/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Сумма покрытия</span>
                  <span className="font-medium">{insuranceCalc.coverageAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Премия ({insuranceCalc.premiumRate.toFixed(1)}%)
                  </span>
                  <span className={cn(
                    "font-medium",
                    !canAffordPremium && "text-destructive"
                  )}>
                    -{insuranceCalc.premium.toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Выплата при проигрыше</span>
                  <span className="font-bold text-green-500">
                    +{insuranceCalc.payout.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* EV Analysis */}
              <div className={cn(
                "p-3 rounded-lg flex items-start gap-2",
                insuranceCalc.isPositiveEV ? "bg-green-500/10 border border-green-500/30" : 
                "bg-amber-500/10 border border-amber-500/30"
              )}>
                {insuranceCalc.isPositiveEV ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                )}
                <div className="text-xs">
                  <div className={cn(
                    "font-medium",
                    insuranceCalc.isPositiveEV ? "text-green-500" : "text-amber-500"
                  )}>
                    {insuranceCalc.isPositiveEV ? '+EV страховка' : 'Нейтральная/−EV страховка'}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    Разница EV: {insuranceCalc.evDifference > 0 ? '+' : ''}{insuranceCalc.evDifference.toFixed(0)} фишек
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Отказаться
                </Button>
                <Button
                  onClick={() => onPurchase(insuranceCalc.coverageAmount)}
                  disabled={!canAffordPremium}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Застраховать
                </Button>
              </div>

              {!canAffordPremium && (
                <p className="text-xs text-destructive text-center">
                  Недостаточно фишек для оплаты премии
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AllInInsurance;
