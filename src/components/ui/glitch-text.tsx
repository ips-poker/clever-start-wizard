import React, { useEffect, useState, useRef } from "react";

interface GlitchTextProps {
  text: string;
  className?: string;
  glitchIntensity?: 'low' | 'medium' | 'high';
}

export function GlitchText({ text, className = "", glitchIntensity = 'medium' }: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false);
  const glitchRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const glitchIntervals = {
      low: 4000,
      medium: 3000,
      high: 2000
    };

    const glitchDurations = {
      low: 200,
      medium: 300,
      high: 400
    };

    const interval = glitchIntervals[glitchIntensity];
    const duration = glitchDurations[glitchIntensity];

    const triggerGlitch = () => {
      setIsGlitching(true);
      setTimeout(() => {
        setIsGlitching(false);
      }, duration);
    };

    // Initial glitch
    const initialTimeout = setTimeout(triggerGlitch, 1000);

    // Recurring glitches
    const glitchInterval = setInterval(triggerGlitch, interval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(glitchInterval);
    };
  }, [glitchIntensity]);

  return (
    <span ref={glitchRef} className={`relative inline-block ${className}`}>
      {/* Main text */}
      <span className="relative z-10">{text}</span>
      
      {/* Glitch layers */}
      {isGlitching && (
        <>
          {/* Red channel */}
          <span 
            className="absolute inset-0 text-syndikate-red opacity-70 animate-glitch-1"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
              transform: 'translate(-2px, 0)'
            }}
            aria-hidden="true"
          >
            {text}
          </span>
          
          {/* Blue channel */}
          <span 
            className="absolute inset-0 text-blue-400 opacity-70 animate-glitch-2"
            style={{
              clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
              transform: 'translate(2px, 0)'
            }}
            aria-hidden="true"
          >
            {text}
          </span>
          
          {/* White flash */}
          <span 
            className="absolute inset-0 text-white opacity-30 animate-glitch-flash"
            aria-hidden="true"
          >
            {text}
          </span>
        </>
      )}

      <style>{`
        @keyframes glitch-1 {
          0% {
            transform: translate(-2px, 0);
            clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          }
          20% {
            transform: translate(3px, -2px);
            clip-path: polygon(0 15%, 100% 15%, 100% 55%, 0 55%);
          }
          40% {
            transform: translate(-3px, 1px);
            clip-path: polygon(0 25%, 100% 25%, 100% 75%, 0 75%);
          }
          60% {
            transform: translate(2px, -1px);
            clip-path: polygon(0 35%, 100% 35%, 100% 85%, 0 85%);
          }
          80% {
            transform: translate(-2px, 2px);
            clip-path: polygon(0 10%, 100% 10%, 100% 60%, 0 60%);
          }
          100% {
            transform: translate(-2px, 0);
            clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          }
        }

        @keyframes glitch-2 {
          0% {
            transform: translate(2px, 0);
            clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
          }
          20% {
            transform: translate(-3px, 2px);
            clip-path: polygon(0 45%, 100% 45%, 100% 90%, 0 90%);
          }
          40% {
            transform: translate(3px, -1px);
            clip-path: polygon(0 20%, 100% 20%, 100% 70%, 0 70%);
          }
          60% {
            transform: translate(-2px, 1px);
            clip-path: polygon(0 30%, 100% 30%, 100% 80%, 0 80%);
          }
          80% {
            transform: translate(2px, -2px);
            clip-path: polygon(0 50%, 100% 50%, 100% 95%, 0 95%);
          }
          100% {
            transform: translate(2px, 0);
            clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
          }
        }

        @keyframes glitch-flash {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
        }

        .animate-glitch-1 {
          animation: glitch-1 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }

        .animate-glitch-2 {
          animation: glitch-2 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }

        .animate-glitch-flash {
          animation: glitch-flash 0.3s ease-in-out both;
        }
      `}</style>
    </span>
  );
}
