// ============================================
// THEME PAGE BACKGROUND - Full page backgrounds for each theme
// ============================================
// Extends theme styling to fill entire page (top/bottom edges)
// Now includes immersive 3D environments for each theme

import React, { memo } from 'react';
import { TableGlowStyleId } from '@/hooks/usePokerPreferences';
import { RealisticThemeBackground } from './theme-backgrounds';

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
            linear-gradient(180deg, 
              #0a0a1a 0%, 
              #0d0d25 10%, 
              #080815 30%,
              #050510 50%, 
              #080815 70%,
              #0d0d25 90%, 
              #0a0a1a 100%
            ),
            radial-gradient(ellipse 120% 50% at 50% 0%, rgba(0,212,255,0.25) 0%, rgba(0,150,200,0.1) 30%, transparent 60%),
            radial-gradient(ellipse 120% 50% at 50% 100%, rgba(255,0,255,0.2) 0%, rgba(180,0,180,0.08) 30%, transparent 60%),
            radial-gradient(ellipse 80% 40% at 20% 0%, rgba(255,0,255,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 80% 40% at 80% 100%, rgba(0,212,255,0.12) 0%, transparent 50%)
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
          {/* Scan lines effect - full screen */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.15) 2px, rgba(0,212,255,0.15) 4px)',
              backgroundSize: '100% 4px'
            }}
          />
          
          {/* TOP EDGE - Full width cyan glow */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '35%',
              background: `
                linear-gradient(180deg, 
                  rgba(0,212,255,0.22) 0%, 
                  rgba(0,180,220,0.12) 20%,
                  rgba(0,150,200,0.05) 50%,
                  transparent 100%
                )
              `
            }}
          />
          {/* TOP edge accent lines */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '3px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(0,212,255,0.6) 30%, rgba(255,0,255,0.4) 70%, transparent 95%)'
            }}
          />
          <div
            className="absolute top-3 left-0 right-0"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(0,212,255,0.3) 40%, rgba(255,0,255,0.2) 60%, transparent 90%)'
            }}
          />
          
          {/* BOTTOM EDGE - Full width magenta glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '35%',
              background: `
                linear-gradient(0deg, 
                  rgba(255,0,255,0.2) 0%, 
                  rgba(200,0,200,0.1) 20%,
                  rgba(150,0,150,0.04) 50%,
                  transparent 100%
                )
              `
            }}
          />
          {/* BOTTOM edge accent lines */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '3px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(255,0,255,0.5) 30%, rgba(0,212,255,0.4) 70%, transparent 95%)'
            }}
          />
          <div
            className="absolute bottom-3 left-0 right-0"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(255,0,255,0.25) 40%, rgba(0,212,255,0.15) 60%, transparent 90%)'
            }}
          />
          
          {/* Corner accents - larger and brighter */}
          <div
            className="absolute top-0 left-0"
            style={{
              width: '30%',
              height: '25%',
              background: 'radial-gradient(ellipse at 0% 0%, rgba(0,212,255,0.25) 0%, transparent 60%)'
            }}
          />
          <div
            className="absolute top-0 right-0"
            style={{
              width: '30%',
              height: '25%',
              background: 'radial-gradient(ellipse at 100% 0%, rgba(255,0,255,0.22) 0%, transparent 60%)'
            }}
          />
          <div
            className="absolute bottom-0 left-0"
            style={{
              width: '30%',
              height: '25%',
              background: 'radial-gradient(ellipse at 0% 100%, rgba(255,0,255,0.2) 0%, transparent 60%)'
            }}
          />
          <div
            className="absolute bottom-0 right-0"
            style={{
              width: '30%',
              height: '25%',
              background: 'radial-gradient(ellipse at 100% 100%, rgba(0,212,255,0.2) 0%, transparent 60%)'
            }}
          />
          
          {/* Side edge glows */}
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              width: '15%',
              background: 'linear-gradient(90deg, rgba(0,212,255,0.08) 0%, transparent 100%)'
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{
              width: '15%',
              background: 'linear-gradient(270deg, rgba(255,0,255,0.08) 0%, transparent 100%)'
            }}
          />
        </>
      )}
      
      {glowStyleId === 'matrix' && (
        <>
          {/* Digital rain lines - full screen */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 20px, rgba(0,255,65,0.2) 20px, rgba(0,255,65,0.2) 22px)',
              backgroundSize: '100% 22px'
            }}
          />
          
          {/* TOP EDGE - Full width green glow */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '30%',
              background: `
                linear-gradient(180deg, 
                  rgba(0,255,65,0.2) 0%, 
                  rgba(0,200,50,0.1) 30%,
                  rgba(0,150,40,0.04) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* TOP accent line */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(0,255,65,0.6) 50%, transparent 95%)'
            }}
          />
          
          {/* BOTTOM EDGE - Full width green glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '30%',
              background: `
                linear-gradient(0deg, 
                  rgba(0,255,65,0.18) 0%, 
                  rgba(0,200,50,0.08) 30%,
                  rgba(0,150,40,0.03) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* BOTTOM accent line */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(0,255,65,0.5) 50%, transparent 95%)'
            }}
          />
          
          {/* Side glows */}
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              width: '12%',
              background: 'linear-gradient(90deg, rgba(0,255,65,0.1) 0%, transparent 100%)'
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{
              width: '12%',
              background: 'linear-gradient(270deg, rgba(0,255,65,0.1) 0%, transparent 100%)'
            }}
          />
          
          {/* Vertical rain streams */}
          {[10, 25, 40, 55, 70, 85].map((left, i) => (
            <div 
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: `${left}%`,
                top: 0,
                bottom: 0,
                width: '1px',
                background: `linear-gradient(180deg, 
                  rgba(0,255,65,0.4) 0%, 
                  rgba(57,255,20,0.2) 20%, 
                  transparent 40%,
                  rgba(0,255,65,0.15) 60%,
                  rgba(57,255,20,0.3) 80%,
                  rgba(0,255,65,0.4) 100%
                )`,
                opacity: 0.3 + (i % 3) * 0.15
              }}
            />
          ))}
        </>
      )}
      
      {glowStyleId === 'cosmic' && (
        <>
          {/* TOP EDGE - Purple nebula glow */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '30%',
              background: `
                linear-gradient(180deg, 
                  rgba(155,89,182,0.22) 0%, 
                  rgba(120,70,150,0.1) 30%,
                  rgba(80,50,120,0.04) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* TOP accent line */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(155,89,182,0.5) 30%, rgba(52,152,219,0.4) 70%, transparent 90%)'
            }}
          />
          
          {/* BOTTOM EDGE - Blue nebula glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '30%',
              background: `
                linear-gradient(0deg, 
                  rgba(52,152,219,0.18) 0%, 
                  rgba(40,120,180,0.08) 30%,
                  rgba(30,90,140,0.03) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* BOTTOM accent line */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(52,152,219,0.4) 30%, rgba(155,89,182,0.3) 70%, transparent 90%)'
            }}
          />
          
          {/* Star dust effect - more stars */}
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                left: `${8 + i * 8}%`,
                top: `${3 + (i * 5) % 15}%`,
                opacity: 0.25 + (i % 4) * 0.12,
                boxShadow: '0 0 6px rgba(155,89,182,0.6)'
              }}
            />
          ))}
          {[...Array(12)].map((_, i) => (
            <div 
              key={`bottom-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.85)',
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                left: `${12 + i * 7}%`,
                bottom: `${3 + (i * 4) % 12}%`,
                opacity: 0.2 + (i % 3) * 0.1,
                boxShadow: '0 0 5px rgba(52,152,219,0.5)'
              }}
            />
          ))}
          
          {/* Side nebula glows */}
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              width: '15%',
              background: 'linear-gradient(90deg, rgba(155,89,182,0.1) 0%, transparent 100%)'
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{
              width: '15%',
              background: 'linear-gradient(270deg, rgba(52,152,219,0.08) 0%, transparent 100%)'
            }}
          />
        </>
      )}
      
      {glowStyleId === 'vegas' && (
        <>
          {/* TOP EDGE - Hot pink glow */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '30%',
              background: `
                linear-gradient(180deg, 
                  rgba(255,20,147,0.25) 0%, 
                  rgba(200,15,120,0.12) 25%,
                  rgba(150,10,90,0.05) 50%,
                  transparent 100%
                )
              `
            }}
          />
          {/* TOP accent lines */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '3px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(255,20,147,0.7) 25%, rgba(255,215,0,0.5) 50%, rgba(0,191,255,0.4) 75%, transparent 95%)'
            }}
          />
          <div
            className="absolute top-4 left-0 right-0"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(255,215,0,0.3) 30%, rgba(255,20,147,0.2) 70%, transparent 90%)'
            }}
          />
          
          {/* BOTTOM EDGE - Gold glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '30%',
              background: `
                linear-gradient(0deg, 
                  rgba(255,215,0,0.2) 0%, 
                  rgba(200,170,0,0.1) 25%,
                  rgba(150,130,0,0.04) 50%,
                  transparent 100%
                )
              `
            }}
          />
          {/* BOTTOM accent lines */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '3px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(57,255,20,0.5) 25%, rgba(0,191,255,0.4) 50%, rgba(255,20,147,0.6) 75%, transparent 95%)'
            }}
          />
          <div
            className="absolute bottom-4 left-0 right-0"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(0,191,255,0.25) 40%, rgba(255,215,0,0.2) 60%, transparent 90%)'
            }}
          />
          
          {/* Corner neon spots */}
          <div
            className="absolute top-0 left-0"
            style={{
              width: '25%',
              height: '20%',
              background: 'radial-gradient(ellipse at 0% 0%, rgba(255,20,147,0.3) 0%, transparent 60%)'
            }}
          />
          <div
            className="absolute top-0 right-0"
            style={{
              width: '25%',
              height: '20%',
              background: 'radial-gradient(ellipse at 100% 0%, rgba(0,191,255,0.25) 0%, transparent 60%)'
            }}
          />
          <div
            className="absolute bottom-0 left-0"
            style={{
              width: '25%',
              height: '20%',
              background: 'radial-gradient(ellipse at 0% 100%, rgba(57,255,20,0.2) 0%, transparent 60%)'
            }}
          />
          <div
            className="absolute bottom-0 right-0"
            style={{
              width: '25%',
              height: '20%',
              background: 'radial-gradient(ellipse at 100% 100%, rgba(255,215,0,0.25) 0%, transparent 60%)'
            }}
          />
          
          {/* Side neon bars */}
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              width: '3px',
              background: `linear-gradient(180deg, 
                rgba(255,20,147,0.5) 0%, 
                rgba(0,191,255,0.4) 25%,
                rgba(57,255,20,0.4) 50%,
                rgba(255,215,0,0.5) 75%,
                rgba(255,20,147,0.4) 100%
              )`
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{
              width: '3px',
              background: `linear-gradient(180deg, 
                rgba(0,191,255,0.5) 0%, 
                rgba(255,20,147,0.4) 25%,
                rgba(255,215,0,0.4) 50%,
                rgba(57,255,20,0.5) 75%,
                rgba(0,191,255,0.4) 100%
              )`
            }}
          />
        </>
      )}
      
      {glowStyleId === 'mafia' && (
        <>
          {/* TOP EDGE - Gold/warm glow */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '28%',
              background: `
                linear-gradient(180deg, 
                  rgba(212,175,55,0.18) 0%, 
                  rgba(180,140,40,0.08) 30%,
                  rgba(140,100,30,0.03) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* TOP accent line */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.5) 50%, transparent 90%)'
            }}
          />
          
          {/* BOTTOM EDGE - Brown glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '28%',
              background: `
                linear-gradient(0deg, 
                  rgba(139,90,43,0.15) 0%, 
                  rgba(100,65,30,0.06) 30%,
                  rgba(70,45,20,0.02) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* BOTTOM accent line */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(139,90,43,0.4) 50%, transparent 90%)'
            }}
          />
          
          {/* Side warm glows */}
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              width: '10%',
              background: 'linear-gradient(90deg, rgba(212,175,55,0.06) 0%, transparent 100%)'
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{
              width: '10%',
              background: 'linear-gradient(270deg, rgba(212,175,55,0.06) 0%, transparent 100%)'
            }}
          />
        </>
      )}
      
      {glowStyleId === 'western' && (
        <>
          {/* TOP EDGE - Copper glow */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '28%',
              background: `
                linear-gradient(180deg, 
                  rgba(184,115,51,0.18) 0%, 
                  rgba(150,90,40,0.08) 30%,
                  rgba(120,70,30,0.03) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* TOP accent line */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(184,115,51,0.5) 50%, transparent 90%)'
            }}
          />
          
          {/* BOTTOM EDGE - Rust glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '28%',
              background: `
                linear-gradient(0deg, 
                  rgba(139,69,19,0.15) 0%, 
                  rgba(100,50,15,0.06) 30%,
                  rgba(70,35,10,0.02) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* BOTTOM accent line */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 10%, rgba(139,69,19,0.4) 50%, transparent 90%)'
            }}
          />
          
          {/* Side copper glows */}
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              width: '10%',
              background: 'linear-gradient(90deg, rgba(184,115,51,0.06) 0%, transparent 100%)'
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{
              width: '10%',
              background: 'linear-gradient(270deg, rgba(184,115,51,0.06) 0%, transparent 100%)'
            }}
          />
        </>
      )}
      
      {glowStyleId === 'elegant' && (
        <>
          {/* TOP EDGE - Subtle gold glow */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '25%',
              background: `
                linear-gradient(180deg, 
                  rgba(212,175,55,0.12) 0%, 
                  rgba(180,150,45,0.05) 30%,
                  rgba(140,120,35,0.02) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* TOP accent line - thin elegant */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 15%, rgba(212,175,55,0.4) 50%, transparent 85%)'
            }}
          />
          
          {/* BOTTOM EDGE - Subtle warm glow */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '25%',
              background: `
                linear-gradient(0deg, 
                  rgba(180,150,50,0.1) 0%, 
                  rgba(140,120,40,0.04) 30%,
                  rgba(100,90,30,0.015) 60%,
                  transparent 100%
                )
              `
            }}
          />
          {/* BOTTOM accent line */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 15%, rgba(180,150,50,0.35) 50%, transparent 85%)'
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
      
      {/* === REALISTIC ENVIRONMENT BACKGROUND === */}
      <RealisticThemeBackground glowStyleId={glowStyleId} />
    </div>
  );
});

export default ThemePageBackground;
