// ============================================
// CYBERPUNK TABLE GLOW - Premium Neon Tech Effects
// ============================================
// Детализированный hi-tech стиль с неоновыми акцентами

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
  
  const glowOpacity = intensity * 0.6;
  const lineOpacity = intensity * 0.4;
  const accentOpacity = intensity * 0.8;
  const tertiaryColor = '#8b5cf6'; // Purple accent
  
  return (
    <>
      {/* === FULLSCREEN CYBERPUNK BACKGROUND === */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 15%, ${primaryColor}12 0%, transparent 45%),
            radial-gradient(ellipse at 80% 85%, ${secondaryColor}10 0%, transparent 45%),
            radial-gradient(ellipse at 50% 50%, ${tertiaryColor}06 0%, transparent 60%),
            radial-gradient(ellipse at 10% 80%, ${primaryColor}08 0%, transparent 40%),
            radial-gradient(ellipse at 90% 20%, ${secondaryColor}08 0%, transparent 40%),
            linear-gradient(180deg, #0a0a1a 0%, #050510 40%, #08081a 70%, #0a0a1a 100%)
          `
        }}
      />
      
      {/* === CRT SCANLINES EFFECT === */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.3) 2px,
            rgba(0,0,0,0.3) 4px
          )`
        }}
      />
      
      {/* === HEXAGON GRID PATTERN === */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2300d4ff' fill-opacity='0.03'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: intensity * 0.6
        }}
      />
      
      {/* === CIRCUIT BOARD TRACES === */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]">
        {/* Horizontal traces */}
        <line x1="0" y1="15%" x2="25%" y2="15%" stroke={primaryColor} strokeWidth="1" />
        <line x1="75%" y1="15%" x2="100%" y2="15%" stroke={primaryColor} strokeWidth="1" />
        <line x1="0" y1="85%" x2="30%" y2="85%" stroke={secondaryColor} strokeWidth="1" />
        <line x1="70%" y1="85%" x2="100%" y2="85%" stroke={secondaryColor} strokeWidth="1" />
        
        {/* Vertical traces */}
        <line x1="8%" y1="0" x2="8%" y2="35%" stroke={primaryColor} strokeWidth="1" />
        <line x1="92%" y1="0" x2="92%" y2="35%" stroke={primaryColor} strokeWidth="1" />
        <line x1="8%" y1="65%" x2="8%" y2="100%" stroke={secondaryColor} strokeWidth="1" />
        <line x1="92%" y1="65%" x2="92%" y2="100%" stroke={secondaryColor} strokeWidth="1" />
        
        {/* Diagonal connectors */}
        <line x1="25%" y1="15%" x2="30%" y2="25%" stroke={primaryColor} strokeWidth="1" />
        <line x1="75%" y1="15%" x2="70%" y2="25%" stroke={primaryColor} strokeWidth="1" />
        <line x1="30%" y1="85%" x2="35%" y2="75%" stroke={secondaryColor} strokeWidth="1" />
        <line x1="70%" y1="85%" x2="65%" y2="75%" stroke={secondaryColor} strokeWidth="1" />
        
        {/* Circuit nodes */}
        <circle cx="25%" cy="15%" r="3" fill={primaryColor} opacity="0.6" />
        <circle cx="75%" cy="15%" r="3" fill={primaryColor} opacity="0.6" />
        <circle cx="30%" cy="85%" r="3" fill={secondaryColor} opacity="0.6" />
        <circle cx="70%" cy="85%" r="3" fill={secondaryColor} opacity="0.6" />
        <circle cx="8%" cy="35%" r="2" fill={primaryColor} opacity="0.5" />
        <circle cx="92%" cy="35%" r="2" fill={primaryColor} opacity="0.5" />
        <circle cx="8%" cy="65%" r="2" fill={secondaryColor} opacity="0.5" />
        <circle cx="92%" cy="65%" r="2" fill={secondaryColor} opacity="0.5" />
      </svg>
      
      {/* === NOISE/GRAIN TEXTURE === */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* === AMBIENT CORNER GLOWS === */}
      <div 
        className="absolute top-0 left-0 w-2/5 h-2/5 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 0% 0%, ${primaryColor}18 0%, transparent 60%)`,
          filter: 'blur(60px)'
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-2/5 h-2/5 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 100% 100%, ${secondaryColor}14 0%, transparent 60%)`,
          filter: 'blur(60px)'
        }}
      />
      <div 
        className="absolute top-0 right-0 w-1/4 h-1/4 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 100% 0%, ${tertiaryColor}10 0%, transparent 70%)`,
          filter: 'blur(50px)'
        }}
      />
      <div 
        className="absolute bottom-0 left-0 w-1/4 h-1/4 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 0% 100%, ${tertiaryColor}10 0%, transparent 70%)`,
          filter: 'blur(50px)'
        }}
      />

      {/* === OUTER NEON BORDER GLOW === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 2.5%)`,
          left: `calc(${tableInsets.left} - 2.5%)`,
          right: `calc(${tableInsets.right} - 2.5%)`,
          bottom: `calc(${tableInsets.bottom} - 2.5%)`,
          borderRadius: '47% / 24%',
          boxShadow: `
            0 0 60px ${primaryColor}${Math.round(glowOpacity * 0.8 * 255).toString(16).padStart(2, '0')},
            0 0 120px ${primaryColor}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')},
            inset 0 0 40px ${primaryColor}${Math.round(glowOpacity * 0.2 * 255).toString(16).padStart(2, '0')}
          `
        }}
      />
      
      {/* === PRIMARY NEON RING === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} - 1%)`,
          left: `calc(${tableInsets.left} - 1%)`,
          right: `calc(${tableInsets.right} - 1%)`,
          bottom: `calc(${tableInsets.bottom} - 1%)`,
          borderRadius: '46% / 23%',
          border: `2px solid ${primaryColor}${Math.round(lineOpacity * 1.2 * 255).toString(16).padStart(2, '0')}`,
          boxShadow: `
            0 0 20px ${primaryColor}${Math.round(glowOpacity * 0.6 * 255).toString(16).padStart(2, '0')},
            inset 0 0 20px ${primaryColor}${Math.round(glowOpacity * 0.3 * 255).toString(16).padStart(2, '0')}
          `
        }}
      />
      
      {/* === SECONDARY INNER RING === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 2%)`,
          left: `calc(${tableInsets.left} + 2%)`,
          right: `calc(${tableInsets.right} + 2%)`,
          bottom: `calc(${tableInsets.bottom} + 2%)`,
          borderRadius: '40% / 18%',
          boxShadow: `
            0 0 25px ${secondaryColor}${Math.round(glowOpacity * 0.35 * 255).toString(16).padStart(2, '0')},
            inset 0 0 35px ${secondaryColor}${Math.round(glowOpacity * 0.15 * 255).toString(16).padStart(2, '0')}
          `,
          border: `1px solid ${secondaryColor}${Math.round(lineOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === TERTIARY ACCENT RING === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 4%)`,
          left: `calc(${tableInsets.left} + 4%)`,
          right: `calc(${tableInsets.right} + 4%)`,
          bottom: `calc(${tableInsets.bottom} + 4%)`,
          borderRadius: '36% / 14%',
          border: `1px solid ${tertiaryColor}${Math.round(lineOpacity * 0.3 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === CORNER HUD TERMINALS === */}
      {/* Top-left terminal */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 1%)`,
          left: `calc(${tableInsets.left} + 1%)`,
          width: '60px',
          height: '60px'
        }}
      >
        <svg viewBox="0 0 60 60" className="w-full h-full">
          {/* Outer frame */}
          <path 
            d="M0 30 L0 8 L8 0 L30 0" 
            stroke={primaryColor} 
            strokeWidth="2" 
            fill="none"
            opacity={accentOpacity}
          />
          <path 
            d="M0 25 L0 12 L5 7 L20 7" 
            stroke={primaryColor} 
            strokeWidth="1" 
            fill="none"
            opacity={accentOpacity * 0.5}
          />
          {/* Data nodes */}
          <circle cx="8" cy="8" r="3" fill={primaryColor} opacity={accentOpacity} />
          <circle cx="8" cy="8" r="5" fill="none" stroke={primaryColor} strokeWidth="0.5" opacity={accentOpacity * 0.4} />
          {/* Status indicators */}
          <rect x="15" y="15" width="8" height="2" fill={primaryColor} opacity={accentOpacity * 0.7} />
          <rect x="15" y="20" width="12" height="2" fill={secondaryColor} opacity={accentOpacity * 0.5} />
          <rect x="15" y="25" width="6" height="2" fill={primaryColor} opacity={accentOpacity * 0.6} />
          {/* Crosshair element */}
          <line x1="35" y1="35" x2="45" y2="35" stroke={primaryColor} strokeWidth="1" opacity={accentOpacity * 0.4} />
          <line x1="40" y1="30" x2="40" y2="40" stroke={primaryColor} strokeWidth="1" opacity={accentOpacity * 0.4} />
        </svg>
      </div>
      
      {/* Top-right terminal */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 1%)`,
          right: `calc(${tableInsets.right} + 1%)`,
          width: '60px',
          height: '60px'
        }}
      >
        <svg viewBox="0 0 60 60" className="w-full h-full">
          <path 
            d="M60 30 L60 8 L52 0 L30 0" 
            stroke={primaryColor} 
            strokeWidth="2" 
            fill="none"
            opacity={accentOpacity}
          />
          <path 
            d="M60 25 L60 12 L55 7 L40 7" 
            stroke={primaryColor} 
            strokeWidth="1" 
            fill="none"
            opacity={accentOpacity * 0.5}
          />
          <circle cx="52" cy="8" r="3" fill={primaryColor} opacity={accentOpacity} />
          <circle cx="52" cy="8" r="5" fill="none" stroke={primaryColor} strokeWidth="0.5" opacity={accentOpacity * 0.4} />
          <rect x="37" y="15" width="8" height="2" fill={primaryColor} opacity={accentOpacity * 0.7} />
          <rect x="33" y="20" width="12" height="2" fill={tertiaryColor} opacity={accentOpacity * 0.5} />
          <rect x="39" y="25" width="6" height="2" fill={primaryColor} opacity={accentOpacity * 0.6} />
        </svg>
      </div>
      
      {/* Bottom-left terminal */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 1%)`,
          left: `calc(${tableInsets.left} + 1%)`,
          width: '60px',
          height: '60px'
        }}
      >
        <svg viewBox="0 0 60 60" className="w-full h-full">
          <path 
            d="M0 30 L0 52 L8 60 L30 60" 
            stroke={secondaryColor} 
            strokeWidth="2" 
            fill="none"
            opacity={accentOpacity}
          />
          <path 
            d="M0 35 L0 48 L5 53 L20 53" 
            stroke={secondaryColor} 
            strokeWidth="1" 
            fill="none"
            opacity={accentOpacity * 0.5}
          />
          <circle cx="8" cy="52" r="3" fill={secondaryColor} opacity={accentOpacity} />
          <rect x="15" y="35" width="10" height="2" fill={secondaryColor} opacity={accentOpacity * 0.6} />
          <rect x="15" y="40" width="6" height="2" fill={primaryColor} opacity={accentOpacity * 0.5} />
        </svg>
      </div>
      
      {/* Bottom-right terminal */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 1%)`,
          right: `calc(${tableInsets.right} + 1%)`,
          width: '60px',
          height: '60px'
        }}
      >
        <svg viewBox="0 0 60 60" className="w-full h-full">
          <path 
            d="M60 30 L60 52 L52 60 L30 60" 
            stroke={secondaryColor} 
            strokeWidth="2" 
            fill="none"
            opacity={accentOpacity}
          />
          <path 
            d="M60 35 L60 48 L55 53 L40 53" 
            stroke={secondaryColor} 
            strokeWidth="1" 
            fill="none"
            opacity={accentOpacity * 0.5}
          />
          <circle cx="52" cy="52" r="3" fill={secondaryColor} opacity={accentOpacity} />
          <rect x="35" y="35" width="10" height="2" fill={secondaryColor} opacity={accentOpacity * 0.6} />
          <rect x="39" y="40" width="6" height="2" fill={tertiaryColor} opacity={accentOpacity * 0.5} />
        </svg>
      </div>
      
      {/* === HORIZONTAL SCAN LINES === */}
      <div 
        className="absolute pointer-events-none h-[2px]"
        style={{
          top: `calc(${tableInsets.top} + 12%)`,
          left: '32%',
          right: '32%',
          background: `linear-gradient(90deg, transparent, ${primaryColor}${Math.round(lineOpacity * 0.8 * 255).toString(16).padStart(2, '0')}, ${primaryColor}${Math.round(lineOpacity * 255).toString(16).padStart(2, '0')}, ${primaryColor}${Math.round(lineOpacity * 0.8 * 255).toString(16).padStart(2, '0')}, transparent)`,
          boxShadow: `0 0 8px ${primaryColor}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      <div 
        className="absolute pointer-events-none h-[2px]"
        style={{
          bottom: `calc(${tableInsets.bottom} + 12%)`,
          left: '32%',
          right: '32%',
          background: `linear-gradient(90deg, transparent, ${secondaryColor}${Math.round(lineOpacity * 0.8 * 255).toString(16).padStart(2, '0')}, ${secondaryColor}${Math.round(lineOpacity * 255).toString(16).padStart(2, '0')}, ${secondaryColor}${Math.round(lineOpacity * 0.8 * 255).toString(16).padStart(2, '0')}, transparent)`,
          boxShadow: `0 0 8px ${secondaryColor}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === SIDE DATA COLUMNS === */}
      {/* Left side */}
      <div 
        className="absolute flex flex-col gap-1 pointer-events-none"
        style={{
          left: `calc(${tableInsets.left} - 1.5%)`,
          top: '30%',
          bottom: '30%',
          width: '4px'
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              background: i % 2 === 0 
                ? `linear-gradient(180deg, ${primaryColor}${Math.round(accentOpacity * 0.7 * 255).toString(16).padStart(2, '0')}, ${primaryColor}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')})` 
                : i % 3 === 0 
                  ? `${secondaryColor}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
                  : 'transparent',
              boxShadow: i % 2 === 0 ? `0 0 8px ${primaryColor}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')}` : 'none'
            }}
          />
        ))}
      </div>
      
      {/* Right side */}
      <div 
        className="absolute flex flex-col gap-1 pointer-events-none"
        style={{
          right: `calc(${tableInsets.right} - 1.5%)`,
          top: '30%',
          bottom: '30%',
          width: '4px'
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              background: i % 2 === 1 
                ? `linear-gradient(180deg, ${primaryColor}${Math.round(accentOpacity * 0.7 * 255).toString(16).padStart(2, '0')}, ${primaryColor}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')})` 
                : i % 3 === 1 
                  ? `${secondaryColor}${Math.round(accentOpacity * 0.4 * 255).toString(16).padStart(2, '0')}`
                  : 'transparent',
              boxShadow: i % 2 === 1 ? `0 0 8px ${primaryColor}${Math.round(accentOpacity * 0.5 * 255).toString(16).padStart(2, '0')}` : 'none'
            }}
          />
        ))}
      </div>
      
      {/* === HOLOGRAPHIC CENTER EFFECT === */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '65%',
          height: '45%',
          background: `
            radial-gradient(ellipse at 50% 40%, ${primaryColor}${Math.round(glowOpacity * 0.12 * 255).toString(16).padStart(2, '0')} 0%, transparent 50%),
            radial-gradient(ellipse at 45% 55%, ${secondaryColor}${Math.round(glowOpacity * 0.08 * 255).toString(16).padStart(2, '0')} 0%, transparent 45%),
            radial-gradient(ellipse at 55% 45%, ${tertiaryColor}${Math.round(glowOpacity * 0.06 * 255).toString(16).padStart(2, '0')} 0%, transparent 40%)
          `,
          filter: 'blur(35px)'
        }}
      />
      
      {/* === TECH GRID ON FELT === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: tableInsets.top,
          left: tableInsets.left,
          right: tableInsets.right,
          bottom: tableInsets.bottom,
          borderRadius: '40% / 18%',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 25px, ${primaryColor}06 25px, ${primaryColor}06 26px),
            repeating-linear-gradient(90deg, transparent, transparent 25px, ${primaryColor}06 25px, ${primaryColor}06 26px)
          `,
          opacity: intensity * 0.6
        }}
      />
      
      {/* === TOP EDGE HIGHLIGHT === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `calc(${tableInsets.top} + 0.5%)`,
          left: '28%',
          right: '28%',
          height: '3px',
          background: `linear-gradient(90deg, 
            transparent 0%, 
            ${primaryColor}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')} 20%, 
            ${primaryColor}${Math.round(accentOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 45%,
            ${primaryColor}${Math.round(accentOpacity * 255).toString(16).padStart(2, '0')} 50%, 
            ${primaryColor}${Math.round(accentOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 55%,
            ${primaryColor}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')} 80%, 
            transparent 100%)`,
          filter: 'blur(1px)',
          boxShadow: `0 0 15px ${primaryColor}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === BOTTOM EDGE HIGHLIGHT === */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: `calc(${tableInsets.bottom} + 0.5%)`,
          left: '28%',
          right: '28%',
          height: '3px',
          background: `linear-gradient(90deg, 
            transparent 0%, 
            ${secondaryColor}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')} 20%, 
            ${secondaryColor}${Math.round(accentOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 45%,
            ${secondaryColor}${Math.round(accentOpacity * 255).toString(16).padStart(2, '0')} 50%, 
            ${secondaryColor}${Math.round(accentOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 55%,
            ${secondaryColor}${Math.round(accentOpacity * 0.3 * 255).toString(16).padStart(2, '0')} 80%, 
            transparent 100%)`,
          filter: 'blur(1px)',
          boxShadow: `0 0 15px ${secondaryColor}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`
        }}
      />
      
      {/* === DECORATIVE TECH DOTS === */}
      {/* Top dots */}
      <div className="absolute pointer-events-none" style={{ top: `calc(${tableInsets.top} + 6%)`, left: '38%' }}>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ 
              background: primaryColor, 
              opacity: accentOpacity * (0.4 + i * 0.2),
              boxShadow: `0 0 4px ${primaryColor}`
            }} />
          ))}
        </div>
      </div>
      <div className="absolute pointer-events-none" style={{ top: `calc(${tableInsets.top} + 6%)`, right: '38%' }}>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ 
              background: primaryColor, 
              opacity: accentOpacity * (0.8 - i * 0.2),
              boxShadow: `0 0 4px ${primaryColor}`
            }} />
          ))}
        </div>
      </div>
      
      {/* Bottom dots */}
      <div className="absolute pointer-events-none" style={{ bottom: `calc(${tableInsets.bottom} + 6%)`, left: '38%' }}>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ 
              background: secondaryColor, 
              opacity: accentOpacity * (0.4 + i * 0.2),
              boxShadow: `0 0 4px ${secondaryColor}`
            }} />
          ))}
        </div>
      </div>
      <div className="absolute pointer-events-none" style={{ bottom: `calc(${tableInsets.bottom} + 6%)`, right: '38%' }}>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ 
              background: secondaryColor, 
              opacity: accentOpacity * (0.8 - i * 0.2),
              boxShadow: `0 0 4px ${secondaryColor}`
            }} />
          ))}
        </div>
      </div>
    </>
  );
});

export default CyberpunkTableGlow;
