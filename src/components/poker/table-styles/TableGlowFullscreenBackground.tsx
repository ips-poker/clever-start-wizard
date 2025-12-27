// ============================================
// TABLE GLOW FULLSCREEN BACKGROUND
// ============================================
// Renders only the fullscreen background portion of each glow style
// This should be rendered at the wrapper level to cover header/footer

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
  
  // Common colors for each style
  const styles: Record<string, { 
    base: string; 
    accents: Array<{ position: string; color: string; opacity: number }>;
    glows: Array<{ position: string; gradient: string; blur: number }>;
  }> = {
    cyberpunk: {
      base: 'linear-gradient(180deg, #0a0f1a 0%, #050810 50%, #020408 100%)',
      accents: [
        { position: 'ellipse at 20% 30%', color: '#00d4ff', opacity: 0.08 },
        { position: 'ellipse at 80% 30%', color: '#ff00ff', opacity: 0.06 },
        { position: 'ellipse at 50% 70%', color: '#00d4ff', opacity: 0.04 },
      ],
      glows: [
        { position: 'top', gradient: 'linear-gradient(180deg, rgba(0,212,255,0.15), transparent)', blur: 40 },
        { position: 'left', gradient: 'linear-gradient(90deg, rgba(255,0,255,0.08), transparent)', blur: 50 },
        { position: 'right', gradient: 'linear-gradient(-90deg, rgba(0,212,255,0.08), transparent)', blur: 50 },
        { position: 'bottom', gradient: 'linear-gradient(0deg, rgba(255,0,255,0.1), transparent)', blur: 40 },
      ]
    },
    mafia: {
      base: 'linear-gradient(180deg, #1a0a0a 0%, #0d0505 50%, #050202 100%)',
      accents: [
        { position: 'ellipse at 50% 50%', color: '#d4af37', opacity: 0.06 },
        { position: 'ellipse at 30% 70%', color: '#8b0000', opacity: 0.08 },
        { position: 'ellipse at 70% 70%', color: '#8b0000', opacity: 0.08 },
      ],
      glows: [
        { position: 'top', gradient: 'linear-gradient(180deg, rgba(212,175,55,0.1), transparent)', blur: 50 },
        { position: 'bottom', gradient: 'linear-gradient(0deg, rgba(139,0,0,0.15), transparent)', blur: 40 },
      ]
    },
    western: {
      base: 'linear-gradient(180deg, #1a1208 0%, #0d0904 50%, #050402 100%)',
      accents: [
        { position: 'ellipse at 50% 40%', color: '#cd853f', opacity: 0.1 },
        { position: 'ellipse at 30% 80%', color: '#8b4513', opacity: 0.08 },
        { position: 'ellipse at 70% 80%', color: '#8b4513', opacity: 0.08 },
      ],
      glows: [
        { position: 'top', gradient: 'linear-gradient(180deg, rgba(205,133,63,0.12), transparent)', blur: 50 },
        { position: 'bottom', gradient: 'linear-gradient(0deg, rgba(139,69,19,0.1), transparent)', blur: 40 },
      ]
    },
    cosmic: {
      base: 'linear-gradient(180deg, #0a0520 0%, #050210 50%, #020108 100%)',
      accents: [
        { position: 'ellipse at 20% 20%', color: '#9333ea', opacity: 0.1 },
        { position: 'ellipse at 80% 30%', color: '#3b82f6', opacity: 0.08 },
        { position: 'ellipse at 50% 80%', color: '#ec4899', opacity: 0.06 },
      ],
      glows: [
        { position: 'top', gradient: 'linear-gradient(180deg, rgba(147,51,234,0.12), transparent)', blur: 50 },
        { position: 'left', gradient: 'linear-gradient(90deg, rgba(59,130,246,0.08), transparent)', blur: 50 },
        { position: 'right', gradient: 'linear-gradient(-90deg, rgba(236,72,153,0.08), transparent)', blur: 50 },
      ]
    },
    vegas: {
      // Smoother base to avoid visible banding/"split" in the middle of the screen
      base: 'linear-gradient(180deg, #0a0512 0%, #06030c 35%, #030208 70%, #0a0512 100%)',
      accents: [
        { position: 'ellipse 120% 80% at 20% 15%', color: '#ff1493', opacity: 0.10 },
        { position: 'ellipse 120% 80% at 80% 15%', color: '#00bfff', opacity: 0.08 },
        { position: 'ellipse 120% 80% at 20% 85%', color: '#39ff14', opacity: 0.06 },
        { position: 'ellipse 120% 80% at 80% 85%', color: '#ffd700', opacity: 0.08 },
        { position: 'ellipse 100% 60% at 50% 50%', color: '#ff1493', opacity: 0.04 },
      ],
      glows: [
        // Keep glows soft and large; we render them full-screen to avoid seam lines
        { position: 'top', gradient: 'linear-gradient(180deg, rgba(255,20,147,0.14) 0%, rgba(255,20,147,0.05) 45%, transparent 100%)', blur: 70 },
        { position: 'left', gradient: 'linear-gradient(90deg, rgba(57,255,20,0.10) 0%, rgba(57,255,20,0.03) 55%, transparent 100%)', blur: 90 },
        { position: 'right', gradient: 'linear-gradient(-90deg, rgba(0,191,255,0.10) 0%, rgba(0,191,255,0.03) 55%, transparent 100%)', blur: 90 },
        { position: 'bottom', gradient: 'linear-gradient(0deg, rgba(255,215,0,0.12) 0%, rgba(255,215,0,0.04) 45%, transparent 100%)', blur: 70 },
      ]
    },
    matrix: {
      base: 'linear-gradient(180deg, #001a00 0%, #000d00 50%, #000500 100%)',
      accents: [
        { position: 'ellipse at 50% 30%', color: '#00ff00', opacity: 0.08 },
        { position: 'ellipse at 30% 70%', color: '#00ff00', opacity: 0.04 },
        { position: 'ellipse at 70% 70%', color: '#00ff00', opacity: 0.04 },
      ],
      glows: [
        { position: 'top', gradient: 'linear-gradient(180deg, rgba(0,255,0,0.1), transparent)', blur: 50 },
        { position: 'bottom', gradient: 'linear-gradient(0deg, rgba(0,255,0,0.08), transparent)', blur: 40 },
      ]
    },
    elegant: {
      base: 'linear-gradient(180deg, #141414 0%, #0a0a0a 50%, #050505 100%)',
      accents: [
        { position: 'ellipse at 50% 40%', color: '#d4af37', opacity: 0.04 },
        { position: 'ellipse at 50% 60%', color: '#ffffff', opacity: 0.02 },
      ],
      glows: [
        { position: 'top', gradient: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)', blur: 60 },
        { position: 'bottom', gradient: 'linear-gradient(0deg, rgba(212,175,55,0.05), transparent)', blur: 50 },
      ]
    }
  };
  
  const style = styles[glowStyleId];
  if (!style) return null;

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const cleaned = hex.replace('#', '');
    const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
    if (full.length !== 6) return null;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return { r, g, b };
  };

  const rgba = (hex: string, alpha: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(255,255,255,${alpha})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  };

  // Build accent gradients with smooth falloff (avoid #RRGGBBAA for better WebView support)
  const accentGradients = style.accents
    .map((a) => {
      const a1 = Math.max(0, Math.min(1, a.opacity * intensity));
      const a2 = Math.max(0, Math.min(1, a1 * 0.5));
      return `radial-gradient(${a.position}, ${rgba(a.color, a1)} 0%, ${rgba(a.color, a2)} 30%, transparent 70%)`;
    })
    .join(', ');
  
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Base gradient with accent colors */}
      <div
        className="absolute inset-0"
        style={{
          background: `${accentGradients}, ${style.base}`
        }}
      />

      {/* Directional glows (rendered full-screen to avoid visible seams) */}
      {style.glows.map((glow, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: '-25%',
            left: '-25%',
            right: '-25%',
            bottom: '-25%',
            background: glow.gradient,
            filter: `blur(${glow.blur}px)`,
            opacity: intensity
          }}
        />
      ))}
    </div>
  );
});

export default TableGlowFullscreenBackground;
