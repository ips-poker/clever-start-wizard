// ============================================
// CYBERPUNK TABLE GLOW - Premium Neon Tech Effects
// ============================================
// Статичное hi-tech свечение ВНУТРИ стола

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

// Helper to convert hex opacity to hex string
const opacityToHex = (opacity: number) => Math.round(opacity * 255).toString(16).padStart(2, '0');

export const CyberpunkTableGlow = memo(function CyberpunkTableGlow({
  primaryColor = '#00d4ff',
  secondaryColor = '#ff00ff',
  intensity = 0.8,
  tableInsets = { top: '6%', left: '20%', right: '20%', bottom: '6%' }
}: CyberpunkTableGlowProps) {
  
  const glowOpacity = intensity * 0.5;
  const lineOpacity = intensity * 0.35;
  const accentOpacity = intensity * 0.7;
  
  return (
    <>
      {/* === INNER RAIL GLOW - свечение по внутреннему краю бортика === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 4%)`,
          left: `calc(${tableInsets.left} + 4%)`,
          right: `calc(${tableInsets.right} + 4%)`,
          bottom: `calc(${tableInsets.bottom} + 4%)`,
          borderRadius: '38% / 16%',
          boxShadow: `
            inset 0 0 30px ${primaryColor}${opacityToHex(glowOpacity * 0.6)},
            inset 0 0 60px ${primaryColor}${opacityToHex(glowOpacity * 0.3)},
            inset 0 0 100px ${primaryColor}${opacityToHex(glowOpacity * 0.15)}
          `,
          border: `1px solid ${primaryColor}${opacityToHex(lineOpacity * 0.6)}`
        }}
      />
      
      {/* === SECONDARY INNER RING - вторичное свечение глубже === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 8%)`,
          left: `calc(${tableInsets.left} + 8%)`,
          right: `calc(${tableInsets.right} + 8%)`,
          bottom: `calc(${tableInsets.bottom} + 8%)`,
          borderRadius: '35% / 14%',
          boxShadow: `
            inset 0 0 20px ${secondaryColor}${opacityToHex(glowOpacity * 0.25)},
            inset 0 0 40px ${secondaryColor}${opacityToHex(glowOpacity * 0.1)}
          `
        }}
      />
      
      {/* === CORNER DATA NODES - внутри стола === */}
      {/* Top-left corner */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 12%)`,
          left: `calc(${tableInsets.left} + 6%)`,
          width: '30px',
          height: '30px'
        }}
      >
        <svg viewBox="0 0 30 30" className="w-full h-full">
          <path 
            d="M0 15 L0 4 L4 0 L15 0" 
            stroke={primaryColor} 
            strokeWidth="1" 
            fill="none"
            opacity={accentOpacity}
          />
          <circle cx="4" cy="4" r="1.5" fill={primaryColor} opacity={accentOpacity} />
        </svg>
      </div>
      
      {/* Top-right corner */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 12%)`,
          right: `calc(${tableInsets.right} + 6%)`,
          width: '30px',
          height: '30px'
        }}
      >
        <svg viewBox="0 0 30 30" className="w-full h-full">
          <path 
            d="M30 15 L30 4 L26 0 L15 0" 
            stroke={primaryColor} 
            strokeWidth="1" 
            fill="none"
            opacity={accentOpacity}
          />
          <circle cx="26" cy="4" r="1.5" fill={primaryColor} opacity={accentOpacity} />
        </svg>
      </div>
      
      {/* Bottom-left corner */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 12%)`,
          left: `calc(${tableInsets.left} + 6%)`,
          width: '30px',
          height: '30px'
        }}
      >
        <svg viewBox="0 0 30 30" className="w-full h-full">
          <path 
            d="M0 15 L0 26 L4 30 L15 30" 
            stroke={primaryColor} 
            strokeWidth="1" 
            fill="none"
            opacity={accentOpacity}
          />
          <circle cx="4" cy="26" r="1.5" fill={primaryColor} opacity={accentOpacity} />
        </svg>
      </div>
      
      {/* Bottom-right corner */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 12%)`,
          right: `calc(${tableInsets.right} + 6%)`,
          width: '30px',
          height: '30px'
        }}
      >
        <svg viewBox="0 0 30 30" className="w-full h-full">
          <path 
            d="M30 15 L30 26 L26 30 L15 30" 
            stroke={primaryColor} 
            strokeWidth="1" 
            fill="none"
            opacity={accentOpacity}
          />
          <circle cx="26" cy="26" r="1.5" fill={primaryColor} opacity={accentOpacity} />
        </svg>
      </div>
      
      {/* === EDGE HIGHLIGHT LINES - внутренние линии === */}
      {/* Top edge line */}
      <div 
        className="absolute pointer-events-none h-px"
        style={{
          top: `calc(${tableInsets.top} + 14%)`,
          left: '38%',
          right: '38%',
          background: `linear-gradient(90deg, transparent, ${primaryColor}${opacityToHex(lineOpacity)}, transparent)`
        }}
      />
      
      {/* Bottom edge line */}
      <div 
        className="absolute pointer-events-none h-px"
        style={{
          bottom: `calc(${tableInsets.bottom} + 14%)`,
          left: '38%',
          right: '38%',
          background: `linear-gradient(90deg, transparent, ${primaryColor}${opacityToHex(lineOpacity)}, transparent)`
        }}
      />
      
      {/* === SIDE INDICATORS - внутри по бокам сукна === */}
      {/* Left side */}
      <div 
        className="absolute flex flex-col gap-1.5 pointer-events-none"
        style={{
          left: `calc(${tableInsets.left} + 5%)`,
          top: '38%',
          bottom: '38%',
          width: '2px'
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              background: `linear-gradient(180deg, ${primaryColor}${opacityToHex(accentOpacity * 0.5)}, transparent)`,
              boxShadow: `0 0 4px ${primaryColor}${opacityToHex(accentOpacity * 0.3)}`
            }}
          />
        ))}
      </div>
      
      {/* Right side */}
      <div 
        className="absolute flex flex-col gap-1.5 pointer-events-none"
        style={{
          right: `calc(${tableInsets.right} + 5%)`,
          top: '38%',
          bottom: '38%',
          width: '2px'
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              background: `linear-gradient(180deg, transparent, ${primaryColor}${opacityToHex(accentOpacity * 0.5)})`,
              boxShadow: `0 0 4px ${primaryColor}${opacityToHex(accentOpacity * 0.3)}`
            }}
          />
        ))}
      </div>
      
      {/* === CENTER AMBIENT GLOW === */}
      <div 
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '50%',
          height: '30%',
          background: `radial-gradient(ellipse, ${primaryColor}${opacityToHex(glowOpacity * 0.12)} 0%, transparent 70%)`,
          filter: 'blur(30px)'
        }}
      />
      
      {/* === SUBTLE GRID ON FELT === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 4%)`,
          left: `calc(${tableInsets.left} + 4%)`,
          right: `calc(${tableInsets.right} + 4%)`,
          bottom: `calc(${tableInsets.bottom} + 4%)`,
          borderRadius: '38% / 16%',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 25px, ${primaryColor}05 25px, ${primaryColor}05 26px),
            repeating-linear-gradient(90deg, transparent, transparent 25px, ${primaryColor}05 25px, ${primaryColor}05 26px)
          `,
          opacity: intensity * 0.6
        }}
      />
    </>
  );
});

export default CyberpunkTableGlow;
