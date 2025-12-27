// ============================================
// NEON VEGAS TABLE GLOW - Las Vegas Casino Style
// ============================================
// Яркие неоновые цвета в стиле Вегаса

import React, { memo } from 'react';

interface NeonVegasTableGlowProps {
  intensity?: number;
  tableInsets?: {
    top: string;
    left: string;
    right: string;
    bottom: string;
  };
}

export const NeonVegasTableGlow = memo(function NeonVegasTableGlow({
  intensity = 0.8,
  tableInsets = { top: '6%', left: '20%', right: '20%', bottom: '6%' }
}: NeonVegasTableGlowProps) {
  
  const hotPink = '#ff1493';
  const electricBlue = '#00bfff';
  const neonGreen = '#39ff14';
  const gold = '#ffd700';
  
  const glowOpacity = intensity * 0.6;
  const accentOpacity = intensity * 0.8;
  
  return (
    <>
      {/* === MULTI-COLOR OUTER GLOW === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 2%)`,
          left: `calc(${tableInsets.left} - 2%)`,
          right: `calc(${tableInsets.right} - 2%)`,
          bottom: `calc(${tableInsets.bottom} - 2%)`,
          borderRadius: '46% / 23%',
          boxShadow: `
            0 0 30px ${hotPink}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')},
            0 0 60px ${electricBlue}${Math.round(glowOpacity * 0.6 * 255).toString(16).padStart(2, '0')},
            0 0 90px ${neonGreen}${Math.round(glowOpacity * 0.3 * 255).toString(16).padStart(2, '0')}
          `,
          border: `2px solid ${hotPink}${Math.round(accentOpacity * 0.7 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === INNER NEON RING === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 2%)`,
          left: `calc(${tableInsets.left} + 2%)`,
          right: `calc(${tableInsets.right} + 2%)`,
          bottom: `calc(${tableInsets.bottom} + 2%)`,
          borderRadius: '40% / 18%',
          boxShadow: `
            0 0 15px ${electricBlue}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')},
            inset 0 0 20px ${hotPink}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')}
          `,
          border: `1px solid ${electricBlue}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === NEON CORNER SIGNS === */}
      {[
        { top: `calc(${tableInsets.top} + 5%)`, left: `calc(${tableInsets.left} + 5%)`, color: hotPink },
        { top: `calc(${tableInsets.top} + 5%)`, right: `calc(${tableInsets.right} + 5%)`, color: electricBlue },
        { bottom: `calc(${tableInsets.bottom} + 5%)`, left: `calc(${tableInsets.left} + 5%)`, color: neonGreen },
        { bottom: `calc(${tableInsets.bottom} + 5%)`, right: `calc(${tableInsets.right} + 5%)`, color: gold }
      ].map((pos, i) => (
        <div 
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...(pos.top ? { top: pos.top } : { bottom: pos.bottom }),
            ...(pos.left ? { left: pos.left } : { right: pos.right }),
            width: '20px',
            height: '20px'
          }}
        >
          <svg viewBox="0 0 20 20" className="w-full h-full">
            <path 
              d="M2 10 L10 2 L18 10 L10 18 Z" 
              stroke={pos.color} 
              strokeWidth="1.5" 
              fill="none"
              opacity={accentOpacity}
            />
            <circle cx="10" cy="10" r="2" fill={pos.color} opacity={accentOpacity * 0.8} />
          </svg>
        </div>
      ))}
      
      {/* === VEGAS STRIP LIGHTS === */}
      <div 
        className="absolute pointer-events-none flex justify-between"
        style={{
          top: `calc(${tableInsets.top} + 12%)`,
          left: '30%',
          right: '30%',
          height: '4px'
        }}
      >
        {[hotPink, electricBlue, neonGreen, gold, hotPink].map((color, i) => (
          <div 
            key={i}
            className="rounded-full"
            style={{
              width: '8px',
              height: '4px',
              background: color,
              boxShadow: `0 0 8px ${color}`,
              opacity: accentOpacity
            }}
          />
        ))}
      </div>
      <div 
        className="absolute pointer-events-none flex justify-between"
        style={{
          bottom: `calc(${tableInsets.bottom} + 12%)`,
          left: '30%',
          right: '30%',
          height: '4px'
        }}
      >
        {[gold, neonGreen, electricBlue, hotPink, gold].map((color, i) => (
          <div 
            key={i}
            className="rounded-full"
            style={{
              width: '8px',
              height: '4px',
              background: color,
              boxShadow: `0 0 8px ${color}`,
              opacity: accentOpacity
            }}
          />
        ))}
      </div>
      
      {/* === CENTER JACKPOT GLOW === */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '50%',
          height: '35%',
          background: `
            radial-gradient(ellipse at 50% 50%, ${gold}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)
          `,
          filter: 'blur(30px)'
        }}
      />
      
      {/* === SIDE GLOW BARS === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          left: `calc(${tableInsets.left} - 0.5%)`,
          top: '30%',
          bottom: '30%',
          width: '3px',
          background: `linear-gradient(180deg, ${hotPink}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, ${electricBlue}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, ${neonGreen}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')})`,
          borderRadius: '2px',
          boxShadow: `0 0 10px ${hotPink}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      <div 
        className="absolute pointer-events-none"
        style={{
          right: `calc(${tableInsets.right} - 0.5%)`,
          top: '30%',
          bottom: '30%',
          width: '3px',
          background: `linear-gradient(180deg, ${neonGreen}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, ${electricBlue}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, ${hotPink}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')})`,
          borderRadius: '2px',
          boxShadow: `0 0 10px ${neonGreen}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
        }}
      />
    </>
  );
});

export default NeonVegasTableGlow;
