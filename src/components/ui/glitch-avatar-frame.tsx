import React from "react";
import { motion } from "framer-motion";
import { MafiaRank } from "@/utils/mafiaRanks";

interface GlitchAvatarFrameProps {
  rank: MafiaRank;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32 md:w-40 md:h-40",
};

const frameSizes = {
  sm: { outer: 72, inner: 64, stroke: 2 },
  md: { outer: 104, inner: 96, stroke: 2.5 },
  lg: { outer: 144, inner: 128, stroke: 3 },
};

export function GlitchAvatarFrame({ rank, size = "md", children, className = "" }: GlitchAvatarFrameProps) {
  const rarity = rank.rarity;
  const frameSize = frameSizes[size];
  
  return (
    <div className={`relative inline-block ${className}`}>
      {/* Glitch effect layers */}
      <GlitchLayers rarity={rarity} sizeClass={sizeClasses[size]}>
        {children}
      </GlitchLayers>
      
      {/* Rank-specific frame */}
      <RankFrame rarity={rarity} rank={rank} size={frameSize} />
    </div>
  );
}

// Glitch effect wrapper
function GlitchLayers({ rarity, sizeClass, children }: { rarity: string; sizeClass: string; children: React.ReactNode }) {
  const glitchIntensity = {
    initiate: 0,
    soldier: 1,
    captain: 2,
    underboss: 3,
    boss: 4,
    godfather: 5,
  }[rarity] || 0;

  if (glitchIntensity === 0) {
    return <div className={`relative ${sizeClass}`}>{children}</div>;
  }

  return (
    <div className={`relative ${sizeClass}`}>
      {/* Main content */}
      <div className="relative z-10">{children}</div>
      
      {/* Glitch layers - only visible on hover or periodically for high ranks */}
      {glitchIntensity >= 2 && (
        <>
          {/* Red channel offset */}
          <motion.div
            className="absolute inset-0 z-0 opacity-0 mix-blend-multiply pointer-events-none"
            style={{ filter: 'url(#glitch-r)' }}
            animate={{
              opacity: [0, 0.4, 0],
              x: [-2, 2, -2],
            }}
            transition={{
              duration: 0.15,
              repeat: Infinity,
              repeatDelay: glitchIntensity >= 4 ? 2 : 5,
            }}
          >
            <div className="w-full h-full bg-red-500/30 rounded-full" />
          </motion.div>
          
          {/* Cyan channel offset */}
          <motion.div
            className="absolute inset-0 z-0 opacity-0 mix-blend-screen pointer-events-none"
            animate={{
              opacity: [0, 0.3, 0],
              x: [2, -2, 2],
            }}
            transition={{
              duration: 0.15,
              repeat: Infinity,
              repeatDelay: glitchIntensity >= 4 ? 2 : 5,
              delay: 0.05,
            }}
          >
            <div className="w-full h-full bg-cyan-500/30 rounded-full" />
          </motion.div>
        </>
      )}
      
      {/* Scan line glitch */}
      {glitchIntensity >= 3 && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 0.1,
            repeat: Infinity,
            repeatDelay: glitchIntensity >= 5 ? 1.5 : 4,
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
            }}
          />
        </motion.div>
      )}
      
      {/* Displacement glitch for godfather */}
      {glitchIntensity >= 5 && (
        <motion.div
          className="absolute inset-0 z-5 pointer-events-none"
          animate={{
            clipPath: [
              'inset(0 0 100% 0)',
              'inset(40% 0 50% 0)',
              'inset(0 0 100% 0)',
            ],
          }}
          transition={{
            duration: 0.2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        >
          <div className="w-full h-full translate-x-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full" />
        </motion.div>
      )}
    </div>
  );
}

