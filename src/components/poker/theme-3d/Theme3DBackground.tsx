// ============================================
// THEME 3D BACKGROUND - Selects scene based on theme
// ============================================

import React, { memo, Suspense, lazy } from 'react';
import { TableGlowStyleId } from '@/hooks/usePokerPreferences';
import { Theme3DCanvas } from './Theme3DCanvas';

// Lazy load scenes for performance
const CyberpunkScene = lazy(() => import('./scenes/CyberpunkScene'));
const VegasScene = lazy(() => import('./scenes/VegasScene'));
const LoftScene = lazy(() => import('./scenes/LoftScene'));
const UndergroundScene = lazy(() => import('./scenes/UndergroundScene'));
const SyndicateScene = lazy(() => import('./scenes/SyndicateScene'));
const MatrixScene = lazy(() => import('./scenes/MatrixScene'));
const CosmicScene = lazy(() => import('./scenes/CosmicScene'));

interface Theme3DBackgroundProps {
  glowStyleId: TableGlowStyleId;
}

export const Theme3DBackground = memo(function Theme3DBackground({
  glowStyleId
}: Theme3DBackgroundProps) {
  
  const renderScene = () => {
    switch (glowStyleId) {
      case 'cyberpunk':
        return <CyberpunkScene />;
      case 'vegas':
        return <LoftScene />; // Loft theme
      case 'cosmic':
        return <UndergroundScene />; // Underground theme
      case 'mafia':
        return <SyndicateScene />; // Syndicate theme
      case 'matrix':
        return <MatrixScene />; // Low House theme
      case 'elegant':
        return <CosmicScene />; // Cosmic theme
      case 'western':
        return <VegasScene />; // Vegas theme
      case 'none':
      default:
        return <SyndicateScene />; // Default Syndicate
    }
  };
  
  return (
    <Theme3DCanvas>
      <Suspense fallback={null}>
        {renderScene()}
      </Suspense>
    </Theme3DCanvas>
  );
});

export default Theme3DBackground;
