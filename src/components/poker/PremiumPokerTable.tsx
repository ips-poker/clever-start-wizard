// =====================================================
// PREMIUM POKER TABLE - Ultra-Realistic Casino Design
// =====================================================
// Features: SVG felt with realistic texture, dynamic lighting,
// mahogany rail with grain, ambient glow, particle effects

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PremiumPokerTableProps {
  className?: string;
  feltColor?: 'green' | 'blue' | 'red' | 'purple';
  showLogo?: boolean;
  potAmount?: number;
  isActive?: boolean;
  children?: React.ReactNode;
}

// Felt color configurations
const FELT_COLORS = {
  green: {
    primary: '#1a5c3a',
    secondary: '#0d4228',
    highlight: '#2a7a52',
    glow: 'rgba(34, 197, 94, 0.15)',
    border: '#0a3520'
  },
  blue: {
    primary: '#1a3a5c',
    secondary: '#0d2842',
    highlight: '#2a527a',
    glow: 'rgba(59, 130, 246, 0.15)',
    border: '#0a2035'
  },
  red: {
    primary: '#5c1a2a',
    secondary: '#420d18',
    highlight: '#7a2a3a',
    glow: 'rgba(239, 68, 68, 0.15)',
    border: '#350a15'
  },
  purple: {
    primary: '#3a1a5c',
    secondary: '#280d42',
    highlight: '#522a7a',
    glow: 'rgba(168, 85, 247, 0.15)',
    border: '#200a35'
  }
};

// Noise texture SVG for felt grain
const FeltTextureSVG = memo(function FeltTextureSVG({ id }: { id: string }) {
  return (
    <svg className="hidden">
      <defs>
        <filter id={`felt-noise-${id}`} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
        </filter>
        <filter id={`felt-texture-${id}`}>
          <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="3" seed="15" result="turbulence" />
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="2" />
        </filter>
      </defs>
    </svg>
  );
});

// Wood grain pattern for rail
const WoodGrainPattern = memo(function WoodGrainPattern({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`wood-grain-${id}`} patternUnits="userSpaceOnUse" width="200" height="20">
        <rect width="200" height="20" fill="#2d1f14" />
        <path d="M0 5 Q50 2, 100 6 T200 5" stroke="#3d2a1a" strokeWidth="0.5" fill="none" opacity="0.6" />
        <path d="M0 10 Q60 7, 120 12 T200 10" stroke="#4a3525" strokeWidth="0.3" fill="none" opacity="0.4" />
        <path d="M0 15 Q40 13, 80 16 T200 15" stroke="#3d2a1a" strokeWidth="0.4" fill="none" opacity="0.5" />
        <path d="M0 3 Q70 1, 140 4 T200 3" stroke="#241810" strokeWidth="0.3" fill="none" opacity="0.3" />
      </pattern>
      <linearGradient id={`rail-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#5a4030" />
        <stop offset="15%" stopColor="#3d2a1a" />
        <stop offset="50%" stopColor="#2d1f14" />
        <stop offset="85%" stopColor="#3d2a1a" />
        <stop offset="100%" stopColor="#1a1008" />
      </linearGradient>
      <linearGradient id={`rail-highlight-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
        <stop offset="30%" stopColor="rgba(255,255,255,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
      </linearGradient>
    </defs>
  );
});

