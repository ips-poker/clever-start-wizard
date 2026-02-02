import { motion, Variants } from 'framer-motion';

interface AnimatedPokerEmojiProps {
  type: 'crown' | 'trophy' | 'fire' | 'diamond' | 'spade' | 'heart' | 'club' | 'star' | 'cards' | 'chips';
  size?: number;
  className?: string;
}

const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const bounceVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const rotateVariants: Variants = {
  animate: {
    rotate: [0, 360],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

const shakeVariants: Variants = {
  animate: {
    rotate: [-5, 5, -5],
    transition: {
      duration: 0.3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const glowVariants: Variants = {
  animate: {
    filter: [
      'drop-shadow(0 0 5px rgba(255, 215, 0, 0.5))',
      'drop-shadow(0 0 20px rgba(255, 215, 0, 0.9))',
      'drop-shadow(0 0 5px rgba(255, 215, 0, 0.5))'
    ],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const flipVariants: Variants = {
  animate: {
    rotateY: [0, 180, 360],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const stackVariants: Variants = {
  animate: {
    y: [0, -5, 0, -3, 0],
    scale: [1, 1.05, 1, 1.02, 1],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const AnimatedPokerEmoji = ({ type, size = 64, className = '' }: AnimatedPokerEmojiProps) => {
  const getEmoji = () => {
    switch (type) {
      case 'crown':
        return { emoji: '👑', variants: glowVariants };
      case 'trophy':
        return { emoji: '🏆', variants: bounceVariants };
      case 'fire':
        return { emoji: '🔥', variants: shakeVariants };
      case 'diamond':
        return { emoji: '💎', variants: rotateVariants };
      case 'spade':
        return { emoji: '♠️', variants: pulseVariants };
      case 'heart':
        return { emoji: '♥️', variants: pulseVariants };
      case 'club':
        return { emoji: '♣️', variants: pulseVariants };
      case 'star':
        return { emoji: '⭐', variants: rotateVariants };
      case 'cards':
        return { emoji: '🃏', variants: flipVariants };
      case 'chips':
        return { emoji: '🎰', variants: stackVariants };
      default:
        return { emoji: '🎯', variants: pulseVariants };
    }
  };

  const { emoji, variants } = getEmoji();

  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ fontSize: size }}
      variants={variants}
      animate="animate"
    >
      {emoji}
    </motion.span>
  );
};

// Составные анимированные эмодзи
export const AnimatedWinnerBadge = ({ size = 80 }: { size?: number }) => (
  <div className="relative inline-flex items-center justify-center">
    <motion.div
      className="absolute"
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.5, 0.2, 0.5]
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span style={{ fontSize: size * 1.5 }}>✨</span>
    </motion.div>
    <AnimatedPokerEmoji type="crown" size={size} />
  </div>
);

export const AnimatedChampionTrophy = ({ size = 80 }: { size?: number }) => (
  <div className="relative inline-flex items-center justify-center">
    <motion.div
      className="absolute -top-2"
      animate={{ y: [0, -8, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <span style={{ fontSize: size * 0.4 }}>✨</span>
    </motion.div>
    <AnimatedPokerEmoji type="trophy" size={size} />
    <motion.div
      className="absolute -bottom-1"
      animate={{ scale: [0.8, 1.1, 0.8] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <span style={{ fontSize: size * 0.3 }}>🏅</span>
    </motion.div>
  </div>
);

export const AnimatedPokerHand = ({ size = 60 }: { size?: number }) => (
  <div className="relative inline-flex items-center">
    {['♠️', '♥️', '♦️', '♣️'].map((suit, i) => (
      <motion.span
        key={suit}
        style={{ fontSize: size * 0.6, marginLeft: i > 0 ? -size * 0.2 : 0 }}
        animate={{
          y: [0, -5 * (i % 2 === 0 ? 1 : -1), 0],
          rotate: [-5 + i * 3, 5 - i * 3, -5 + i * 3]
        }}
        transition={{
          duration: 1 + i * 0.2,
          repeat: Infinity,
          delay: i * 0.1
        }}
      >
        {suit}
      </motion.span>
    ))}
  </div>
);

export const AnimatedFireStreak = ({ size = 60 }: { size?: number }) => (
  <div className="relative inline-flex items-center">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        style={{ fontSize: size * (1 - i * 0.2), marginLeft: i > 0 ? -size * 0.3 : 0 }}
        animate={{
          y: [0, -3, 0],
          scale: [1, 1.1, 1],
          opacity: [0.7 + i * 0.1, 1, 0.7 + i * 0.1]
        }}
        transition={{
          duration: 0.5 + i * 0.1,
          repeat: Infinity,
          delay: i * 0.15
        }}
      >
        🔥
      </motion.span>
    ))}
  </div>
);

export const AnimatedChipsStack = ({ size = 60 }: { size?: number }) => (
  <div className="relative inline-flex flex-col items-center">
    {['🟡', '🔴', '🔵', '⚫'].map((chip, i) => (
      <motion.span
        key={i}
        style={{ 
          fontSize: size * 0.5, 
          marginTop: i > 0 ? -size * 0.25 : 0,
          zIndex: 4 - i
        }}
        animate={{
          y: [0, -2, 0],
          x: [0, i % 2 === 0 ? 1 : -1, 0]
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.1
        }}
      >
        {chip}
      </motion.span>
    ))}
  </div>
);

export default AnimatedPokerEmoji;
