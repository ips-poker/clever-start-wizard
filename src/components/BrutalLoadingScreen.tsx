import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIndustrialSounds } from "@/hooks/useIndustrialSounds";
import { Volume2, VolumeX } from "lucide-react";
import syndikateLogo from "@/assets/syndikate-logo-main.png";

interface BrutalLoadingScreenProps {
  onLoadingComplete?: () => void;
  enableSounds?: boolean;
}

export const BrutalLoadingScreen = ({ onLoadingComplete, enableSounds: initialEnableSounds = false }: BrutalLoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(initialEnableSounds);
  
  const { playMetallic, playSpark, playHum, playPowerUp } = useIndustrialSounds({ 
    enabled: soundsEnabled,
    volume: 0.2 
  });

  useEffect(() => {
    if (soundsEnabled) {
      playHum();
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 15;
        
        // Play sounds at milestones
        if (soundsEnabled) {
          if (Math.floor(newProgress / 10) > Math.floor(prev / 10)) {
            playSpark();
          }
          if (newProgress >= 25 && prev < 25) playMetallic();
          if (newProgress >= 50 && prev < 50) playMetallic();
          if (newProgress >= 75 && prev < 75) playMetallic();
        }

        if (newProgress >= 100) {
          clearInterval(timer);
          if (soundsEnabled) {
            playPowerUp();
          }
          setTimeout(() => {
            setIsComplete(true);
            setTimeout(() => {
              onLoadingComplete?.();
            }, 800);
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 150);

    return () => clearInterval(timer);
  }, [onLoadingComplete, soundsEnabled, playHum, playSpark, playMetallic, playPowerUp]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden"
        >
          {/* Industrial Background Texture */}
          <div className="absolute inset-0 industrial-texture opacity-50" />
          
          {/* Metal Grid */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
                repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
              `
            }}
          />

          {/* Neon Glow Spots */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-syndikate-orange/20 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-syndikate-red/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Sparks */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-syndikate-orange rounded-full"
              initial={{ 
                x: "50vw", 
                y: "50vh",
                scale: 0,
                opacity: 0
              }}
              animate={{
                x: ["50vw", `${Math.random() * 100}vw`],
                y: ["50vh", `${Math.random() * 100}vh`],
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center space-y-8">
            {/* Sound Toggle Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setSoundsEnabled(!soundsEnabled)}
              className="absolute top-8 right-8 p-3 bg-syndikate-metal/50 brutal-border hover:bg-syndikate-metal-light transition-all group"
              aria-label={soundsEnabled ? "Выключить звук" : "Включить звук"}
            >
              {soundsEnabled ? (
                <Volume2 className="h-5 w-5 text-syndikate-orange group-hover:scale-110 transition-transform" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground group-hover:text-syndikate-orange group-hover:scale-110 transition-all" />
              )}
            </motion.button>

            {/* Logo Container with Metal Frame */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
              className="relative"
            >
              {/* Outer Industrial Frame */}
              <div className="relative w-48 h-48">
                {/* Corner Brackets */}
                <div className="absolute -top-2 -left-2 w-12 h-12 border-l-4 border-t-4 border-syndikate-orange animate-pulse" />
                <div className="absolute -top-2 -right-2 w-12 h-12 border-r-4 border-t-4 border-syndikate-orange animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute -bottom-2 -left-2 w-12 h-12 border-l-4 border-b-4 border-syndikate-orange animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute -bottom-2 -right-2 w-12 h-12 border-r-4 border-b-4 border-syndikate-orange animate-pulse" style={{ animationDelay: '1.5s' }} />

                {/* Main Logo Box */}
                <div className="absolute inset-0 brutal-border bg-syndikate-metal/50 backdrop-blur-sm flex items-center justify-center p-8">
                  <motion.img
                    src={syndikateLogo}
                    alt="Syndikate Logo"
                    animate={{ 
                      filter: [
                        "drop-shadow(0 0 20px rgba(255, 135, 31, 0.8)) drop-shadow(0 0 40px rgba(255, 135, 31, 0.4))",
                        "drop-shadow(0 0 30px rgba(255, 135, 31, 1)) drop-shadow(0 0 60px rgba(255, 135, 31, 0.6))",
                        "drop-shadow(0 0 20px rgba(255, 135, 31, 0.8)) drop-shadow(0 0 40px rgba(255, 135, 31, 0.4))"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Rotating Gear Effect */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 border-4 border-syndikate-metal-light/30"
                  style={{
                    clipPath: "polygon(0% 0%, 100% 0%, 100% 10%, 90% 10%, 90% 90%, 100% 90%, 100% 100%, 0% 100%, 0% 90%, 10% 90%, 10% 10%, 0% 10%)"
                  }}
                />
              </div>
            </motion.div>

            {/* Brand Name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center space-y-2"
            >
              <h1 className="font-display text-5xl md:text-6xl uppercase tracking-wider text-foreground">
                SYNDIKATE
              </h1>
              <div className="flex items-center justify-center gap-3">
                <div className="h-[2px] w-12 bg-gradient-neon" />
                <p className="font-display text-xl uppercase tracking-widest text-syndikate-orange">
                  Poker Club
                </p>
                <div className="h-[2px] w-12 bg-gradient-neon" />
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="w-80 space-y-3">
              {/* Progress Container */}
              <div className="relative h-3 bg-syndikate-concrete brutal-border overflow-hidden">
                {/* Progress Fill */}
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-neon"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Scanning Line */}
                <motion.div
                  className="absolute inset-y-0 w-1 bg-syndikate-orange shadow-neon-orange"
                  animate={{
                    left: ['0%', '100%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />

                {/* Grid Overlay */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255, 255, 255, 0.1) 10px, rgba(255, 255, 255, 0.1) 11px)'
                  }}
                />
              </div>

              {/* Progress Text */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-syndikate-orange rounded-full animate-neon-pulse" />
                  <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                    Загрузка системы
                  </span>
                </div>
                <span className="font-display text-lg text-syndikate-orange">
                  {Math.floor(progress)}%
                </span>
              </div>

              {/* Loading Messages */}
              <motion.div
                key={Math.floor(progress / 25)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs uppercase tracking-wider text-muted-foreground/70"
              >
                {progress < 25 && "• Инициализация системы..."}
                {progress >= 25 && progress < 50 && "• Загрузка турниров..."}
                {progress >= 50 && progress < 75 && "• Подключение к рейтингу RPS..."}
                {progress >= 75 && progress < 100 && "• Финальная проверка..."}
                {progress >= 100 && "• Готово!"}
              </motion.div>
            </div>

            {/* Warning Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 w-full max-w-2xl px-4"
            >
              <div className="bg-syndikate-red/10 border-l-4 border-syndikate-red px-6 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wider text-center text-foreground">
                  <span className="text-syndikate-red font-bold">Внимание:</span> Только для совершеннолетних • 18+
                </p>
              </div>
            </motion.div>
          </div>

          {/* Scanlines Effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
