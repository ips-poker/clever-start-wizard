import React, { useState, useEffect, useRef } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  cursor?: boolean;
}

export function TypewriterText({ 
  text, 
  speed = 50, 
  delay = 0,
  className = "",
  onComplete,
  cursor = true
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showCursor, setShowCursor] = useState(cursor);
  const textRef = useRef<HTMLSpanElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted.current) {
            hasStarted.current = true;
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px"
      }
    );

    if (textRef.current) {
      observer.observe(textRef.current);
    }

    return () => {
      if (textRef.current) {
        observer.unobserve(textRef.current);
      }
    };
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else {
      if (onComplete) {
        onComplete();
      }
      // Hide cursor after completion
      setTimeout(() => {
        setShowCursor(false);
      }, 1000);
    }
  }, [currentIndex, isVisible, text, speed, onComplete]);

  return (
    <span ref={textRef} className={className}>
      {displayedText}
      {showCursor && (
        <span className="inline-block w-0.5 h-[1em] bg-syndikate-orange ml-1 animate-cursor-blink" />
      )}
      <style>{`
        @keyframes cursor-blink {
          0%, 49% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
        }
        .animate-cursor-blink {
          animation: cursor-blink 1s infinite;
        }
      `}</style>
    </span>
  );
}
