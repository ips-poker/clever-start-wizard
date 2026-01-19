// ============================================
// THEME PAGE BACKGROUND - Full page backgrounds for each theme
// ============================================
// Extends theme styling to fill entire page (top/bottom edges)

import React, { memo } from 'react';
import { TableGlowStyleId } from '@/hooks/usePokerPreferences';

interface ThemePageBackgroundProps {
  glowStyleId: TableGlowStyleId;
  themeColor?: string;
}

export const ThemePageBackground = memo(function ThemePageBackground({
  glowStyleId,
  themeColor = '#0d5c2e'
}: ThemePageBackgroundProps) {
  
  // Theme-specific full-page backgrounds
  const getBackgroundStyle = () => {
    switch (glowStyleId) {
      case 'cyberpunk':
        return {
          background: `
            linear-gradient(180deg, #0a0a1a 0%, #0d0d20 20%, #050510 50%, #0a0a15 80%, #000008 100%),
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(0,212,255,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(255,0,255,0.1) 0%, transparent 50%)
          `,
          backgroundBlendMode: 'normal'
        };
        
      case 'mafia':
        return {
          background: `
            linear-gradient(180deg, #1a1510 0%, #0f0c08 20%, #0a0805 50%, #0f0c08 80%, #050402 100%),
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(139,90,43,0.08) 0%, transparent 50%)
          `
        };
        
      case 'western':
        return {
          background: `
            linear-gradient(180deg, #1a1008 0%, #120c05 20%, #0a0604 50%, #120c05 80%, #050302 100%),
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(184,115,51,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(139,69,19,0.08) 0%, transparent 50%)
          `
        };
        
      case 'cosmic':
        return {
          background: `
            linear-gradient(180deg, #0a0515 0%, #080410 20%, #050208 50%, #080410 80%, #020105 100%),
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(155,89,182,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(52,152,219,0.1) 0%, transparent 50%)
          `
        };
        
      case 'vegas':
        return {
          background: `
            linear-gradient(180deg, #150510 0%, #100408 20%, #080205 50%, #100408 80%, #050102 100%),
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(255,20,147,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(255,215,0,0.08) 0%, transparent 50%)
          `
        };
        
      case 'matrix':
        return {
          background: `
            linear-gradient(180deg, #001a00 0%, #001200 20%, #000a00 50%, #001200 80%, #000500 100%),
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(0,255,65,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,200,50,0.06) 0%, transparent 50%)
          `
        };
        
      case 'elegant':
        return {
          background: `
            linear-gradient(180deg, #12100e 0%, #0d0b09 20%, #080706 50%, #0d0b09 80%, #040403 100%),
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(212,175,55,0.1) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(180,150,50,0.06) 0%, transparent 50%)
          `
        };
        
      case 'none':
      default:
        // Default dark tech background matching SyndikateTableBackground
        return {
          background: `
            linear-gradient(180deg, #0a1520 0%, #050a0f 20%, #020508 50%, #050a0f 80%, #000000 100%),
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(20,80,100,0.2) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,60,80,0.1) 0%, transparent 50%)
          `
        };
    }
  };

  const backgroundStyle = getBackgroundStyle();

  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ ...backgroundStyle, zIndex: 0 }}
    >
      {/* Theme-specific ambient effects */}
      {glowStyleId === 'cyberpunk' && (
        <>
          {/* Scan lines effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)',
              backgroundSize: '100% 4px'
            }}
          />
          {/* Corner glows */}
          <div
            className="absolute top-0 left-0"
            style={{
              width: '128px',
              height: '128px',
              background: 'radial-gradient(circle at 0% 0%, rgba(0,212,255,0.18) 0%, transparent 70%)'
            }}
          />
          <div
            className="absolute top-0 right-0"
            style={{
              width: '128px',
              height: '128px',
              background: 'radial-gradient(circle at 100% 0%, rgba(255,0,255,0.16) 0%, transparent 70%)'
            }}
          />
          <div
            className="absolute bottom-0 left-0"
            style={{
              width: '128px',
              height: '128px',
              background: 'radial-gradient(circle at 0% 100%, rgba(255,0,255,0.14) 0%, transparent 70%)'
            }}
          />
          <div
            className="absolute bottom-0 right-0"
            style={{
              width: '128px',
              height: '128px',
              background: 'radial-gradient(circle at 100% 100%, rgba(0,212,255,0.14) 0%, transparent 70%)'
            }}
          />
        </>
      )}
      
      {glowStyleId === 'matrix' && (
        <>
          {/* Digital rain effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.02]"
            style={{
              backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 20px, rgba(0,255,65,0.15) 20px, rgba(0,255,65,0.15) 22px)',
              backgroundSize: '100% 22px'
            }}
          />
        </>
      )}
      
      {glowStyleId === 'cosmic' && (
        <>
          {/* Star dust effect */}
          {[...Array(8)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                left: `${10 + i * 12}%`,
                top: `${5 + (i * 7) % 20}%`,
                opacity: 0.2 + (i % 4) * 0.1,
                boxShadow: '0 0 4px rgba(255,255,255,0.5)'
              }}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <div 
              key={`bottom-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.85)',
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                left: `${15 + i * 11}%`,
                bottom: `${5 + (i * 6) % 18}%`,
                opacity: 0.15 + (i % 3) * 0.1,
                boxShadow: '0 0 4px rgba(155,89,182,0.5)'
              }}
            />
          ))}
        </>
      )}
      
      {glowStyleId === 'vegas' && (
        <>
          {/* Neon glow spots */}
          <div
            className="absolute top-4 left-1/4"
            style={{
              width: '80px',
              height: '4px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,20,147,0.22) 50%, transparent 100%)'
            }}
          />
          <div
            className="absolute top-8 right-1/4"
            style={{
              width: '64px',
              height: '4px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.18) 50%, transparent 100%)'
            }}
          />
          <div
            className="absolute bottom-6 left-1/3"
            style={{
              width: '96px',
              height: '4px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,20,147,0.16) 50%, transparent 100%)'
            }}
          />
          <div
            className="absolute bottom-10 right-1/3"
            style={{
              width: '80px',
              height: '4px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.14) 50%, transparent 100%)'
            }}
          />
        </>
      )}
      
      {/* Vignette for all themes */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 45%, rgba(0,0,0,0.22) 100%)'
        }}
      />
    </div>
  );
});

export default ThemePageBackground;
