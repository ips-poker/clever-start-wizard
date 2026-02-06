import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  type: 'square' | 'line' | 'dot';
}

export function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    // Skip on mobile devices - too CPU intensive
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth < 768;
    
    if (isMobile) {
      return; // Don't run particles on mobile
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles - reduced count for better performance
    const createParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 25000); // Reduced count
      
      for (let i = 0; i < particleCount; i++) {
        const types: Array<'square' | 'line' | 'dot'> = ['square', 'line', 'dot'];
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 4 + 1,
          opacity: Math.random() * 0.3 + 0.1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          type: types[Math.floor(Math.random() * types.length)]
        });
      }
      return particles;
    };

    particlesRef.current = createParticles();

    // Animation loop with frame throttling (30fps instead of 60fps)
    const animate = (currentTime: number) => {
      if (!ctx || !canvas) return;

      // Throttle to ~30fps for better performance
      const elapsed = currentTime - lastFrameTimeRef.current;
      if (elapsed < 33) { // ~30fps
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = currentTime;

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;

        // Wrap around edges
        if (particle.x < -10) particle.x = canvas.width + 10;
        if (particle.x > canvas.width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = canvas.height + 10;
        if (particle.y > canvas.height + 10) particle.y = -10;

        // Draw particle
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Set color - metallic orange/gray
        const colors = [
          `rgba(255, 135, 31, ${particle.opacity})`,  // orange
          `rgba(200, 200, 200, ${particle.opacity})`, // silver
          `rgba(255, 255, 255, ${particle.opacity})`, // white
        ];
        ctx.fillStyle = colors[Math.floor(particle.x * particle.y) % colors.length];
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1;

        // Draw based on type
        switch (particle.type) {
          case 'square':
            ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            ctx.strokeRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            break;
          case 'line':
            ctx.beginPath();
            ctx.moveTo(-particle.size, 0);
            ctx.lineTo(particle.size, 0);
            ctx.stroke();
            break;
          case 'dot':
            ctx.beginPath();
            ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[5]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
