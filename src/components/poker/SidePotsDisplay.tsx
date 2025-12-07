import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';
import { SidePotsDisplay as SidePotsData } from '@/hooks/usePokerTable';
import { motion, AnimatePresence } from 'framer-motion';

interface SidePotsDisplayProps {
  sidePots?: SidePotsData;
  className?: string;
}

export function SidePotsDisplay({ sidePots, className }: SidePotsDisplayProps) {
  if (!sidePots || sidePots.totalPot === 0) return null;
  
  const hasSidePots = sidePots.sidePots.length > 0;

  return (
    <div className={className}>
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          {/* Main Pot */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-600/80 to-yellow-600/80 shadow-lg">
            <Coins className="h-5 w-5 text-yellow-200" />
            <span className="font-bold text-white text-lg">
              {sidePots.mainPot.amount.toLocaleString()}
            </span>
            {hasSidePots && (
              <Badge variant="secondary" className="text-xs ml-1">
                Main
              </Badge>
            )}
          </div>

          {/* Side Pots */}
          {hasSidePots && (
            <div className="flex flex-wrap gap-2 justify-center">
              {sidePots.sidePots.map((pot, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/70 to-indigo-600/70 shadow-md"
                >
                  <Coins className="h-4 w-4 text-blue-200" />
                  <span className="font-semibold text-white text-sm">
                    {pot.amount.toLocaleString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-white/30 text-white/80">
                    Side {index + 1}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}

          {/* Total */}
          {hasSidePots && (
            <div className="text-xs text-muted-foreground">
              Всего: <span className="font-semibold">{sidePots.totalPot.toLocaleString()}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
