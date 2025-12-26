import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
  type: 'dust' | 'sparkle' | 'smoke';
}

interface AtmosphericEffectsProps {
  type?: 'ambient' | 'dramatic' | 'winner' | 'allIn';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const AtmosphericEffects: React.FC<AtmosphericEffectsProps> = ({
  type = 'ambient',
  intensity = 'medium',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  const particleCount = useMemo(() => {
    const counts = { low: 20, medium: 40, high: 80 };
    return counts[intensity];
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.5 + 0.1,
      angle: Math.random() * Math.PI * 2,
      type: ['dust', 'sparkle', 'smoke'][Math.floor(Math.random() * 3)] as Particle['type']
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      particlesRef.current.forEach(particle => {
        // Update position
        particle.x += Math.cos(particle.angle) * particle.speed;
        particle.y += Math.sin(particle.angle) * particle.speed;

        // Wrap around
        if (particle.x < 0) particle.x = canvas.offsetWidth;
        if (particle.x > canvas.offsetWidth) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.offsetHeight;
        if (particle.y > canvas.offsetHeight) particle.y = 0;

        // Draw particle based on type
        ctx.save();
        ctx.globalAlpha = particle.opacity;

        if (particle.type === 'dust') {
          ctx.fillStyle = 'rgba(255, 248, 220, 0.8)';
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (particle.type === 'sparkle') {
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 2
          );
          gradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
          gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.5)');
          gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(
            particle.x - particle.size * 2,
            particle.y - particle.size * 2,
            particle.size * 4,
            particle.size * 4
          );
        } else {
          ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Slowly change angle
        particle.angle += (Math.random() - 0.5) * 0.02;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleCount, type]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

// Spotlight effect for dramatic moments
export const SpotlightEffect: React.FC<{
  active?: boolean;
  position?: { x: number; y: number };
  color?: string;
}> = ({ active = false, position = { x: 50, y: 50 }, color = 'rgba(255, 215, 0, 0.3)' }) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${position.x}% ${position.y}%, ${color} 0%, transparent 50%)`
          }}
        />
      )}
    </AnimatePresence>
  );
};

// Winner celebration effect
export const WinnerCelebration: React.FC<{
  active?: boolean;
  amount?: number;
  playerName?: string;
}> = ({ active = false, amount = 0, playerName = '' }) => {
  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none overflow-hidden z-50"
        >
          {/* Confetti particles */}
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: '50%',
                y: '50%',
                scale: 0,
                rotate: 0
              }}
              animate={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                scale: [0, 1, 1, 0],
                rotate: Math.random() * 720 - 360
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 0.5,
                ease: 'easeOut'
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                backgroundColor: confettiColors[i % confettiColors.length],
                boxShadow: `0 0 10px ${confettiColors[i % confettiColors.length]}`
              }}
            />
          ))}

          {/* Winner text */}
          <motion.div
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -50 }}
            transition={{ type: 'spring', damping: 15 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                animate={{
                  textShadow: [
                    '0 0 20px rgba(255,215,0,0.5)',
                    '0 0 40px rgba(255,215,0,0.8)',
                    '0 0 20px rgba(255,215,0,0.5)'
                  ]
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-4xl font-bebas text-casino-gold mb-2"
              >
                🏆 WINNER! 🏆
              </motion.div>
              {playerName && (
                <div className="text-2xl font-roboto-condensed text-white mb-1">
                  {playerName}
                </div>
              )}
              {amount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="text-3xl font-orbitron text-casino-gold"
                >
                  +{amount.toLocaleString()} 💎
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// All-in dramatic effect
export const AllInEffect: React.FC<{
  active?: boolean;
  playerPosition?: { x: number; y: number };
}> = ({ active = false, playerPosition = { x: 50, y: 50 } }) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none z-40"
        >
          {/* Radial pulse */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{
                duration: 1.5,
                delay: i * 0.3,
                repeat: Infinity,
                ease: 'easeOut'
              }}
              className="absolute rounded-full border-4 border-red-500"
              style={{
                left: `${playerPosition.x}%`,
                top: `${playerPosition.y}%`,
                width: 100,
                height: 100,
                marginLeft: -50,
                marginTop: -50
              }}
            />
          ))}

          {/* ALL IN text */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'reverse'
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="text-5xl font-bebas text-red-500 px-8 py-4 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(139,0,0,0.8))',
                border: '3px solid #dc2626',
                boxShadow: '0 0 30px rgba(220, 38, 38, 0.5), inset 0 0 20px rgba(220, 38, 38, 0.3)',
                textShadow: '0 0 20px rgba(220, 38, 38, 0.8)'
              }}
            >
              ALL IN!
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Pot collecting animation
export const PotCollectAnimation: React.FC<{
  active?: boolean;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  amount: number;
  onComplete?: () => void;
}> = ({ active = false, fromPosition, toPosition, amount, onComplete }) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{
            x: fromPosition.x,
            y: fromPosition.y,
            scale: 1,
            opacity: 1
          }}
          animate={{
            x: toPosition.x,
            y: toPosition.y,
            scale: 0.5,
            opacity: 0
          }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          onAnimationComplete={onComplete}
          className="absolute z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full border border-casino-gold">
            <span className="text-casino-gold font-orbitron text-lg">
              +{amount.toLocaleString()}
            </span>
            <span className="text-xl">💰</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AtmosphericEffects;