// Rank-specific decorative frame
function RankFrame({ rarity, rank, size }: { rarity: string; rank: MafiaRank; size: { outer: number; inner: number; stroke: number } }) {
  const { outer, inner, stroke } = size;
  const center = outer / 2;
  const radius = inner / 2;
  
  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none" 
      viewBox={`0 0 ${outer} ${outer}`}
      style={{ 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        width: outer,
        height: outer,
      }}
    >
      <defs>
        {/* Gradients for each rarity */}
        <linearGradient id={`frame-gradient-${rarity}`} x1="0%" y1="0%" x2="100%" y2="100%">
          {rarity === 'initiate' && (
            <>
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="100%" stopColor="#52525b" />
            </>
          )}
          {rarity === 'soldier' && (
            <>
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#22c55e" />
            </>
          )}
          {rarity === 'captain' && (
            <>
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </>
          )}
          {rarity === 'underboss' && (
            <>
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#a855f7" />
            </>
          )}
          {rarity === 'boss' && (
            <>
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </>
          )}
          {rarity === 'godfather' && (
            <>
              <stop offset="0%" stopColor="#06b6d4">
                <animate attributeName="stop-color" values="#06b6d4;#a855f7;#ec4899;#fbbf24;#06b6d4" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#a855f7">
                <animate attributeName="stop-color" values="#a855f7;#ec4899;#fbbf24;#06b6d4;#a855f7" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#ec4899">
                <animate attributeName="stop-color" values="#ec4899;#fbbf24;#06b6d4;#a855f7;#ec4899" dur="4s" repeatCount="indefinite" />
              </stop>
            </>
          )}
        </linearGradient>
        
        {/* Glow filter */}
        <filter id={`frame-glow-${rarity}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Frame based on rarity */}
      {rarity === 'initiate' && (
        <circle
          cx={center}
          cy={center}
          r={radius + 2}
          fill="none"
          stroke={`url(#frame-gradient-${rarity})`}
          strokeWidth={stroke}
          strokeDasharray="4 4"
          opacity="0.6"
        />
      )}
      
      {rarity === 'soldier' && (
        <>
          <circle
            cx={center}
            cy={center}
            r={radius + 2}
            fill="none"
            stroke={`url(#frame-gradient-${rarity})`}
            strokeWidth={stroke}
            opacity="0.8"
          />
          {/* Corner marks */}
          {[0, 90, 180, 270].map((angle) => (
            <g key={angle} transform={`rotate(${angle} ${center} ${center})`}>
              <line
                x1={center}
                y1={4}
                x2={center}
                y2={10}
                stroke="#22c55e"
                strokeWidth={stroke}
                opacity="0.8"
              />
            </g>
          ))}
        </>
      )}
      
      {rarity === 'captain' && (
        <>
          {/* Double ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 4}
            fill="none"
            stroke={`url(#frame-gradient-${rarity})`}
            strokeWidth={1}
            opacity="0.5"
          />
          <circle
            cx={center}
            cy={center}
            r={radius + 2}
            fill="none"
            stroke={`url(#frame-gradient-${rarity})`}
            strokeWidth={stroke}
            filter={`url(#frame-glow-${rarity})`}
          >
            <animate attributeName="stroke-dasharray" values="0 1000;1000 0" dur="2s" fill="freeze" />
          </circle>
          {/* Tech dots */}
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <circle
              key={angle}
              cx={center + (radius + 4) * Math.cos((angle * Math.PI) / 180)}
              cy={center + (radius + 4) * Math.sin((angle * Math.PI) / 180)}
              r={2}
              fill="#06b6d4"
              opacity="0.8"
            >
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" begin={`${angle / 360}s`} />
            </circle>
          ))}
        </>
      )}
      
      {rarity === 'underboss' && (
        <>
          {/* Rotating outer ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 4}
            fill="none"
            stroke={`url(#frame-gradient-${rarity})`}
            strokeWidth={1}
            strokeDasharray="8 4"
            opacity="0.6"
          >
            <animateTransform attributeName="transform" type="rotate" from={`0 ${center} ${center}`} to={`360 ${center} ${center}`} dur="20s" repeatCount="indefinite" />
          </circle>
          {/* Main ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 2}
            fill="none"
            stroke={`url(#frame-gradient-${rarity})`}
            strokeWidth={stroke}
            filter={`url(#frame-glow-${rarity})`}
          />
          {/* Diamond accents */}
          {[45, 135, 225, 315].map((angle) => (
            <polygon
              key={angle}
              points={`
                ${center + (radius + 6) * Math.cos((angle * Math.PI) / 180)},${center + (radius + 6) * Math.sin((angle * Math.PI) / 180) - 3}
                ${center + (radius + 6) * Math.cos((angle * Math.PI) / 180) + 3},${center + (radius + 6) * Math.sin((angle * Math.PI) / 180)}
                ${center + (radius + 6) * Math.cos((angle * Math.PI) / 180)},${center + (radius + 6) * Math.sin((angle * Math.PI) / 180) + 3}
                ${center + (radius + 6) * Math.cos((angle * Math.PI) / 180) - 3},${center + (radius + 6) * Math.sin((angle * Math.PI) / 180)}
              `}
              fill="#a855f7"
              opacity="0.8"
            >
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin={`${angle / 360}s`} />
            </polygon>
          ))}
        </>
      )}
      
      {rarity === 'boss' && (
        <>
          {/* Triple ring golden frame */}
          <circle cx={center} cy={center} r={radius + 6} fill="none" stroke="#f59e0b" strokeWidth={1} opacity="0.3" />
          <circle cx={center} cy={center} r={radius + 4} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity="0.5" />
          <circle
            cx={center}
            cy={center}
            r={radius + 2}
            fill="none"
            stroke={`url(#frame-gradient-${rarity})`}
            strokeWidth={stroke}
            filter={`url(#frame-glow-${rarity})`}
          />
          {/* Crown points */}
          {[270, 306, 342, 18, 54, 90, 126, 162, 198, 234].map((angle, i) => (
            <line
              key={angle}
              x1={center + radius * Math.cos((angle * Math.PI) / 180)}
              y1={center + radius * Math.sin((angle * Math.PI) / 180)}
              x2={center + (radius + (i % 2 === 0 ? 8 : 5)) * Math.cos((angle * Math.PI) / 180)}
              y2={center + (radius + (i % 2 === 0 ? 8 : 5)) * Math.sin((angle * Math.PI) / 180)}
              stroke="#fbbf24"
              strokeWidth={i % 2 === 0 ? 2 : 1}
              opacity="0.8"
            >
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.1}s`} />
            </line>
          ))}
        </>
      )}
      
      {rarity === 'godfather' && (
        <>
          {/* Holographic multi-ring */}
          <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="#06b6d4" strokeWidth={0.5} opacity="0.3">
            <animateTransform attributeName="transform" type="rotate" from={`0 ${center} ${center}`} to={`-360 ${center} ${center}`} dur="30s" repeatCount="indefinite" />
          </circle>
          <circle cx={center} cy={center} r={radius + 6} fill="none" stroke="#a855f7" strokeWidth={1} opacity="0.4" strokeDasharray="4 4">
            <animateTransform attributeName="transform" type="rotate" from={`0 ${center} ${center}`} to={`360 ${center} ${center}`} dur="20s" repeatCount="indefinite" />
          </circle>
          <circle cx={center} cy={center} r={radius + 4} fill="none" stroke="#ec4899" strokeWidth={1} opacity="0.5" />
          <circle
            cx={center}
            cy={center}
            r={radius + 2}
            fill="none"
            stroke={`url(#frame-gradient-${rarity})`}
            strokeWidth={stroke + 1}
            filter={`url(#frame-glow-${rarity})`}
          />
          {/* Orbiting particles */}
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <circle
              key={angle}
              r={3}
              fill={['#06b6d4', '#a855f7', '#ec4899', '#fbbf24', '#22d3ee'][i]}
            >
              <animateMotion dur={`${4 + i}s`} repeatCount="indefinite">
                <mpath href={`#orbit-path-${i}`} />
              </animateMotion>
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
          ))}
          {/* Orbit paths */}
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              id={`orbit-path-${i}`}
              d={`M ${center} ${center - radius - 6} A ${radius + 6} ${radius + 6} 0 1 1 ${center - 0.01} ${center - radius - 6}`}
              fill="none"
            />
          ))}
        </>
      )}
    </svg>
  );
}
