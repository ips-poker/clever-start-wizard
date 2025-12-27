// ============================================
// MATRIX TABLE GLOW - Digital Rain Style
// ============================================
// Футуристический стиль с зелёными цифровыми эффектами

import React, { memo } from 'react';

interface MatrixTableGlowProps {
  intensity?: number;
  tableInsets?: {
    top: string;
    left: string;
    right: string;
    bottom: string;
  };
}

export const MatrixTableGlow = memo(function MatrixTableGlow({
  intensity = 0.8,
  tableInsets = { top: '6%', left: '20%', right: '20%', bottom: '6%' }
}: MatrixTableGlowProps) {
  
  const matrixGreen = '#00ff41';
  const darkGreen = '#003b00';
  const brightGreen = '#39ff14';
  
  const glowOpacity = intensity * 0.5;
  const accentOpacity = intensity * 0.7;
  
  return (
    <>
      {/* Fullscreen background is rendered by TableGlowFullscreenBackground at wrapper level */}

      {/* === DIGITAL OUTER FRAME === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 1.5%)`,
          left: `calc(${tableInsets.left} - 1.5%)`,
          right: `calc(${tableInsets.right} - 1.5%)`,
          bottom: `calc(${tableInsets.bottom} - 1.5%)`,
          borderRadius: '46% / 23%',
          boxShadow: `
            0 0 40px ${matrixGreen}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')},
            0 0 80px ${darkGreen}${Math.round(glowOpacity * 0.6 * 255).toString(16).padStart(2, '0')},
            inset 0 0 30px ${matrixGreen}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')}
          `,
          border: `1px solid ${matrixGreen}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === INNER CIRCUIT RING === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 3%)`,
          left: `calc(${tableInsets.left} + 3%)`,
          right: `calc(${tableInsets.right} + 3%)`,
          bottom: `calc(${tableInsets.bottom} + 3%)`,
          borderRadius: '38% / 16%',
          border: `1px solid ${matrixGreen}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === DIGITAL RAIN EFFECT - VERTICAL LINES ON TABLE === */}
      {[15, 25, 35, 45, 55, 65, 75, 85].map((left, i) => (
        <div 
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${left}%`,
            top: tableInsets.top,
            bottom: tableInsets.bottom,
            width: '1px',
            background: `linear-gradient(180deg, 
              transparent 0%, 
              ${matrixGreen}${Math.round(accentOpacity * 0.2 * 255).toString(16).padStart(2, '0')} ${10 + i * 5}%, 
              ${brightGreen}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')} ${30 + i * 3}%, 
              ${matrixGreen}${Math.round(accentOpacity * 0.15 * 255).toString(16).padStart(2, '0')} ${60 + i * 2}%, 
              transparent 100%
            )`,
            opacity: 0.5 + (i % 3) * 0.15
          }}
        />
      ))}
      
      {/* === CORNER DATA TERMINALS === */}
      {[
        { top: `calc(${tableInsets.top} + 2%)`, left: `calc(${tableInsets.left} + 2%)` },
        { top: `calc(${tableInsets.top} + 2%)`, right: `calc(${tableInsets.right} + 2%)` },
        { bottom: `calc(${tableInsets.bottom} + 2%)`, left: `calc(${tableInsets.left} + 2%)` },
        { bottom: `calc(${tableInsets.bottom} + 2%)`, right: `calc(${tableInsets.right} + 2%)` }
      ].map((pos, i) => (
        <div 
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...pos,
            width: '30px',
            height: '30px'
          }}
        >
          <svg viewBox="0 0 30 30" className="w-full h-full">
            <rect 
              x="2" y="2" width="26" height="26" 
              stroke={matrixGreen} 
              strokeWidth="1" 
              fill="none"
              opacity={accentOpacity * 0.6}
            />
            <line x1="8" y1="8" x2="22" y2="8" stroke={matrixGreen} strokeWidth="0.5" opacity={accentOpacity * 0.4} />
            <line x1="8" y1="15" x2="18" y2="15" stroke={matrixGreen} strokeWidth="0.5" opacity={accentOpacity * 0.4} />
            <line x1="8" y1="22" x2="20" y2="22" stroke={matrixGreen} strokeWidth="0.5" opacity={accentOpacity * 0.4} />
            <circle cx="5" cy="5" r="1.5" fill={brightGreen} opacity={accentOpacity} />
          </svg>
        </div>
      ))}
      
      {/* === CENTER MATRIX CORE === */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '55%',
          height: '35%',
          background: `radial-gradient(ellipse, ${matrixGreen}${Math.round(glowOpacity * 0.15 * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: 'blur(35px)'
        }}
      />
      
      {/* === BINARY CODE PATTERN === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: tableInsets.top,
          left: tableInsets.left,
          right: tableInsets.right,
          bottom: tableInsets.bottom,
          borderRadius: '40% / 18%',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 8px, ${matrixGreen}04 8px, ${matrixGreen}04 9px)
          `,
          opacity: intensity * 0.6
        }}
      />
      
      {/* === SIDE DATA STREAMS === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          left: `calc(${tableInsets.left} - 0.5%)`,
          top: '25%',
          bottom: '25%',
          width: '2px',
          background: `linear-gradient(180deg, 
            transparent, 
            ${matrixGreen}${Math.round(accentOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 20%, 
            ${brightGreen}${Math.round(accentOpacity * 255).toString(16).padStart(2, '0')} 50%, 
            ${matrixGreen}${Math.round(accentOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 80%, 
            transparent
          )`,
          boxShadow: `0 0 8px ${matrixGreen}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      <div 
        className="absolute pointer-events-none"
        style={{
          right: `calc(${tableInsets.right} - 0.5%)`,
          top: '25%',
          bottom: '25%',
          width: '2px',
          background: `linear-gradient(180deg, 
            transparent, 
            ${matrixGreen}${Math.round(accentOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 20%, 
            ${brightGreen}${Math.round(accentOpacity * 255).toString(16).padStart(2, '0')} 50%, 
            ${matrixGreen}${Math.round(accentOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 80%, 
            transparent
          )`,
          boxShadow: `0 0 8px ${matrixGreen}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`
        }}
      />
    </>
  );
});

export default MatrixTableGlow;
