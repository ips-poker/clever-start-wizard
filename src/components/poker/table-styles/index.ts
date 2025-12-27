// ============================================
// TABLE GLOW STYLES - Export All Styles
// ============================================

export { CyberpunkTableGlow } from '../CyberpunkTableGlow';
export { MafiaTableGlow } from './MafiaTableGlow';
export { WesternTableGlow } from './WesternTableGlow';
export { CosmicTableGlow } from './CosmicTableGlow';
export { NeonVegasTableGlow } from './NeonVegasTableGlow';
export { MatrixTableGlow } from './MatrixTableGlow';
export { MinimalElegantTableGlow } from './MinimalElegantTableGlow';

// Style definitions for preferences
export const TABLE_GLOW_STYLES = [
  { 
    id: 'none', 
    name: 'Без подсветки', 
    description: 'Классический вид без эффектов',
    preview: '#1a1a2e'
  },
  { 
    id: 'cyberpunk', 
    name: 'Киберпанк', 
    description: 'Hi-tech неоновое свечение',
    preview: '#00d4ff'
  },
  { 
    id: 'mafia', 
    name: 'Мафия', 
    description: 'Элегантный золотой стиль',
    preview: '#d4a574'
  },
  { 
    id: 'western', 
    name: 'Вестерн', 
    description: 'Тёплый медный салун',
    preview: '#b87333'
  },
  { 
    id: 'cosmic', 
    name: 'Космос', 
    description: 'Глубокий космос и туманности',
    preview: '#9b59b6'
  },
  { 
    id: 'vegas', 
    name: 'Вегас', 
    description: 'Яркие неоновые огни',
    preview: '#ff1493'
  },
  { 
    id: 'matrix', 
    name: 'Матрица', 
    description: 'Цифровой дождь',
    preview: '#00ff41'
  },
  { 
    id: 'elegant', 
    name: 'Элегант', 
    description: 'Минималистичная роскошь',
    preview: '#d4af37'
  },
] as const;

export type TableGlowStyleId = typeof TABLE_GLOW_STYLES[number]['id'];
