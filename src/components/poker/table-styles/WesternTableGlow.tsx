// ============================================
// WESTERN TABLE GLOW - Wild West Saloon Style
// ============================================
// Тёплые коричневые тона с медными акцентами

import React, { memo } from 'react';

interface WesternTableGlowProps {
  intensity?: number;
  tableInsets?: {
    top: string;
    left: string;
    right: string;
    bottom: string;
  };
}

export const WesternTableGlow = memo(function WesternTableGlow({
  intensity = 0.8,
  tableInsets = { top: '6%', left: '20%', right: '20%', bottom: '6%' }
}: WesternTableGlowProps) {
  
  const copper = '#b87333';
  const warmBrown = '#8b4513';
  const amber = '#ff8c00';
  
  const glowOpacity = intensity * 0.5;
  const accentOpacity = intensity * 0.7;
  
  return (
    <>
      {/* === COPPER OUTER FRAME === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 1.5%)`,
          left: `calc(${tableInsets.left} - 1.5%)`,
          right: `calc(${tableInsets.right} - 1.5%)`,
          bottom: `calc(${tableInsets.bottom} - 1.5%)`,
          borderRadius: '46% / 23%',
          boxShadow: `
            0 0 25px ${copper}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')},
            0 0 50px ${warmBrown}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')},
            inset 0 0 15px ${amber}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')}
          `,
          border: `3px solid ${copper}${Math.round(accentOpacity * 0.7 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === INNER LEATHER BORDER === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 1%)`,
          left: `calc(${tableInsets.left} + 1%)`,
          right: `calc(${tableInsets.right} + 1%)`,
          bottom: `calc(${tableInsets.bottom} + 1%)`,
          borderRadius: '42% / 20%',
          border: `1px dashed ${warmBrown}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === CORNER STUDS === */}
      {[
        { top: `calc(${tableInsets.top} + 3%)`, left: `calc(${tableInsets.left} + 8%)` },
        { top: `calc(${tableInsets.top} + 3%)`, right: `calc(${tableInsets.right} + 8%)` },
        { bottom: `calc(${tableInsets.bottom} + 3%)`, left: `calc(${tableInsets.left} + 8%)` },
        { bottom: `calc(${tableInsets.bottom} + 3%)`, right: `calc(${tableInsets.right} + 8%)` }
      ].map((pos, i) => (
        <div 
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...pos,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${copper}, ${warmBrown})`,
            boxShadow: `
              0 0 8px ${amber}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')},
              inset 0 -2px 3px rgba(0,0,0,0.3)
            `,
            border: `1px solid ${copper}${Math.round(accentOpacity * 255).toString(16).padStart(2, '0')}`
          }}
        />
      ))}
      
      {/* === LANTERN GLOW CENTER === */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '45%',
          height: '30%',
          background: `radial-gradient(ellipse, ${amber}${Math.round(glowOpacity * 0.15 * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
          filter: 'blur(35px)'
        }}
      />
      
      {/* === HORSESHOE SIDE ACCENTS === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          left: `calc(${tableInsets.left} - 0.5%)`,
          top: '40%',
          bottom: '40%',
          width: '4px',
          background: `linear-gradient(180deg, transparent, ${copper}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, transparent)`,
          borderRadius: '2px'
        }}
      />
      <div 
        className="absolute pointer-events-none"
        style={{
          right: `calc(${tableInsets.right} - 0.5%)`,
          top: '40%',
          bottom: '40%',
          width: '4px',
          background: `linear-gradient(180deg, transparent, ${copper}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, transparent)`,
          borderRadius: '2px'
        }}
      />
      
      {/* === ROPE PATTERN TOP/BOTTOM === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 8%)`,
          left: '35%',
          right: '35%',
          height: '2px',
          background: `repeating-linear-gradient(90deg, ${warmBrown}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')} 0px, ${warmBrown}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')} 4px, transparent 4px, transparent 8px)`
        }}
      />
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 8%)`,
          left: '35%',
          right: '35%',
          height: '2px',
          background: `repeating-linear-gradient(90deg, ${warmBrown}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')} 0px, ${warmBrown}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')} 4px, transparent 4px, transparent 8px)`
        }}
      />
    </>
  );
});

export default WesternTableGlow;
