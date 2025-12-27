// ============================================
// STEAMPUNK TABLE BACKGROUND - Industrial Victorian Tech
// ============================================
// Full-screen steampunk aesthetic with gears, pipes, rivets and brass

import React, { memo } from 'react';

interface SteampunkTableBackgroundProps {
  intensity?: number;
}

export const SteampunkTableBackground = memo(function SteampunkTableBackground({
  intensity = 1
}: SteampunkTableBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base dark industrial gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a1410 0%, #0f0c0a 30%, #0a0806 60%, #050403 100%)'
        }}
      />
      
      {/* Warm amber ambient glow from top */}
      <div 
        className="absolute top-0 left-0 right-0 h-[50%]"
        style={{
          background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(180,120,40,0.15) 0%, rgba(120,80,30,0.08) 40%, transparent 70%)',
          opacity: intensity
        }}
      />
      
      {/* Side brass reflections */}
      <div 
        className="absolute top-0 left-0 w-[25%] h-full"
        style={{
          background: 'linear-gradient(90deg, rgba(180,140,60,0.06) 0%, transparent 100%)',
          opacity: intensity
        }}
      />
      <div 
        className="absolute top-0 right-0 w-[25%] h-full"
        style={{
          background: 'linear-gradient(-90deg, rgba(180,140,60,0.06) 0%, transparent 100%)',
          opacity: intensity
        }}
      />
      
      {/* Decorative corner gears - top left */}
      <svg className="absolute top-4 left-4 w-24 h-24 opacity-[0.12]" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="brass-tl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c9a227"/>
            <stop offset="50%" stopColor="#8b6914"/>
            <stop offset="100%" stopColor="#5c4a0a"/>
          </linearGradient>
        </defs>
        {/* Main gear */}
        <circle cx="35" cy="35" r="25" fill="none" stroke="url(#brass-tl)" strokeWidth="3"/>
        <circle cx="35" cy="35" r="18" fill="none" stroke="url(#brass-tl)" strokeWidth="2"/>
        <circle cx="35" cy="35" r="8" fill="url(#brass-tl)"/>
        {/* Gear teeth */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect
            key={i}
            x="33"
            y="5"
            width="4"
            height="8"
            fill="url(#brass-tl)"
            transform={`rotate(${angle} 35 35)`}
          />
        ))}
        {/* Small gear */}
        <circle cx="70" cy="70" r="15" fill="none" stroke="url(#brass-tl)" strokeWidth="2"/>
        <circle cx="70" cy="70" r="5" fill="url(#brass-tl)"/>
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <rect
            key={`s-${i}`}
            x="68"
            y="52"
            width="4"
            height="6"
            fill="url(#brass-tl)"
            transform={`rotate(${angle} 70 70)`}
          />
        ))}
      </svg>
      
      {/* Decorative corner gears - top right */}
      <svg className="absolute top-4 right-4 w-24 h-24 opacity-[0.12]" viewBox="0 0 100 100" style={{ transform: 'scaleX(-1)' }}>
        <defs>
          <linearGradient id="brass-tr" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c9a227"/>
            <stop offset="50%" stopColor="#8b6914"/>
            <stop offset="100%" stopColor="#5c4a0a"/>
          </linearGradient>
        </defs>
        <circle cx="35" cy="35" r="25" fill="none" stroke="url(#brass-tr)" strokeWidth="3"/>
        <circle cx="35" cy="35" r="18" fill="none" stroke="url(#brass-tr)" strokeWidth="2"/>
        <circle cx="35" cy="35" r="8" fill="url(#brass-tr)"/>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect key={i} x="33" y="5" width="4" height="8" fill="url(#brass-tr)" transform={`rotate(${angle} 35 35)`}/>
        ))}
        <circle cx="70" cy="70" r="15" fill="none" stroke="url(#brass-tr)" strokeWidth="2"/>
        <circle cx="70" cy="70" r="5" fill="url(#brass-tr)"/>
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <rect key={`s-${i}`} x="68" y="52" width="4" height="6" fill="url(#brass-tr)" transform={`rotate(${angle} 70 70)`}/>
        ))}
      </svg>
      
      {/* Decorative corner gears - bottom left */}
      <svg className="absolute bottom-4 left-4 w-24 h-24 opacity-[0.12]" viewBox="0 0 100 100" style={{ transform: 'scaleY(-1)' }}>
        <defs>
          <linearGradient id="brass-bl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c9a227"/>
            <stop offset="50%" stopColor="#8b6914"/>
            <stop offset="100%" stopColor="#5c4a0a"/>
          </linearGradient>
        </defs>
        <circle cx="35" cy="35" r="25" fill="none" stroke="url(#brass-bl)" strokeWidth="3"/>
        <circle cx="35" cy="35" r="18" fill="none" stroke="url(#brass-bl)" strokeWidth="2"/>
        <circle cx="35" cy="35" r="8" fill="url(#brass-bl)"/>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect key={i} x="33" y="5" width="4" height="8" fill="url(#brass-bl)" transform={`rotate(${angle} 35 35)`}/>
        ))}
      </svg>
      
      {/* Decorative corner gears - bottom right */}
      <svg className="absolute bottom-4 right-4 w-24 h-24 opacity-[0.12]" viewBox="0 0 100 100" style={{ transform: 'scale(-1)' }}>
        <defs>
          <linearGradient id="brass-br" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c9a227"/>
            <stop offset="50%" stopColor="#8b6914"/>
            <stop offset="100%" stopColor="#5c4a0a"/>
          </linearGradient>
        </defs>
        <circle cx="35" cy="35" r="25" fill="none" stroke="url(#brass-br)" strokeWidth="3"/>
        <circle cx="35" cy="35" r="18" fill="none" stroke="url(#brass-br)" strokeWidth="2"/>
        <circle cx="35" cy="35" r="8" fill="url(#brass-br)"/>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect key={i} x="33" y="5" width="4" height="8" fill="url(#brass-br)" transform={`rotate(${angle} 35 35)`}/>
        ))}
      </svg>
      
      {/* Horizontal pipe decorations - top */}
      <div className="absolute top-16 left-[15%] right-[15%] h-3 flex items-center">
        <div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, #5c4a2a 10%, #8b7040 50%, #5c4a2a 90%, transparent 100%)' }}/>
        <div className="w-4 h-3 rounded-full mx-1" style={{ background: 'radial-gradient(circle at 30% 30%, #c9a227 0%, #8b6914 60%, #5c4a0a 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)' }}/>
        <div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, #5c4a2a 10%, #8b7040 50%, #5c4a2a 90%, transparent 100%)' }}/>
      </div>
      
      {/* Horizontal pipe decorations - bottom */}
      <div className="absolute bottom-16 left-[15%] right-[15%] h-3 flex items-center">
        <div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, #5c4a2a 10%, #8b7040 50%, #5c4a2a 90%, transparent 100%)' }}/>
        <div className="w-4 h-3 rounded-full mx-1" style={{ background: 'radial-gradient(circle at 30% 30%, #c9a227 0%, #8b6914 60%, #5c4a0a 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)' }}/>
        <div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, #5c4a2a 10%, #8b7040 50%, #5c4a2a 90%, transparent 100%)' }}/>
      </div>
      
      {/* Vertical pipe decorations - left */}
      <div className="absolute left-6 top-[20%] bottom-[20%] w-2 flex flex-col items-center">
        <div className="flex-1 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, transparent 0%, #5c4a2a 10%, #8b7040 50%, #5c4a2a 90%, transparent 100%)' }}/>
      </div>
      
      {/* Vertical pipe decorations - right */}
      <div className="absolute right-6 top-[20%] bottom-[20%] w-2 flex flex-col items-center">
        <div className="flex-1 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, transparent 0%, #5c4a2a 10%, #8b7040 50%, #5c4a2a 90%, transparent 100%)' }}/>
      </div>
      
      {/* Rivet decorations along edges */}
      <div className="absolute top-3 left-[10%] right-[10%] flex justify-between">
        {[...Array(12)].map((_, i) => (
          <div
            key={`rivet-t-${i}`}
            className="w-2 h-2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #a08040 0%, #6b5530 60%, #3d3020 100%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)'
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-3 left-[10%] right-[10%] flex justify-between">
        {[...Array(12)].map((_, i) => (
          <div
            key={`rivet-b-${i}`}
            className="w-2 h-2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #a08040 0%, #6b5530 60%, #3d3020 100%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)'
            }}
          />
        ))}
      </div>
      
      {/* Side rivets - left */}
      <div className="absolute left-3 top-[15%] bottom-[15%] flex flex-col justify-between">
        {[...Array(8)].map((_, i) => (
          <div
            key={`rivet-l-${i}`}
            className="w-2 h-2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #a08040 0%, #6b5530 60%, #3d3020 100%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)'
            }}
          />
        ))}
      </div>
      
      {/* Side rivets - right */}
      <div className="absolute right-3 top-[15%] bottom-[15%] flex flex-col justify-between">
        {[...Array(8)].map((_, i) => (
          <div
            key={`rivet-r-${i}`}
            className="w-2 h-2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #a08040 0%, #6b5530 60%, #3d3020 100%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)'
            }}
          />
        ))}
      </div>
      
      {/* Industrial metal texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Warm center spotlight for table area */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(180,140,60,0.08) 0%, rgba(120,80,30,0.04) 40%, transparent 70%)',
          opacity: intensity
        }}
      />
      
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)'
        }}
      />
    </div>
  );
});

export default SteampunkTableBackground;
