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
    <div className="absolute inset-0 overflow-hidden">
      {/* Base dark gradient - deep tech background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a1520 0%, #050a0f 30%, #020508 60%, #000000 100%)'
        }}
      />
      
      {/* Teal/cyan ambient glow at top - tech atmosphere */}
      <div 
        className="absolute top-0 left-0 right-0 h-[45%]"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(20,80,100,0.4) 0%, rgba(10,40,60,0.2) 40%, transparent 70%)'
        }}
      />
      
      {/* Side ambient lights - teal glow */}
      <div 
        className="absolute top-1/4 left-0 w-[30%] h-[50%]"
        style={{
          background: 'radial-gradient(ellipse at 0% 50%, rgba(0,80,100,0.15) 0%, transparent 60%)'
        }}
      />
      <div 
        className="absolute top-1/4 right-0 w-[30%] h-[50%]"
        style={{
          background: 'radial-gradient(ellipse at 100% 50%, rgba(0,80,100,0.15) 0%, transparent 60%)'
        }}
      />
      
      {/* Tech grid overlay - subtle horizontal lines */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,180,200,0.2) 40px, rgba(0,180,200,0.2) 41px),
              repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0,180,200,0.1) 60px, rgba(0,180,200,0.1) 61px)
            `
          }}
        />
      </div>
      
      {/* Tech corner accents - top left */}
      <div className="absolute top-4 left-4">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="opacity-20">
          <path d="M0 30 L0 10 L10 0 L30 0" stroke="rgba(0,180,200,0.6)" strokeWidth="1" fill="none"/>
          <path d="M0 30 L0 15 L15 0" stroke="rgba(0,180,200,0.3)" strokeWidth="1" fill="none"/>
          <circle cx="10" cy="10" r="2" fill="rgba(0,180,200,0.5)"/>
        </svg>
      </div>
      
      {/* Tech corner accents - top right */}
      <div className="absolute top-4 right-4">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="opacity-20">
          <path d="M60 30 L60 10 L50 0 L30 0" stroke="rgba(0,180,200,0.6)" strokeWidth="1" fill="none"/>
          <path d="M60 30 L60 15 L45 0" stroke="rgba(0,180,200,0.3)" strokeWidth="1" fill="none"/>
          <circle cx="50" cy="10" r="2" fill="rgba(0,180,200,0.5)"/>
        </svg>
      </div>
      
      {/* Tech corner accents - bottom left */}
      <div className="absolute bottom-4 left-4">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="opacity-20">
          <path d="M0 30 L0 50 L10 60 L30 60" stroke="rgba(0,180,200,0.6)" strokeWidth="1" fill="none"/>
          <circle cx="10" cy="50" r="2" fill="rgba(0,180,200,0.5)"/>
        </svg>
      </div>
      
      {/* Tech corner accents - bottom right */}
      <div className="absolute bottom-4 right-4">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="opacity-20">
          <path d="M60 30 L60 50 L50 60 L30 60" stroke="rgba(0,180,200,0.6)" strokeWidth="1" fill="none"/>
          <circle cx="50" cy="50" r="2" fill="rgba(0,180,200,0.5)"/>
        </svg>
      </div>
      
      {/* Side rail indicators - left */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-0.5 h-4 rounded-full"
            style={{
              background: i === 1 ? 'rgba(0,180,200,0.5)' : 'rgba(0,180,200,0.2)'
            }}
          />
        ))}
      </div>
      
      {/* Side rail indicators - right */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-0.5 h-4 rounded-full"
            style={{
              background: i === 2 ? 'rgba(0,180,200,0.5)' : 'rgba(0,180,200,0.2)'
            }}
          />
        ))}
      </div>
      
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 70% at 50% 45%, transparent 30%, rgba(0,0,0,0.6) 100%)'
        }}
      />
      
      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Ambient gold glow in center for pot area - Syndikate gold accent */}
      <div 
        className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-48 h-32"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, transparent 70%)',
          filter: 'blur(30px)'
        }}
      />
    </div>
  );
});

export default SyndikateTableBackground;
