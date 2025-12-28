// ============================================
// MINIMAL ELEGANT TABLE GLOW - Clean Luxury Style
// ============================================
// Минималистичный элегантный стиль с мягким освещением

import React, { memo } from 'react';

interface MinimalElegantTableGlowProps {
  intensity?: number;
  tableInsets?: {
    top: string;
    left: string;
    right: string;
    bottom: string;
  };
}

export const MinimalElegantTableGlow = memo(function MinimalElegantTableGlow({
  intensity = 0.8,
  tableInsets = { top: '6%', left: '20%', right: '20%', bottom: '6%' }
}: MinimalElegantTableGlowProps) {
  
  const softWhite = '#f8f8f8';
  const warmGray = '#9ca3af';
  const subtleGold = '#d4af37';
  
  const glowOpacity = intensity * 0.4;
  const accentOpacity = intensity * 0.6;
  
  return (
    <>
      {/* === SOFT OUTER GLOW === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 1%)`,
          left: `calc(${tableInsets.left} - 1%)`,
          right: `calc(${tableInsets.right} - 1%)`,
          bottom: `calc(${tableInsets.bottom} - 1%)`,
          borderRadius: '46% / 23%',
          boxShadow: `
            0 0 40px ${softWhite}${Math.round(glowOpacity * 0.3 * 255).toString(16).padStart(2, '0')},
            0 0 80px ${warmGray}${Math.round(glowOpacity * 0.15 * 255).toString(16).padStart(2, '0')},
            inset 0 0 20px ${softWhite}${Math.round(glowOpacity * 0.1 * 255).toString(16).padStart(2, '0')}
          `,
          border: `1px solid ${softWhite}${Math.round(accentOpacity * 0.2 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === ELEGANT INNER BORDER === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 1%)`,
          left: `calc(${tableInsets.left} + 1%)`,
          right: `calc(${tableInsets.right} + 1%)`,
          bottom: `calc(${tableInsets.bottom} + 1%)`,
          borderRadius: '42% / 20%',
          border: `1px solid ${subtleGold}${Math.round(accentOpacity * 0.25 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === SUBTLE CORNER ACCENTS === */}
      {[
        { top: `calc(${tableInsets.top} + 4%)`, left: `calc(${tableInsets.left} + 6%)` },
        { top: `calc(${tableInsets.top} + 4%)`, right: `calc(${tableInsets.right} + 6%)` },
        { bottom: `calc(${tableInsets.bottom} + 4%)`, left: `calc(${tableInsets.left} + 6%)` },
        { bottom: `calc(${tableInsets.bottom} + 4%)`, right: `calc(${tableInsets.right} + 6%)` }
      ].map((pos, i) => (
        <div 
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...pos,
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: subtleGold,
            opacity: accentOpacity * 0.5,
            boxShadow: `0 0 4px ${subtleGold}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
          }}
        />
      ))}
      
      {/* === OVERHEAD LIGHT EFFECT === */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '70%',
          height: '45%',
          background: `radial-gradient(ellipse, ${softWhite}${Math.round(glowOpacity * 0.08 * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: 'blur(50px)'
        }}
      />
      
      {/* === TOP HIGHLIGHT BAR === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 2%)`,
          left: '30%',
          right: '30%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${softWhite}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')}, transparent)`
        }}
      />
      
      {/* === BOTTOM SUBTLE SHADOW === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 2%)`,
          left: '35%',
          right: '35%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${warmGray}${Math.round(accentOpacity * 0.2 * 255).toString(16).padStart(2, '0')}, transparent)`
        }}
      />
      
      {/* === SIDE WHISPER GLOW === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          left: `calc(${tableInsets.left} + 2%)`,
          top: '40%',
          bottom: '40%',
          width: '1px',
          background: `linear-gradient(180deg, transparent, ${subtleGold}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')}, transparent)`
        }}
      />
      <div 
        className="absolute pointer-events-none"
        style={{
          right: `calc(${tableInsets.right} + 2%)`,
          top: '40%',
          bottom: '40%',
          width: '1px',
          background: `linear-gradient(180deg, transparent, ${subtleGold}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')}, transparent)`
        }}
      />
    </>
  );
});

export default MinimalElegantTableGlow;