export const PremiumPokerTable = memo(function PremiumPokerTable({
  className,
  feltColor = 'green',
  showLogo = true,
  potAmount = 0,
  isActive = true,
  children
}: PremiumPokerTableProps) {
  const colors = FELT_COLORS[feltColor];
  const tableId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Hidden SVG patterns */}
      <FeltTextureSVG id={tableId} />
      
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${colors.glow}, transparent 70%)`
        }}
      />
      
      {/* Main table SVG */}
      <svg 
        viewBox="0 0 1000 600" 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <WoodGrainPattern id={tableId} />
        
        {/* Outer shadow */}
        <ellipse 
          cx="500" cy="310" rx="470" ry="255"
          fill="rgba(0,0,0,0.6)"
          filter="blur(20px)"
        />
        
        {/* Rail - outer mahogany border */}
        <ellipse 
          cx="500" cy="300" rx="465" ry="250"
          fill={`url(#rail-gradient-${tableId})`}
        />
        
        {/* Rail wood grain overlay */}
        <ellipse 
          cx="500" cy="300" rx="465" ry="250"
          fill={`url(#wood-grain-${tableId})`}
          opacity="0.4"
        />
        
        {/* Rail inner bevel */}
        <ellipse 
          cx="500" cy="300" rx="455" ry="240"
          fill="none"
          stroke="#1a1008"
          strokeWidth="3"
        />
        
        {/* Rail highlight */}
        <ellipse 
          cx="500" cy="300" rx="465" ry="250"
          fill={`url(#rail-highlight-${tableId})`}
        />
        
        {/* Padded arm rest area */}
        <ellipse 
          cx="500" cy="300" rx="448" ry="233"
          fill="#1a1008"
        />
        <ellipse 
          cx="500" cy="300" rx="445" ry="230"
          fill="linear-gradient(180deg, #252015 0%, #1a1510 100%)"
        />
        
        {/* Felt base */}
        <ellipse 
          cx="500" cy="300" rx="430" ry="215"
          fill={colors.secondary}
        />
        
        {/* Felt main surface with gradient */}
        <defs>
          <radialGradient id={`felt-gradient-${tableId}`} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor={colors.highlight} />
            <stop offset="40%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </radialGradient>
          
          {/* Spotlight effect */}
          <radialGradient id={`spotlight-${tableId}`} cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          
          {/* Edge shadow for depth */}
          <radialGradient id={`edge-shadow-${tableId}`} cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
          </radialGradient>
        </defs>
        
        <ellipse 
          cx="500" cy="300" rx="425" ry="210"
          fill={`url(#felt-gradient-${tableId})`}
        />
        
        {/* Felt texture overlay */}
        <ellipse 
          cx="500" cy="300" rx="425" ry="210"
          fill="transparent"
          style={{ 
            filter: `url(#felt-noise-${tableId})`,
            mixBlendMode: 'overlay' 
          }}
        />
        
        {/* Spotlight from above */}
        <ellipse 
          cx="500" cy="280" rx="300" ry="150"
          fill={`url(#spotlight-${tableId})`}
        />
        
        {/* Edge depth shadow */}
        <ellipse 
          cx="500" cy="300" rx="425" ry="210"
          fill={`url(#edge-shadow-${tableId})`}
        />
        
        {/* Betting line - outer */}
        <ellipse 
          cx="500" cy="300" rx="320" ry="150"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />
        
        {/* Betting line - inner */}
        <ellipse 
          cx="500" cy="300" rx="180" ry="90"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
          strokeDasharray="5 4"
        />
        
        {/* Center logo area glow */}
        {showLogo && (
          <>
            <ellipse 
              cx="500" cy="290" rx="80" ry="50"
              fill="rgba(0,0,0,0.15)"
            />
            {/* Logo placeholder - S for Syndikate */}
            <text 
              x="500" 
              y="310" 
              textAnchor="middle" 
              fontFamily="var(--font-display)"
              fontSize="60"
              fill="rgba(255,255,255,0.06)"
              style={{ userSelect: 'none' }}
            >
              SYNDIKATE
            </text>
          </>
        )}
        
        {/* Rail screws/studs */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x = 500 + Math.cos(rad) * 455;
          const y = 300 + Math.sin(rad) * 240;
          return (
            <g key={angle}>
              <circle cx={x} cy={y} r="6" fill="#1a1008" />
              <circle cx={x} cy={y} r="5" fill="#3d2a1a" />
              <circle cx={x} cy={y} r="4" fill="url(#rail-gradient-${tableId})" />
              <circle cx={x-1} cy={y-1} r="1.5" fill="rgba(255,255,255,0.3)" />
              {/* Screw slot */}
              <line x1={x-2} y1={y} x2={x+2} y2={y} stroke="#1a1008" strokeWidth="1" />
            </g>
          );
        })}
        
        {/* Ambient light reflections on rail */}
        <ellipse 
          cx="500" cy="120" rx="200" ry="20"
          fill="rgba(255,255,255,0.03)"
        />
        <ellipse 
          cx="200" cy="300" rx="20" ry="100"
          fill="rgba(255,255,255,0.02)"
        />
        <ellipse 
          cx="800" cy="300" rx="20" ry="100"
          fill="rgba(255,255,255,0.02)"
        />
      </svg>
      
      {/* Animated active glow effect */}
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-full"
          animate={{
            boxShadow: [
              `0 0 60px 10px ${colors.glow}`,
              `0 0 80px 20px ${colors.glow}`,
              `0 0 60px 10px ${colors.glow}`
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            left: '5%',
            right: '5%',
            top: '10%',
            bottom: '10%',
            borderRadius: '50%'
          }}
        />
      )}
      
      {/* Children overlay for seats, cards, etc */}
      <div className="absolute inset-0 pointer-events-none">
        {children}
      </div>
    </div>
  );
});

export default PremiumPokerTable;
