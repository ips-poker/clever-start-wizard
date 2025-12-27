// ============================================
// TABLE GLOW FULLSCREEN BACKGROUND
// ============================================
// Single seamless dark gradient background for poker table

import React, { memo } from 'react';

interface TableGlowFullscreenBackgroundProps {
  glowStyleId: string;
  intensity?: number;
}

export const TableGlowFullscreenBackground = memo(function TableGlowFullscreenBackground({
  glowStyleId,
  intensity = 0.8
}: TableGlowFullscreenBackgroundProps) {
  
  if (glowStyleId === 'none') return null;
  
  // Single unified dark background per style - no separate layers
  const backgrounds: Record<string, string> = {
    cyberpunk: 'radial-gradient(ellipse 150% 100% at 50% 0%, rgba(0,212,255,0.12) 0%, transparent 50%), radial-gradient(ellipse 150% 100% at 50% 100%, rgba(255,0,255,0.08) 0%, transparent 50%), linear-gradient(180deg, #0a0f1a 0%, #050810 100%)',
    mafia: 'radial-gradient(ellipse 120% 80% at 50% 100%, rgba(139,0,0,0.15) 0%, transparent 60%), radial-gradient(ellipse 100% 60% at 50% 30%, rgba(212,175,55,0.06) 0%, transparent 50%), linear-gradient(180deg, #1a0a0a 0%, #0d0505 60%, #050202 100%)',
    western: 'radial-gradient(ellipse 120% 80% at 50% 100%, rgba(139,69,19,0.12) 0%, transparent 60%), radial-gradient(ellipse 100% 60% at 50% 30%, rgba(205,133,63,0.08) 0%, transparent 50%), linear-gradient(180deg, #1a1208 0%, #0d0904 60%, #050402 100%)',
    cosmic: 'radial-gradient(ellipse 100% 80% at 20% 20%, rgba(147,51,234,0.1) 0%, transparent 50%), radial-gradient(ellipse 100% 80% at 80% 80%, rgba(59,130,246,0.08) 0%, transparent 50%), linear-gradient(180deg, #0a0520 0%, #050210 60%, #020108 100%)',
    vegas: 'radial-gradient(ellipse 140% 100% at 50% 0%, rgba(255,20,147,0.12) 0%, transparent 45%), radial-gradient(ellipse 140% 100% at 50% 100%, rgba(255,215,0,0.08) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 20% 50%, rgba(57,255,20,0.06) 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 80% 50%, rgba(0,191,255,0.06) 0%, transparent 50%), linear-gradient(180deg, #0a0512 0%, #06030c 50%, #030208 100%)',
    matrix: 'radial-gradient(ellipse 120% 80% at 50% 30%, rgba(0,255,0,0.08) 0%, transparent 50%), radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,255,0,0.05) 0%, transparent 50%), linear-gradient(180deg, #001a00 0%, #000d00 60%, #000500 100%)',
    elegant: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(212,175,55,0.04) 0%, transparent 50%), linear-gradient(180deg, #141414 0%, #0a0a0a 60%, #050505 100%)'
  };
  
  const bg = backgrounds[glowStyleId];
  if (!bg) return null;
  
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: bg }}
    />
  );
});

export default TableGlowFullscreenBackground;
