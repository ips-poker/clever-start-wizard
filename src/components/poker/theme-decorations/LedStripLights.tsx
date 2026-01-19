// ============================================
// LED STRIP LIGHTS - Subtle ambient lighting component
// ============================================
// Длинные LED-лампы с плавным медленным свечением
// Уютная атмосфера, не отвлекает от игры

import React, { memo } from 'react';

interface LedStripProps {
  color: string;
  secondaryColor?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  intensity?: number; // 0.1 to 1
  width?: string;
  glow?: boolean;
}

const LedStrip = memo(function LedStrip({ 
  color, 
  secondaryColor,
  position, 
  intensity = 0.6,
  width = '60%',
  glow = true
}: LedStripProps) {
  const getPositionStyles = (): React.CSSProperties => {
    const secondary = secondaryColor || color;
    
    switch (position) {
      case 'top':
        return {
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width,
          height: '3px',
          background: `linear-gradient(90deg, transparent 0%, ${color} 20%, ${secondary} 50%, ${color} 80%, transparent 100%)`,
          boxShadow: glow ? `0 0 20px ${color}, 0 2px 40px ${color}` : undefined
        };
      case 'bottom':
        return {
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width,
          height: '3px',
          background: `linear-gradient(90deg, transparent 0%, ${color} 20%, ${secondary} 50%, ${color} 80%, transparent 100%)`,
          boxShadow: glow ? `0 0 20px ${color}, 0 -2px 40px ${color}` : undefined
        };
      case 'left':
        return {
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: width,
          background: `linear-gradient(180deg, transparent 0%, ${color} 20%, ${secondary} 50%, ${color} 80%, transparent 100%)`,
          boxShadow: glow ? `0 0 20px ${color}, 2px 0 40px ${color}` : undefined
        };
      case 'right':
        return {
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: width,
          background: `linear-gradient(180deg, transparent 0%, ${color} 20%, ${secondary} 50%, ${color} 80%, transparent 100%)`,
          boxShadow: glow ? `0 0 20px ${color}, -2px 0 40px ${color}` : undefined
        };
      case 'top-left':
        return {
          top: 0,
          left: 0,
          width: '35%',
          height: '3px',
          background: `linear-gradient(90deg, ${color} 0%, ${secondary} 40%, transparent 100%)`,
          boxShadow: glow ? `0 0 15px ${color}` : undefined
        };
      case 'top-right':
        return {
          top: 0,
          right: 0,
          width: '35%',
          height: '3px',
          background: `linear-gradient(90deg, transparent 0%, ${secondary} 60%, ${color} 100%)`,
          boxShadow: glow ? `0 0 15px ${color}` : undefined
        };
      case 'bottom-left':
        return {
          bottom: 0,
          left: 0,
          width: '35%',
          height: '3px',
          background: `linear-gradient(90deg, ${color} 0%, ${secondary} 40%, transparent 100%)`,
          boxShadow: glow ? `0 0 15px ${color}` : undefined
        };
      case 'bottom-right':
        return {
          bottom: 0,
          right: 0,
          width: '35%',
          height: '3px',
          background: `linear-gradient(90deg, transparent 0%, ${secondary} 60%, ${color} 100%)`,
          boxShadow: glow ? `0 0 15px ${color}` : undefined
        };
      default:
        return {};
    }
  };

  return (
    <div
      className="absolute pointer-events-none led-strip-breathe"
      style={{
        ...getPositionStyles(),
        opacity: intensity,
        borderRadius: '2px'
      }}
    />
  );
});

// ============================================
// LOFT Theme - Теплый индустриальный стиль
// ============================================
export const LoftLedElements = memo(function LoftLedElements() {
  const warmOrange = 'rgba(255, 140, 50, 0.9)';
  const warmYellow = 'rgba(255, 180, 80, 0.8)';
  const dimWhite = 'rgba(255, 220, 180, 0.6)';
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Теплые горизонтальные LED полосы сверху и снизу */}
      <LedStrip color={warmOrange} secondaryColor={warmYellow} position="top" intensity={0.5} width="70%" />
      <LedStrip color={warmOrange} secondaryColor={warmYellow} position="bottom" intensity={0.4} width="70%" />
      
      {/* Боковые вертикальные полосы - как лофт-освещение */}
      <LedStrip color={dimWhite} secondaryColor={warmOrange} position="left" intensity={0.35} width="50%" />
      <LedStrip color={dimWhite} secondaryColor={warmOrange} position="right" intensity={0.35} width="50%" />
      
      {/* Угловые акценты - имитация индустриальных ламп */}
      <div 
        className="absolute top-3 left-3 w-2 h-2 rounded-full led-strip-breathe"
        style={{ 
          background: warmOrange,
          boxShadow: `0 0 15px ${warmOrange}, 0 0 30px rgba(255, 140, 50, 0.4)`,
          opacity: 0.7
        }} 
      />
      <div 
        className="absolute top-3 right-3 w-2 h-2 rounded-full led-strip-breathe"
        style={{ 
          background: warmOrange,
          boxShadow: `0 0 15px ${warmOrange}, 0 0 30px rgba(255, 140, 50, 0.4)`,
          opacity: 0.7,
          animationDelay: '2s'
        }} 
      />
      <div 
        className="absolute bottom-3 left-3 w-2 h-2 rounded-full led-strip-breathe"
        style={{ 
          background: warmYellow,
          boxShadow: `0 0 15px ${warmYellow}`,
          opacity: 0.6,
          animationDelay: '1s'
        }} 
      />
      <div 
        className="absolute bottom-3 right-3 w-2 h-2 rounded-full led-strip-breathe"
        style={{ 
          background: warmYellow,
          boxShadow: `0 0 15px ${warmYellow}`,
          opacity: 0.6,
          animationDelay: '3s'
        }} 
      />

      {/* Тёплое отражение по краям */}
      <div 
        className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255, 140, 50, 0.08) 0%, transparent 100%)'
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(255, 140, 50, 0.06) 0%, transparent 100%)'
        }}
      />
    </div>
  );
});

