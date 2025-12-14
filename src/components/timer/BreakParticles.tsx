import { useEffect, useState } from "react";
import { Coffee, Clock, Zap } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  y: number;
  icon: 'coffee' | 'clock' | 'steam';
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const BreakParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles: Particle[] = [];
      const icons: ('coffee' | 'clock' | 'steam')[] = ['coffee', 'coffee', 'coffee', 'steam', 'steam', 'clock'];
      
      for (let i = 0; i < 15; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          icon: icons[Math.floor(Math.random() * icons.length)],
          size: 16 + Math.random() * 24,
          duration: 8 + Math.random() * 12,
          delay: Math.random() * 5,
          opacity: 0.15 + Math.random() * 0.25
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  const renderIcon = (particle: Particle) => {
    const style = {
      width: particle.size,
      height: particle.size,
    };

    switch (particle.icon) {
      case 'coffee':
        return <Coffee style={style} />;
      case 'clock':
        return <Clock style={style} />;
      case 'steam':
        return (
          <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 14c0 2.21 1.79 4 4 4s4-1.79 4-4" />
            <path d="M12 10v4" />
            <path d="M8 6c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V6z" />
          </svg>
        );
      default:
        return <Coffee style={style} />;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute text-[hsl(40,100%,55%)]"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity,
            animation: `float-particle ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          {renderIcon(particle)}
        </div>
      ))}
      
      {/* Steam rising effect */}
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2">
        {[...Array(5)].map((_, i) => (
          <div
            key={`steam-${i}`}
            className="absolute w-8 h-8 rounded-full bg-[hsl(40,80%,70%)]"
            style={{
              left: `${-40 + i * 20}px`,
              opacity: 0.1,
              filter: 'blur(10px)',
              animation: `steam-rise ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
