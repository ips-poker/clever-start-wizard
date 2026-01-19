// ============================================
// REALISTIC THEME BACKGROUND - Lightweight image-based backgrounds
// ============================================
// Uses static images with CSS effects for atmosphere
// Zero performance impact during gameplay

import React, { memo } from 'react';
import { TableGlowStyleId } from '@/hooks/usePokerPreferences';

// Import theme background images
import loftBg from '@/assets/themes/loft-background.jpg';
import undergroundBg from '@/assets/themes/underground-background.jpg';
import vegasBg from '@/assets/themes/vegas-background.jpg';
import syndicateBg from '@/assets/themes/syndicate-background.jpg';
import cyberpunkBg from '@/assets/themes/cyberpunk-background.jpg';
import matrixBg from '@/assets/themes/matrix-background.jpg';
import cosmicBg from '@/assets/themes/cosmic-background.jpg';

interface RealisticThemeBackgroundProps {
  glowStyleId: TableGlowStyleId;
}

// Get background image and overlay color for each theme
const getThemeConfig = (glowStyleId: TableGlowStyleId) => {
  switch (glowStyleId) {
    case 'vegas': // Loft theme
      return {
        image: loftBg,
        overlayColor: 'rgba(20, 12, 5, 0.4)',
        vignetteIntensity: 0.6,
        glowColor: 'rgba(255, 140, 50, 0.15)'
      };
    case 'cosmic': // Underground theme
      return {
        image: undergroundBg,
        overlayColor: 'rgba(10, 5, 5, 0.5)',
        vignetteIntensity: 0.7,
        glowColor: 'rgba(200, 50, 50, 0.12)'
      };
    case 'western': // Vegas theme
      return {
        image: vegasBg,
        overlayColor: 'rgba(30, 10, 20, 0.35)',
        vignetteIntensity: 0.5,
        glowColor: 'rgba(255, 180, 100, 0.15)'
      };
    case 'mafia': // Syndicate theme
      return {
        image: syndicateBg,
        overlayColor: 'rgba(15, 10, 5, 0.45)',
        vignetteIntensity: 0.6,
        glowColor: 'rgba(200, 160, 80, 0.12)'
      };
    case 'cyberpunk':
      return {
        image: cyberpunkBg,
        overlayColor: 'rgba(5, 5, 15, 0.35)',
        vignetteIntensity: 0.5,
        glowColor: 'rgba(0, 200, 255, 0.1)'
      };
    case 'matrix':
      return {
        image: matrixBg,
        overlayColor: 'rgba(0, 10, 0, 0.4)',
        vignetteIntensity: 0.6,
        glowColor: 'rgba(0, 255, 100, 0.1)'
      };
    case 'elegant': // Cosmic theme
      return {
        image: cosmicBg,
        overlayColor: 'rgba(10, 10, 25, 0.35)',
        vignetteIntensity: 0.5,
        glowColor: 'rgba(150, 100, 255, 0.12)'
      };
    case 'none':
    default:
      return {
        image: syndicateBg,
        overlayColor: 'rgba(15, 10, 5, 0.45)',
        vignetteIntensity: 0.6,
        glowColor: 'rgba(200, 160, 80, 0.12)'
      };
  }
};

export const RealisticThemeBackground = memo(function RealisticThemeBackground({
  glowStyleId
}: RealisticThemeBackgroundProps) {
  const config = getThemeConfig(glowStyleId);
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Background image - static, no animations, no blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${config.image})`
        }}
      />
      
      {/* Dark overlay to make table readable */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundColor: config.overlayColor
        }}
      />
      
      {/* Subtle ambient glow in center */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 55%, ${config.glowColor} 0%, transparent 70%)`
        }}
      />
      
      {/* Vignette effect - darkens edges */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 75% 75% at 50% 50%, transparent 30%, rgba(0,0,0,${config.vignetteIntensity}) 100%)`
        }}
      />
      
      {/* Top and bottom edge darkening for immersion */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.4) 100%)
          `
        }}
      />
    </div>
  );
});

export default RealisticThemeBackground;