// ============================================
// UNDERGROUND Theme - Тёмный андеграунд клуб
// ============================================
export const UndergroundLedElements = memo(function UndergroundLedElements() {
  const deepRed = 'rgba(180, 30, 30, 0.9)';
  const darkRed = 'rgba(120, 20, 20, 0.8)';
  const dimRed = 'rgba(100, 15, 15, 0.6)';
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Минимальные красные LED полосы - атмосфера подполья */}
      <LedStrip color={deepRed} secondaryColor={darkRed} position="top-left" intensity={0.55} />
      <LedStrip color={deepRed} secondaryColor={darkRed} position="top-right" intensity={0.55} />
      <LedStrip color={darkRed} secondaryColor={deepRed} position="bottom-left" intensity={0.45} />
      <LedStrip color={darkRed} secondaryColor={deepRed} position="bottom-right" intensity={0.45} />
      
      {/* Вертикальные акценты по бокам */}
      <LedStrip color={dimRed} position="left" intensity={0.3} width="40%" />
      <LedStrip color={dimRed} position="right" intensity={0.3} width="40%" />
      
      {/* Красные точки-маячки в углах */}
      <div 
        className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full led-strip-breathe"
        style={{ 
          background: deepRed,
          boxShadow: `0 0 10px ${deepRed}`,
          opacity: 0.8
        }} 
      />
      <div 
        className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full led-strip-breathe"
        style={{ 
          background: deepRed,
          boxShadow: `0 0 10px ${deepRed}`,
          opacity: 0.8,
          animationDelay: '2.5s'
        }} 
      />

      {/* Глубокое красное свечение по краям */}
      <div 
        className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(120, 20, 20, 0.12) 0%, transparent 100%)'
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(120, 20, 20, 0.08) 0%, transparent 100%)'
        }}
      />
    </div>
  );
});

// ============================================
// HI-TECH Theme - Футуристичный холодный стиль
// ============================================
export const HiTechLedElements = memo(function HiTechLedElements() {
  const coldBlue = 'rgba(0, 150, 255, 0.85)';
  const iceBlue = 'rgba(100, 200, 255, 0.75)';
  const whiteBlue = 'rgba(200, 230, 255, 0.6)';
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Холодные горизонтальные LED линии */}
      <LedStrip color={coldBlue} secondaryColor={iceBlue} position="top" intensity={0.6} width="80%" />
      <LedStrip color={coldBlue} secondaryColor={iceBlue} position="bottom" intensity={0.5} width="80%" />
      
      {/* Боковые вертикальные полосы */}
      <LedStrip color={iceBlue} secondaryColor={whiteBlue} position="left" intensity={0.4} width="60%" />
      <LedStrip color={iceBlue} secondaryColor={whiteBlue} position="right" intensity={0.4} width="60%" />
      
      {/* Дополнительные угловые LED */}
      <LedStrip color={whiteBlue} position="top-left" intensity={0.35} />
      <LedStrip color={whiteBlue} position="top-right" intensity={0.35} />
      
      {/* Технологичные точки в углах */}
      <div 
        className="absolute top-3 left-3 w-2 h-2 rounded-sm led-strip-breathe"
        style={{ 
          background: coldBlue,
          boxShadow: `0 0 12px ${coldBlue}`,
          opacity: 0.75
        }} 
      />
      <div 
        className="absolute top-3 right-3 w-2 h-2 rounded-sm led-strip-breathe"
        style={{ 
          background: coldBlue,
          boxShadow: `0 0 12px ${coldBlue}`,
          opacity: 0.75,
          animationDelay: '1.5s'
        }} 
      />
      <div 
        className="absolute bottom-3 left-3 w-2 h-2 rounded-sm led-strip-breathe"
        style={{ 
          background: iceBlue,
          boxShadow: `0 0 10px ${iceBlue}`,
          opacity: 0.6,
          animationDelay: '3s'
        }} 
      />
      <div 
        className="absolute bottom-3 right-3 w-2 h-2 rounded-sm led-strip-breathe"
        style={{ 
          background: iceBlue,
          boxShadow: `0 0 10px ${iceBlue}`,
          opacity: 0.6,
          animationDelay: '4.5s'
        }} 
      />

      {/* Холодное свечение сверху */}
      <div 
        className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 150, 255, 0.1) 0%, transparent 100%)'
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(0, 150, 255, 0.07) 0%, transparent 100%)'
        }}
      />
    </div>
  );
});

