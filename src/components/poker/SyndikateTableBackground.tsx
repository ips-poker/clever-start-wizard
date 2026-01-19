// ============================================
// SYNDIKATE TABLE BACKGROUND - Premium Dark Tech Style
// ============================================
// Inspired by PPPoker's dark tech aesthetic, adapted for Syndikate's mafia theme

import React, { memo } from 'react';
import syndikateLogo from '@/assets/syndikate-logo-main.png';

interface SyndikateTableBackgroundProps {
  themeColor?: string;
}

export const SyndikateTableBackground = memo(function SyndikateTableBackground({
  themeColor = '#0d5c2e'
}: SyndikateTableBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden will-change-auto pointer-events-none">
      {/* Base layer removed - now using ThemePageBackground in wrapper */}
      {/* Only keeping accent glows that complement the theme */}
      
      {/* Combined ambient glows - reduced intensity, transparent base */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(20,80,100,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 40% 50% at 0% 50%, rgba(0,80,100,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 40% 50% at 100% 50%, rgba(0,80,100,0.08) 0%, transparent 50%)
          `
        }}
      />
      
      {/* REMOVED: Heavy SVG corners and side indicators for mobile performance */}
      
      {/* Vignette overlay - reduced intensity since ThemePageBackground has its own */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 75% 75% at 50% 45%, transparent 40%, rgba(0,0,0,0.25) 100%)'
        }}
      />
      
      {/* REMOVED: Heavy noise texture SVG filter for mobile performance */}
      
      {/* Ambient gold glow - OPTIMIZED: removed blur filter, using larger gradient instead */}
      <div 
        className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-64 h-40 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 40%, transparent 60%)'
        }}
      />
    </div>
  );
});

export default SyndikateTableBackground;
