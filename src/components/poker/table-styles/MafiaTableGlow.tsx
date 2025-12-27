// ============================================
// MAFIA TABLE GLOW - Classic Crime Family Style
// ============================================
// Элегантный стиль с золотыми акцентами и тёмной атмосферой

import React, { memo } from 'react';

interface MafiaTableGlowProps {
  intensity?: number;
  tableInsets?: {
    top: string;
    left: string;
    right: string;
    bottom: string;
  };
}

export const MafiaTableGlow = memo(function MafiaTableGlow({
  intensity = 0.8,
  tableInsets = { top: '6%', left: '20%', right: '20%', bottom: '6%' }
}: MafiaTableGlowProps) {
  
  const goldPrimary = '#d4a574';
  const goldSecondary = '#8b6914';
  const crimson = '#8b0000';
  
  const glowOpacity = intensity * 0.5;
  const accentOpacity = intensity * 0.7;
  
  return (
    <>
      {/* Fullscreen background is rendered by TableGlowFullscreenBackground at wrapper level */}

      {/* === GOLD OUTER RING === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 1%)`,
          left: `calc(${tableInsets.left} - 1%)`,
          right: `calc(${tableInsets.right} - 1%)`,
          bottom: `calc(${tableInsets.bottom} - 1%)`,
          borderRadius: '46% / 23%',
          boxShadow: `
            0 0 30px ${goldPrimary}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')},
            0 0 60px ${goldSecondary}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')},
            inset 0 0 20px ${goldPrimary}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')}
          `,
          border: `2px solid ${goldPrimary}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === INNER CRIMSON ACCENT === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 2%)`,
          left: `calc(${tableInsets.left} + 2%)`,
          right: `calc(${tableInsets.right} + 2%)`,
          bottom: `calc(${tableInsets.bottom} + 2%)`,
          borderRadius: '40% / 18%',
          boxShadow: `inset 0 0 30px ${crimson}${Math.round(glowOpacity * 0.3 * 255).toString(16).padStart(2, '0')}`,
          border: `1px solid ${crimson}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === CORNER ORNAMENTS === */}
      {[
        { top: tableInsets.top, left: tableInsets.left },
        { top: tableInsets.top, right: tableInsets.right },
        { bottom: tableInsets.bottom, left: tableInsets.left },
        { bottom: tableInsets.bottom, right: tableInsets.right }
      ].map((pos, i) => (
        <div 
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...pos,
            width: '50px',
            height: '50px',
            transform: `rotate(${i * 90}deg)`
          }}
        >
          <svg viewBox="0 0 50 50" className="w-full h-full">
            <path 
              d="M5 25 Q5 5 25 5 M8 25 Q8 8 25 8" 
              stroke={goldPrimary} 
              strokeWidth="1.5" 
              fill="none"
              opacity={accentOpacity}
            />
            <circle cx="8" cy="8" r="3" fill={goldPrimary} opacity={accentOpacity * 0.8} />
          </svg>
        </div>
      ))}
      
      {/* === CENTER SPOTLIGHT === */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '50%',
          height: '35%',
          background: `radial-gradient(ellipse, ${goldPrimary}${Math.round(glowOpacity * 0.12 * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: 'blur(30px)'
        }}
      />
      
      {/* === SIDE ACCENT LINES === */}
      <div 
        className="absolute pointer-events-none h-px"
        style={{
          top: '50%',
          left: `calc(${tableInsets.left} + 5%)`,
          width: '15%',
          background: `linear-gradient(90deg, ${goldPrimary}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')}, transparent)`
        }}
      />
      <div 
        className="absolute pointer-events-none h-px"
        style={{
          top: '50%',
          right: `calc(${tableInsets.right} + 5%)`,
          width: '15%',
          background: `linear-gradient(-90deg, ${goldPrimary}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')}, transparent)`
        }}
      />
      
      {/* === DIAMOND PATTERN OVERLAY === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: tableInsets.top,
          left: tableInsets.left,
          right: tableInsets.right,
          bottom: tableInsets.bottom,
          borderRadius: '40% / 18%',
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 20px, ${goldPrimary}05 20px, ${goldPrimary}05 21px),
            repeating-linear-gradient(-45deg, transparent, transparent 20px, ${goldPrimary}05 20px, ${goldPrimary}05 21px)
          `,
          opacity: intensity * 0.6
        }}
      />
    </>
  );
});

export default MafiaTableGlow;
