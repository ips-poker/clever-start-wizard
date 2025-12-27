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
      {/* === FULLSCREEN WESTERN BACKGROUND === */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 20%, ${amber}10 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, ${copper}08 0%, transparent 40%),
            radial-gradient(ellipse at 80% 80%, ${copper}08 0%, transparent 40%),
            linear-gradient(180deg, #1a0f05 0%, #0d0804 50%, #1a0f05 100%)
          `
        }}
      />
      
      {/* Warm lantern glow from top */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/3 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${amber}15 0%, transparent 70%)`,
          filter: 'blur(60px)'
        }}
      />
      
      {/* Wood grain texture effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            ${warmBrown}08 2px,
            ${warmBrown}08 4px
          )`
        }}
      />

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
