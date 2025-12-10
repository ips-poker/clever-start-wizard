/**
 * Seat Rotation Control - Change visual perspective without changing actual positions
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RotateCcw, RotateCw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeatRotationControlProps {
  currentRotation: number;
  maxSeats: number;
  onChange: (rotation: number) => void;
  className?: string;
}

export function SeatRotationControl({
  currentRotation,
  maxSeats,
  onChange,
  className
}: SeatRotationControlProps) {
  const rotateLeft = () => {
    onChange((currentRotation - 1 + maxSeats) % maxSeats);
  };

  const rotateRight = () => {
    onChange((currentRotation + 1) % maxSeats);
  };

  const resetRotation = () => {
    onChange(0);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60"
        onClick={rotateLeft}
        title="Повернуть влево"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-full">
        <Eye className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs text-white/70">Вид</span>
        <span className="text-xs text-amber-400 font-medium">{currentRotation + 1}</span>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60"
        onClick={rotateRight}
        title="Повернуть вправо"
      >
        <RotateCw className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Apply seat rotation to visual positions
 * This rotates the visual display so the player's preferred seat appears at the bottom
 */
export function applyRotation(
  seatNumber: number, 
  heroSeat: number | null, 
  preferredRotation: number, 
  maxSeats: number
): number {
  if (heroSeat === null) {
    // No hero, use preferred rotation directly
    return (seatNumber - preferredRotation + maxSeats) % maxSeats;
  }
  
  // Rotate so hero always appears at position 0 (bottom center)
  // Then apply additional preferred rotation
  const heroOffset = heroSeat;
  const rotatedSeat = (seatNumber - heroOffset + maxSeats) % maxSeats;
  
  // Apply additional rotation preference (for those who want different viewing angle)
  return (rotatedSeat - preferredRotation + maxSeats) % maxSeats;
}

/**
 * Get visual position index for a seat
 * Hero is always at bottom (visual position 0)
 * Other players are arranged around the table relative to hero
 */
export function getVisualPosition(
  seatNumber: number,
  heroSeat: number | null,
  preferredRotation: number,
  maxSeats: number
): number {
  if (heroSeat === null) {
    // No hero seated yet - use preferred rotation
    return (seatNumber - preferredRotation + maxSeats) % maxSeats;
  }
  
  // Calculate position relative to hero
  // Hero should be at visual position 0 (bottom)
  const heroOffset = heroSeat - preferredRotation;
  return (seatNumber - heroOffset + maxSeats) % maxSeats;
}
