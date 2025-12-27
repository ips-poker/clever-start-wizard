// ============================================
// COSMIC TABLE GLOW - Deep Space Theme
// ============================================
// Космический стиль с звёздами и туманностями

import React, { memo } from 'react';

interface CosmicTableGlowProps {
  intensity?: number;
  tableInsets?: {
    top: string;
    left: string;
    right: string;
    bottom: string;
  };
}

export const CosmicTableGlow = memo(function CosmicTableGlow({
  intensity = 0.8,
  tableInsets = { top: '6%', left: '20%', right: '20%', bottom: '6%' }
}: CosmicTableGlowProps) {
  
  const nebulaPurple = '#9b59b6';
  const cosmicBlue = '#3498db';
  const starWhite = '#ecf0f1';
  const nebulaRed = '#e74c3c';
  
  const glowOpacity = intensity * 0.5;
  const accentOpacity = intensity * 0.8;
  
  return (
    <>
      {/* === NEBULA OUTER GLOW === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 3%)`,
          left: `calc(${tableInsets.left} - 3%)`,
          right: `calc(${tableInsets.right} - 3%)`,
          bottom: `calc(${tableInsets.bottom} - 3%)`,
          borderRadius: '46% / 23%',
          boxShadow: `
            0 0 50px ${nebulaPurple}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')},
            0 0 100px ${cosmicBlue}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')},
            inset 0 0 40px ${nebulaPurple}${Math.round(glowOpacity * 0.3 * 255).toString(16).padStart(2, '0')}
          `,
          border: `1px solid ${cosmicBlue}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === INNER COSMIC RING === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 2%)`,
          left: `calc(${tableInsets.left} + 2%)`,
          right: `calc(${tableInsets.right} + 2%)`,
          bottom: `calc(${tableInsets.bottom} + 2%)`,
          borderRadius: '40% / 18%',
          boxShadow: `
            0 0 20px ${nebulaRed}${Math.round(glowOpacity * 0.3 * 255).toString(16).padStart(2, '0')},
            inset 0 0 30px ${cosmicBlue}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')}
          `,
          border: `1px solid ${nebulaPurple}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === STAR FIELD === */}
      {[...Array(12)].map((_, i) => {
        const randomLeft = 25 + Math.sin(i * 2.5) * 25;
        const randomTop = 20 + Math.cos(i * 3.1) * 30;
        const size = 2 + (i % 3);
        return (
          <div 
            key={i}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: `${randomLeft}%`,
              top: `${randomTop}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: starWhite,
              boxShadow: `0 0 ${size * 2}px ${starWhite}`,
              opacity: accentOpacity * (0.4 + (i % 3) * 0.2)
            }}
          />
        );
      })}
      
      {/* === GALAXY CENTER GLOW === */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '60%',
          height: '40%',
          background: `
            radial-gradient(ellipse at 40% 50%, ${nebulaPurple}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')} 0%, transparent 50%),
            radial-gradient(ellipse at 60% 50%, ${cosmicBlue}${Math.round(glowOpacity * 0.15 * 255).toString(16).padStart(2, '0')} 0%, transparent 50%)
          `,
          filter: 'blur(25px)'
        }}
      />
      
      {/* === COMET TRAILS === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 10%)`,
          left: '25%',
          width: '20%',
          height: '1px',
          background: `linear-gradient(90deg, ${starWhite}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, transparent)`,
          transform: 'rotate(-15deg)'
        }}
      />
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 15%)`,
          right: '30%',
          width: '15%',
          height: '1px',
          background: `linear-gradient(-90deg, ${starWhite}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')}, transparent)`,
          transform: 'rotate(10deg)'
        }}
      />
      
      {/* === ORBITAL RINGS === */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '70%',
          height: '25%',
          border: `1px solid ${cosmicBlue}${Math.round(accentOpacity * 0.15 * 255).toString(16).padStart(2, '0')}`,
          borderRadius: '50%',
          transform: 'rotateX(75deg)'
        }}
      />
      
      {/* === DUST CLOUD TEXTURE === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: tableInsets.top,
          left: tableInsets.left,
          right: tableInsets.right,
          bottom: tableInsets.bottom,
          borderRadius: '40% / 18%',
          background: `
            radial-gradient(ellipse at 30% 30%, ${nebulaPurple}08 0%, transparent 40%),
            radial-gradient(ellipse at 70% 70%, ${cosmicBlue}06 0%, transparent 40%)
          `,
          opacity: intensity
        }}
      />
    </>
  );
});

export default CosmicTableGlow;