// ============================================
// SYNDICATE Theme - Элитный клуб синдиката
// ============================================
export const SyndicateLedElements = memo(function SyndicateLedElements() {
  const gold = 'rgba(212, 175, 55, 0.9)';
  const darkGold = 'rgba(180, 140, 40, 0.75)';
  const dimGold = 'rgba(150, 120, 50, 0.5)';
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Золотые LED акценты - роскошный стиль */}
      <LedStrip color={gold} secondaryColor={darkGold} position="top" intensity={0.55} width="65%" />
      <LedStrip color={darkGold} secondaryColor={gold} position="bottom" intensity={0.45} width="65%" />
      
      {/* Угловые золотые линии */}
      <LedStrip color={gold} position="top-left" intensity={0.5} />
      <LedStrip color={gold} position="top-right" intensity={0.5} />
      <LedStrip color={darkGold} position="bottom-left" intensity={0.4} />
      <LedStrip color={darkGold} position="bottom-right" intensity={0.4} />
      
      {/* Боковое минимальное освещение */}
      <LedStrip color={dimGold} position="left" intensity={0.3} width="45%" />
      <LedStrip color={dimGold} position="right" intensity={0.3} width="45%" />
      
      {/* Элитные золотые точки */}
      <div 
        className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full led-strip-breathe"
        style={{ 
          background: gold,
          boxShadow: `0 0 12px ${gold}`,
          opacity: 0.8
        }} 
      />
      <div 
        className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full led-strip-breathe"
        style={{ 
          background: gold,
          boxShadow: `0 0 12px ${gold}`,
          opacity: 0.8,
          animationDelay: '2s'
        }} 
      />

      {/* Золотое отражение */}
      <div 
        className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, transparent 100%)'
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%)'
        }}
      />
    </div>
  );
});

// ============================================
// LOW HOUSE Theme - Уютный домашний покер
// ============================================
export const LowHouseLedElements = memo(function LowHouseLedElements() {
  const softGreen = 'rgba(80, 160, 80, 0.8)';
  const warmGreen = 'rgba(100, 180, 100, 0.7)';
  const dimGreen = 'rgba(60, 120, 60, 0.5)';
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Мягкие зелёные LED - классический покерный стиль */}
      <LedStrip color={softGreen} secondaryColor={warmGreen} position="top" intensity={0.45} width="55%" />
      <LedStrip color={softGreen} secondaryColor={warmGreen} position="bottom" intensity={0.35} width="55%" />
      
      {/* Минимальные боковые акценты */}
      <LedStrip color={dimGreen} position="left" intensity={0.25} width="35%" />
      <LedStrip color={dimGreen} position="right" intensity={0.25} width="35%" />
      
      {/* Уютные угловые точки */}
      <div 
        className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full led-strip-breathe"
        style={{ 
          background: softGreen,
          boxShadow: `0 0 10px ${softGreen}`,
          opacity: 0.65
        }} 
      />
      <div 
        className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full led-strip-breathe"
        style={{ 
          background: softGreen,
          boxShadow: `0 0 10px ${softGreen}`,
          opacity: 0.65,
          animationDelay: '3s'
        }} 
      />
      <div 
        className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full led-strip-breathe"
        style={{ 
          background: warmGreen,
          boxShadow: `0 0 8px ${warmGreen}`,
          opacity: 0.5,
          animationDelay: '1.5s'
        }} 
      />
      <div 
        className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full led-strip-breathe"
        style={{ 
          background: warmGreen,
          boxShadow: `0 0 8px ${warmGreen}`,
          opacity: 0.5,
          animationDelay: '4.5s'
        }} 
      />

      {/* Мягкое зелёное свечение */}
      <div 
        className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(80, 160, 80, 0.06) 0%, transparent 100%)'
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(80, 160, 80, 0.04) 0%, transparent 100%)'
        }}
      />
    </div>
  );
});

export { LedStrip };
