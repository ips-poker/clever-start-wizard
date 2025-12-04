import React from "react";
import { motion } from "framer-motion";
import { MafiaRank } from "@/utils/mafiaRanks";

interface WebRankProfileStylesProps {
  rank: MafiaRank;
}

export function WebRankProfileStyles({ rank }: WebRankProfileStylesProps) {
  const rarity = rank.rarity;
  
  return (
    <>
      {/* Base industrial texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern id="web-industrial-grid" patternUnits="userSpaceOnUse" width="60" height="60">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            </pattern>
            <filter id="web-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" />
              <feColorMatrix type="saturate" values="0" />
              <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#web-industrial-grid)" className="text-foreground" />
        </svg>
      </div>

      {/* Rank-specific decorations */}
      {rarity === 'initiate' && <InitiateWebStyle rank={rank} />}
      {rarity === 'soldier' && <SoldierWebStyle rank={rank} />}
      {rarity === 'captain' && <CaptainWebStyle rank={rank} />}
      {rarity === 'underboss' && <UnderbossWebStyle rank={rank} />}
      {rarity === 'boss' && <BossWebStyle rank={rank} />}
      {rarity === 'godfather' && <GodfatherWebStyle rank={rank} />}
    </>
  );
}

// Initiate - Clean industrial с минимальными акцентами
function InitiateWebStyle({ rank }: { rank: MafiaRank }) {
  return (
    <>
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none">
        <div className="absolute top-4 left-4 w-12 h-[2px] bg-gradient-to-r from-zinc-500 to-transparent" />
        <div className="absolute top-4 left-4 w-[2px] h-12 bg-gradient-to-b from-zinc-500 to-transparent" />
      </div>
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
        <div className="absolute top-4 right-4 w-12 h-[2px] bg-gradient-to-l from-zinc-500 to-transparent" />
        <div className="absolute top-4 right-4 w-[2px] h-12 bg-gradient-to-b from-zinc-500 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none">
        <div className="absolute bottom-4 left-4 w-12 h-[2px] bg-gradient-to-r from-zinc-500 to-transparent" />
        <div className="absolute bottom-4 left-4 w-[2px] h-12 bg-gradient-to-t from-zinc-500 to-transparent" />
      </div>
      <div className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none">
        <div className="absolute bottom-4 right-4 w-12 h-[2px] bg-gradient-to-l from-zinc-500 to-transparent" />
        <div className="absolute bottom-4 right-4 w-[2px] h-12 bg-gradient-to-t from-zinc-500 to-transparent" />
      </div>
      
      {/* Subtle scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-500/30 to-transparent pointer-events-none"
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </>
  );
}

// Soldier - Зелёная энергия с геометрией
function SoldierWebStyle({ rank }: { rank: MafiaRank }) {
  return (
    <>
      {/* Energy corners */}
      <svg className="absolute top-0 left-0 w-24 h-24 pointer-events-none" viewBox="0 0 100 100">
        <motion.path
          d="M 0 40 L 0 0 L 40 0"
          fill="none"
          stroke="url(#uncommon-gradient-web)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="uncommon-gradient-web" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <svg className="absolute top-0 right-0 w-24 h-24 pointer-events-none rotate-90" viewBox="0 0 100 100">
        <motion.path
          d="M 0 40 L 0 0 L 40 0"
          fill="none"
          stroke="url(#uncommon-gradient-web)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <svg className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none -rotate-90" viewBox="0 0 100 100">
        <motion.path
          d="M 0 40 L 0 0 L 40 0"
          fill="none"
          stroke="url(#uncommon-gradient-web)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
        />
      </svg>
      <svg className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none rotate-180" viewBox="0 0 100 100">
        <motion.path
          d="M 0 40 L 0 0 L 40 0"
          fill="none"
          stroke="url(#uncommon-gradient-web)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
        />
      </svg>

      {/* Floating energy particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-green-500/60 pointer-events-none"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Pulse rings */}
      <motion.div
        className="absolute top-1/2 left-8 w-3 h-3 rounded-full border border-green-500/50 pointer-events-none"
        animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </>
  );
}

