// ============================================
// CYBERPUNK TABLE GLOW - Premium Neon Tech Effects
// ============================================
// Статичное hi-tech свечение с неоновыми акцентами

import React, { memo } from 'react';

interface CyberpunkTableGlowProps {
  /** Основной неоновый цвет (hex) */
  primaryColor?: string;
  /** Вторичный акцентный цвет (hex) */
  secondaryColor?: string;
  /** Интенсивность свечения 0-1 */
  intensity?: number;
  /** Отступы стола для точного позиционирования */
  tableInsets?: {
    top: string;
    left: string;
    right: string;
    bottom: string;
  };
}

export const CyberpunkTableGlow = memo(function CyberpunkTableGlow({
  primaryColor = '#00d4ff',
  secondaryColor = '#ff00ff',
  intensity = 0.8,
  tableInsets = { top: '6%', left: '20%', right: '20%', bottom: '6%' }
}: CyberpunkTableGlowProps) {
  
  // Adjust opacity based on intensity
  const glowOpacity = intensity * 0.6;
  const lineOpacity = intensity * 0.4;
  const accentOpacity = intensity * 0.8;
  
  return (
    <>
      {/* === OUTER NEON BORDER GLOW === */}
      {/* Primary color outer glow - follows table rail shape */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 2%)`,
          left: `calc(${tableInsets.left} - 2%)`,
          right: `calc(${tableInsets.right} - 2%)`,
          bottom: `calc(${tableInsets.bottom} - 2%)`,
          borderRadius: '46% / 23%',
          boxShadow: `
            0 0 40px ${primaryColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')},
            0 0 80px ${primaryColor}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')},
            inset 0 0 30px ${primaryColor}${Math.round(glowOpacity * 0.3 * 255).toString(16).padStart(2, '0')}
          `,
          border: `1px solid ${primaryColor}${Math.round(lineOpacity * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === INNER NEON RING === */}
      {/* Secondary accent color inner ring */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 3%)`,
          left: `calc(${tableInsets.left} + 3%)`,
          right: `calc(${tableInsets.right} + 3%)`,
          bottom: `calc(${tableInsets.bottom} + 3%)`,
          borderRadius: '38% / 16%',
          boxShadow: `
            0 0 20px ${secondaryColor}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')},
            inset 0 0 40px ${secondaryColor}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')}
          `,
          border: `1px solid ${secondaryColor}${Math.round(lineOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === CORNER DATA NODES === */}
      {/* Top-left corner */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 2%)`,
          left: `calc(${tableInsets.left} + 2%)`,
          width: '40px',
          height: '40px'
        }}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <path 
            d="M0 20 L0 5 L5 0 L20 0" 
            stroke={primaryColor} 
            strokeWidth="1.5" 
            fill="none"
            opacity={accentOpacity}
          />
          <circle cx="5" cy="5" r="2" fill={primaryColor} opacity={accentOpacity} />
          <circle cx="5" cy="5" r="4" fill="none" stroke={primaryColor} strokeWidth="0.5" opacity={accentOpacity * 0.5} />
        </svg>
      </div>
      
      {/* Top-right corner */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 2%)`,
          right: `calc(${tableInsets.right} + 2%)`,
          width: '40px',
          height: '40px'
        }}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <path 
            d="M40 20 L40 5 L35 0 L20 0" 
            stroke={primaryColor} 
            strokeWidth="1.5" 
            fill="none"
            opacity={accentOpacity}
          />
          <circle cx="35" cy="5" r="2" fill={primaryColor} opacity={accentOpacity} />
          <circle cx="35" cy="5" r="4" fill="none" stroke={primaryColor} strokeWidth="0.5" opacity={accentOpacity * 0.5} />
        </svg>
      </div>
      
      {/* Bottom-left corner */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 2%)`,
          left: `calc(${tableInsets.left} + 2%)`,
          width: '40px',
          height: '40px'
        }}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <path 
            d="M0 20 L0 35 L5 40 L20 40" 
            stroke={primaryColor} 
            strokeWidth="1.5" 
            fill="none"
            opacity={accentOpacity}
          />
          <circle cx="5" cy="35" r="2" fill={primaryColor} opacity={accentOpacity} />
        </svg>
      </div>
      
      {/* Bottom-right corner */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 2%)`,
          right: `calc(${tableInsets.right} + 2%)`,
          width: '40px',
          height: '40px'
        }}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <path 
            d="M40 20 L40 35 L35 40 L20 40" 
            stroke={primaryColor} 
            strokeWidth="1.5" 
            fill="none"
            opacity={accentOpacity}
          />
          <circle cx="35" cy="35" r="2" fill={primaryColor} opacity={accentOpacity} />
        </svg>
      </div>
      
      {/* === HORIZONTAL SCAN LINES === */}
      {/* Top edge */}
      <div 
        className="absolute pointer-events-none h-px"
        style={{
          top: `calc(${tableInsets.top} + 15%)`,
          left: '35%',
          right: '35%',
          background: `linear-gradient(90deg, transparent, ${primaryColor}${Math.round(lineOpacity * 255).toString(16).padStart(2, '0')}, transparent)`
        }}
      />
      
      {/* Bottom edge */}
      <div 
        className="absolute pointer-events-none h-px"
        style={{
          bottom: `calc(${tableInsets.bottom} + 15%)`,
          left: '35%',
          right: '35%',
          background: `linear-gradient(90deg, transparent, ${primaryColor}${Math.round(lineOpacity * 255).toString(16).padStart(2, '0')}, transparent)`
        }}
      />
      
      {/* === SIDE DATA INDICATORS === */}
      {/* Left side indicators */}
      <div 
        className="absolute flex flex-col gap-2 pointer-events-none"
        style={{
          left: `calc(${tableInsets.left} - 1%)`,
          top: '35%',
          bottom: '35%',
          width: '3px'
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              background: i % 2 === 0 
                ? `linear-gradient(180deg, ${primaryColor}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, transparent)` 
                : 'transparent',
              boxShadow: i % 2 === 0 ? `0 0 6px ${primaryColor}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')}` : 'none'
            }}
          />
        ))}
      </div>
      
      {/* Right side indicators */}
      <div 
        className="absolute flex flex-col gap-2 pointer-events-none"
        style={{
          right: `calc(${tableInsets.right} - 1%)`,
          top: '35%',
          bottom: '35%',
          width: '3px'
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              background: i % 2 === 1 
                ? `linear-gradient(180deg, ${primaryColor}${Math.round(accentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, transparent)` 
                : 'transparent',
              boxShadow: i % 2 === 1 ? `0 0 6px ${primaryColor}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')}` : 'none'
            }}
          />
        ))}
      </div>
      
      {/* === CENTER SPOTLIGHT GRADIENT === */}
      {/* Ambient glow from center - tech style */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '60%',
          height: '40%',
          background: `radial-gradient(ellipse, ${primaryColor}${Math.round(glowOpacity * 0.15 * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: 'blur(40px)'
        }}
      />
      
      {/* === GRID OVERLAY === */}
      {/* Subtle tech grid on felt area */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: tableInsets.top,
          left: tableInsets.left,
          right: tableInsets.right,
          bottom: tableInsets.bottom,
          borderRadius: '40% / 18%',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 30px, ${primaryColor}08 30px, ${primaryColor}08 31px),
            repeating-linear-gradient(90deg, transparent, transparent 30px, ${primaryColor}08 30px, ${primaryColor}08 31px)
          `,
          opacity: intensity * 0.5
        }}
      />
      
      {/* === TOP EDGE HIGHLIGHT === */}
      {/* Simulated overhead light reflection */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 1%)`,
          left: '30%',
          right: '30%',
          height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${primaryColor}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')} 30%, ${primaryColor}${Math.round(accentOpacity * 255).toString(16).padStart(2, '0')} 50%, ${primaryColor}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')} 70%, transparent 100%)`,
          filter: 'blur(1px)'
        }}
      />
    </>
  );
});

export default CyberpunkTableGlow;
