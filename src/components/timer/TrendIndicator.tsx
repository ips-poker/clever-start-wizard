import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TrendIndicatorProps {
  currentValue: number;
  className?: string;
}

export const TrendIndicator = ({ currentValue, className = "" }: TrendIndicatorProps) => {
  const previousValue = useRef<number>(currentValue);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    if (currentValue > previousValue.current) {
      setTrend('up');
    } else if (currentValue < previousValue.current) {
      setTrend('down');
    } else {
      setTrend('stable');
    }
    
    previousValue.current = currentValue;
  }, [currentValue]);

  if (trend === 'stable') {
    return (
      <Minus 
        className={`w-5 h-5 text-[hsl(0,0%,50%)] ${className}`}
      />
    );
  }

  if (trend === 'up') {
    return (
      <TrendingUp 
        className={`w-5 h-5 text-[hsl(142,76%,45%)] animate-bounce ${className}`}
        style={{ 
          filter: 'drop-shadow(0 0 8px hsl(142,76%,45%))',
          animationDuration: '1s'
        }}
      />
    );
  }

  return (
    <TrendingDown 
      className={`w-5 h-5 text-[hsl(0,84%,55%)] animate-bounce ${className}`}
      style={{ 
        filter: 'drop-shadow(0 0 8px hsl(0,84%,55%))',
        animationDuration: '1s'
      }}
    />
  );
};