// Captain - Синий электрический с молниями
function CaptainWebStyle({ rank }: { rank: MafiaRank }) {
  return (
    <>
      {/* Electric frame */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rare-electric-web" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <filter id="rare-glow-web">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.rect
          x="8" y="8"
          width="calc(100% - 16px)"
          height="calc(100% - 16px)"
          fill="none"
          stroke="url(#rare-electric-web)"
          strokeWidth="1"
          strokeDasharray="8 4"
          filter="url(#rare-glow-web)"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -24 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* Lightning bolts */}
      <svg className="absolute top-4 left-4 w-8 h-12 pointer-events-none" viewBox="0 0 24 36">
        <motion.path
          d="M 12 0 L 4 14 L 10 14 L 8 36 L 20 18 L 14 18 L 18 0 Z"
          fill="url(#rare-electric-web)"
          opacity="0.6"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </svg>
      <svg className="absolute bottom-4 right-4 w-8 h-12 pointer-events-none rotate-180" viewBox="0 0 24 36">
        <motion.path
          d="M 12 0 L 4 14 L 10 14 L 8 36 L 20 18 L 14 18 L 18 0 Z"
          fill="url(#rare-electric-web)"
          opacity="0.6"
          animate={{ opacity: [0.8, 0.3, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </svg>

      {/* Data stream lines */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent pointer-events-none"
          style={{
            top: `${25 + i * 20}%`,
            left: 0,
            right: 0,
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ 
            scaleX: [0, 1, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.8,
          }}
        />
      ))}

      {/* Corner circuits */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <motion.div
          className="w-16 h-16 border-t-2 border-r-2 border-blue-500/50"
          animate={{ borderColor: ['rgba(59,130,246,0.3)', 'rgba(59,130,246,0.8)', 'rgba(59,130,246,0.3)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
    </>
  );
}

// Underboss - Фиолетовое свечение с порталами
function UnderbossWebStyle({ rank }: { rank: MafiaRank }) {
  return (
    <>
      {/* Portal rings */}
      <div className="absolute top-1/2 left-8 -translate-y-1/2 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-purple-500/30"
            style={{
              width: 40 + i * 20,
              height: 40 + i * 20,
              left: -(20 + i * 10),
              top: -(20 + i * 10),
            }}
            animate={{ 
              rotate: i % 2 === 0 ? 360 : -360,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 8 + i * 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        ))}
        <motion.div
          className="w-4 h-4 rounded-full bg-purple-500"
          style={{ boxShadow: '0 0 20px 5px rgba(168,85,247,0.5)' }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Mystical runes/symbols */}
      <svg className="absolute top-6 right-6 w-12 h-12 pointer-events-none" viewBox="0 0 48 48">
        <motion.path
          d="M 24 4 L 44 24 L 24 44 L 4 24 Z"
          fill="none"
          stroke="url(#epic-gradient-web)"
          strokeWidth="1.5"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: 'center' }}
        />
        <motion.circle
          cx="24" cy="24" r="8"
          fill="none"
          stroke="#a855f7"
          strokeWidth="1"
          animate={{ r: [6, 10, 6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <defs>
          <linearGradient id="epic-gradient-web" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${i % 2 === 0 ? '#a855f7' : '#ec4899'}, transparent)`,
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 3) * 20}%`,
            boxShadow: `0 0 10px ${i % 2 === 0 ? '#a855f7' : '#ec4899'}`,
          }}
          animate={{
            y: [-15, 15, -15],
            x: [-5, 5, -5],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
    </>
  );
}

// Boss - Золотое сияние с коронами
function BossWebStyle({ rank }: { rank: MafiaRank }) {
  return (
    <>
      {/* Golden frame with ornaments */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="legendary-gold-web" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="25%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="legendary-glow-web">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Animated border */}
        <motion.rect
          x="4" y="4"
          width="calc(100% - 8px)"
          height="calc(100% - 8px)"
          fill="none"
          stroke="url(#legendary-gold-web)"
          strokeWidth="2"
          filter="url(#legendary-glow-web)"
          initial={{ strokeDasharray: "0 1000" }}
          animate={{ strokeDasharray: "1000 0" }}
          transition={{ duration: 3, ease: "easeOut" }}
        />
      </svg>

      {/* Crown icon top center */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none">
        <motion.svg 
          className="w-10 h-8" 
          viewBox="0 0 48 40"
          animate={{ y: [-2, 2, -2] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.path
            d="M 4 32 L 8 12 L 16 20 L 24 8 L 32 20 L 40 12 L 44 32 Z"
            fill="url(#legendary-gold-web)"
            filter="url(#legendary-glow-web)"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <circle cx="24" cy="8" r="3" fill="#fbbf24" />
          <circle cx="8" cy="12" r="2" fill="#f59e0b" />
          <circle cx="40" cy="12" r="2" fill="#f59e0b" />
        </motion.svg>
      </div>

      {/* Corner ornaments */}
      {[
        { pos: 'top-4 left-4', rotate: 0 },
        { pos: 'top-4 right-4', rotate: 90 },
        { pos: 'bottom-4 right-4', rotate: 180 },
        { pos: 'bottom-4 left-4', rotate: 270 },
      ].map((corner, i) => (
        <motion.div
          key={i}
          className={`absolute ${corner.pos} w-8 h-8 pointer-events-none`}
          style={{ rotate: `${corner.rotate}deg` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.1 }}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <path
              d="M 0 0 L 0 16 Q 0 0 16 0 Z"
              fill="url(#legendary-gold-web)"
              opacity="0.8"
            />
          </svg>
        </motion.div>
      ))}

      {/* Sparkles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${10 + i * 12}%`,
            top: `${15 + (i % 4) * 20}%`,
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16">
            <path
              d="M 8 0 L 9 6 L 16 8 L 9 10 L 8 16 L 7 10 L 0 8 L 7 6 Z"
              fill="#fbbf24"
            />
          </svg>
        </motion.div>
      ))}

      {/* Golden shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent pointer-events-none"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

// Godfather - Максимальный эпик с голографией
function GodfatherWebStyle({ rank }: { rank: MafiaRank }) {
  return (
    <>
      {/* Holographic background */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 25%, #ec4899 50%, #f59e0b 75%, #06b6d4 100%)',
          backgroundSize: '400% 400%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      {/* Multi-layer frame */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="godfather-gradient-web" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4">
              <animate attributeName="stop-color" values="#06b6d4;#a855f7;#ec4899;#f59e0b;#06b6d4" dur="5s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#a855f7">
              <animate attributeName="stop-color" values="#a855f7;#ec4899;#f59e0b;#06b6d4;#a855f7" dur="5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#ec4899">
              <animate attributeName="stop-color" values="#ec4899;#f59e0b;#06b6d4;#a855f7;#ec4899" dur="5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <filter id="godfather-glow-web">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer frame */}
        <motion.rect
          x="2" y="2"
          width="calc(100% - 4px)"
          height="calc(100% - 4px)"
          fill="none"
          stroke="url(#godfather-gradient-web)"
          strokeWidth="3"
          filter="url(#godfather-glow-web)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        
        {/* Inner accent frame */}
        <motion.rect
          x="8" y="8"
          width="calc(100% - 16px)"
          height="calc(100% - 16px)"
          fill="none"
          stroke="url(#godfather-gradient-web)"
          strokeWidth="1"
          strokeDasharray="4 8"
          opacity="0.5"
          animate={{ strokeDashoffset: [0, -24] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* Godfather emblem */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <motion.div
          className="relative"
          animate={{ y: [-3, 3, -3] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <svg className="w-16 h-12" viewBox="0 0 64 48">
            <defs>
              <linearGradient id="emblem-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            {/* Crown base */}
            <motion.path
              d="M 8 40 L 12 16 L 20 24 L 32 8 L 44 24 L 52 16 L 56 40 Z"
              fill="url(#emblem-gradient)"
              filter="url(#godfather-glow-web)"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Gems */}
            <circle cx="32" cy="8" r="4" fill="#06b6d4" />
            <circle cx="12" cy="16" r="3" fill="#a855f7" />
            <circle cx="52" cy="16" r="3" fill="#ec4899" />
          </svg>
          
          {/* Floating gems around */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#06b6d4', '#a855f7', '#ec4899', '#fbbf24'][i],
                left: `${-10 + i * 30}px`,
                top: `${10 + (i % 2) * 20}px`,
                boxShadow: `0 0 10px ${['#06b6d4', '#a855f7', '#ec4899', '#fbbf24'][i]}`,
              }}
              animate={{
                y: [-5, 5, -5],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Corner power nodes */}
      {[
        { pos: 'top-6 left-6', color: '#06b6d4' },
        { pos: 'top-6 right-6', color: '#a855f7' },
        { pos: 'bottom-6 left-6', color: '#ec4899' },
        { pos: 'bottom-6 right-6', color: '#f59e0b' },
      ].map((node, i) => (
        <div key={i} className={`absolute ${node.pos} pointer-events-none`}>
          <motion.div
            className="w-4 h-4 rounded-full"
            style={{ 
              background: node.color,
              boxShadow: `0 0 20px ${node.color}, 0 0 40px ${node.color}`,
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
          {/* Connection lines */}
          <motion.div
            className="absolute w-12 h-px top-1/2"
            style={{ 
              background: `linear-gradient(to right, ${node.color}, transparent)`,
              left: i % 2 === 0 ? '100%' : 'auto',
              right: i % 2 === 1 ? '100%' : 'auto',
              transform: i % 2 === 1 ? 'scaleX(-1)' : undefined,
            }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        </div>
      ))}

      {/* Scan line effect */}
      <motion.div
        className="absolute left-0 right-0 h-1 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.5), rgba(168,85,247,0.5), rgba(236,72,153,0.5), transparent)',
        }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Particle field */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{
            background: ['#06b6d4', '#a855f7', '#ec4899', '#fbbf24'][i % 4],
            left: `${8 + i * 8}%`,
            top: `${20 + (i % 5) * 15}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 5 + i * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </>
  );
}
