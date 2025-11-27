import { useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TournamentList } from "@/components/TournamentList";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { ScrollProgress } from "@/components/ScrollProgress";

export default function Tournaments() {
  const baseTextureRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (baseTextureRef.current) {
        baseTextureRef.current.style.transform = `translateY(${currentScrollY * 0.15}px)`;
      }
      if (gridRef.current) {
        gridRef.current.style.transform = `translateY(${currentScrollY * 0.25}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <ScrollProgress />
      <FloatingParticles />
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Industrial metal base texture */}
        <div 
          ref={baseTextureRef}
          className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0 transition-transform duration-0 will-change-transform" 
        />

        {/* Metal grid overlay */}
        <div
          ref={gridRef}
          className="fixed inset-0 pointer-events-none opacity-20 z-0 transition-transform duration-0 will-change-transform"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px),
              repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)
            `,
          }}
        />

        {/* Neon glows */}
        <div className="fixed top-0 right-1/4 w-[520px] h-[520px] bg-syndikate-orange/25 rounded-full blur-[160px] opacity-80 animate-pulse will-change-transform" />
        <div className="fixed bottom-0 left-1/4 w-[520px] h-[520px] bg-syndikate-red/20 rounded-full blur-[160px] opacity-80 animate-pulse will-change-transform" />

        {/* Side rails and top bar */}
        <div className="fixed inset-y-0 left-0 w-[3px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed inset-y-0 right-0 w-[3px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-syndikate-orange/80 to-transparent pointer-events-none z-10" />

        {/* Subtle noise */}
        <div
          className="fixed inset-0 pointer-events-none opacity-25 mix-blend-soft-light z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "4px 4px",
          }}
        />

        <Header />
        <main className="pt-24 md:pt-20 pb-16 relative z-20">
          <TournamentList />
        </main>
        <Footer />
      </div>
    </>
  );
}