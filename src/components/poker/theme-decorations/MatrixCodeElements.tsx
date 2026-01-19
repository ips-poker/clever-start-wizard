// ============================================
// MATRIX CODE DECORATIONS
// ============================================
// Падающий код, зеленые символы, цифровой дождь

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

// Случайные символы для матрицы
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

const getRandomChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

interface CodeColumnProps {
  left: string;
  delay: number;
  duration: number;
  chars: number;
}

const CodeColumn = memo(function CodeColumn({ left, delay, duration, chars }: CodeColumnProps) {
  const matrixGreen = '#00ff41';
  const darkGreen = '#003b00';
  
  const characters = useMemo(() => 
    Array.from({ length: chars }, () => getRandomChar()),
    [chars]
  );

  return (
    <motion.div
      className="absolute top-0 flex flex-col pointer-events-none font-mono text-[10px]"
      style={{ left }}
      initial={{ y: '-100%', opacity: 0 }}
      animate={{ 
        y: ['0%', '120%'],
        opacity: [0, 1, 1, 0]
      }}
      transition={{ 
        duration, 
        repeat: Infinity, 
        delay,
        ease: "linear"
      }}
    >
      {characters.map((char, i) => (
        <span
          key={i}
          style={{ 
            color: i === 0 ? '#ffffff' : i < 3 ? matrixGreen : darkGreen,
            textShadow: i === 0 
              ? `0 0 10px ${matrixGreen}, 0 0 20px ${matrixGreen}` 
              : i < 3 
                ? `0 0 5px ${matrixGreen}` 
                : 'none',
            opacity: 1 - (i / characters.length) * 0.7
          }}
        >
          {char}
        </span>
      ))}
    </motion.div>
  );
});

export const MatrixCodeElements = memo(function MatrixCodeElements() {
  const matrixGreen = '#00ff41';
  
  // Колонки кода по краям экрана
  const columns = useMemo(() => [
    // Left side columns
    { left: '2%', delay: 0, duration: 4, chars: 12 },
    { left: '4%', delay: 1.5, duration: 5, chars: 15 },
    { left: '6%', delay: 0.8, duration: 4.5, chars: 10 },
    { left: '8%', delay: 2.2, duration: 3.5, chars: 8 },
    // Right side columns
    { left: '92%', delay: 0.5, duration: 4.2, chars: 14 },
    { left: '94%', delay: 1.8, duration: 5.5, chars: 12 },
    { left: '96%', delay: 0.3, duration: 4, chars: 11 },
    { left: '98%', delay: 2.5, duration: 3.8, chars: 9 },
  ], []);

  return (
    <>
      {/* === FALLING CODE COLUMNS === */}
      {columns.map((col, i) => (
        <CodeColumn key={i} {...col} />
      ))}

      {/* === TOP LEFT: "ACCESS GRANTED" Terminal === */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <div 
          className="px-2 py-1 rounded border font-mono text-[10px]"
          style={{ 
            borderColor: matrixGreen,
            color: matrixGreen,
            background: 'rgba(0,20,0,0.8)',
            boxShadow: `0 0 10px ${matrixGreen}30`
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            &gt;_
          </motion.span>
          {' '}ACCESS_GRANTED
        </div>
      </div>

      {/* === TOP RIGHT: System Status === */}
      <div className="absolute top-3 right-3 pointer-events-none text-right">
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-mono text-[10px]"
          style={{ color: matrixGreen, textShadow: `0 0 5px ${matrixGreen}` }}
        >
          MATRIX::v3.0
        </motion.div>
        <div 
          className="font-mono text-[9px] mt-1"
          style={{ color: matrixGreen, opacity: 0.6 }}
        >
          CONNECTED
        </div>
      </div>

      {/* === BOTTOM LEFT: Neo Symbol === */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <motion.div
          animate={{ 
            rotateZ: [0, 360],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40">
            {/* Circular code ring */}
            <circle 
              cx="20" cy="20" r="18" 
              fill="none" 
              stroke={matrixGreen}
              strokeWidth="1"
              strokeDasharray="4 2"
              opacity="0.5"
            />
            <text 
              x="20" y="24" 
              fill={matrixGreen} 
              fontSize="14" 
              fontFamily="monospace" 
              textAnchor="middle"
              style={{ textShadow: `0 0 8px ${matrixGreen}` }}
            >
              ネオ
            </text>
          </svg>
        </motion.div>
      </div>

      {/* === BOTTOM RIGHT: Binary Stream === */}
      <div className="absolute bottom-4 right-4 pointer-events-none font-mono text-[8px]" style={{ color: matrixGreen }}>
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          01001110 01000101
        </motion.div>
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        >
          01001111 00100001
        </motion.div>
      </div>

      {/* === HORIZONTAL SCAN LINE === */}
      <motion.div
        className="absolute left-10 right-10 h-[1px] pointer-events-none"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${matrixGreen}60, ${matrixGreen}, ${matrixGreen}60, transparent)`
        }}
        animate={{ 
          top: ['10%', '90%'],
          opacity: [0.3, 0.8, 0.3]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: "easeInOut"
        }}
      />

      {/* === CORNER BRACKETS === */}
      {/* Top-left */}
      <svg className="absolute top-0 left-0 w-12 h-12 pointer-events-none" style={{ color: matrixGreen }}>
        <path d="M0,30 L0,5 Q0,0 5,0 L30,0" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
      </svg>
      {/* Top-right */}
      <svg className="absolute top-0 right-0 w-12 h-12 pointer-events-none" style={{ color: matrixGreen }}>
        <path d="M48,30 L48,5 Q48,0 43,0 L18,0" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
      </svg>
      {/* Bottom-left */}
      <svg className="absolute bottom-0 left-0 w-12 h-12 pointer-events-none" style={{ color: matrixGreen }}>
        <path d="M0,18 L0,43 Q0,48 5,48 L30,48" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
      </svg>
      {/* Bottom-right */}
      <svg className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none" style={{ color: matrixGreen }}>
        <path d="M48,18 L48,43 Q48,48 43,48 L18,48" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
      </svg>
    </>
  );
});

export default MatrixCodeElements;
