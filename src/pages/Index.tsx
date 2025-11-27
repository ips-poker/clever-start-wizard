import React, { useEffect, useState, useRef } from 'react';
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { RatingBenefits } from "@/components/RatingBenefits";
import { Features } from "@/components/Features";
import { Gallery } from "@/components/Gallery";
import { SocialProof } from "@/components/SocialProof";
import { Footer } from "@/components/Footer";
import { LazyTournamentList } from "@/components/LazyTournamentList";
import { TopPlayers } from "@/components/TopPlayers";
import { SEOHead } from "@/components/SEOHead";
import { ScrollProgress } from "@/components/ScrollProgress";
import { FloatingParticles } from "@/components/ui/floating-particles";

const Index = () => {
  const [scrollY, setScrollY] = useState(0);
  const baseTextureRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const platesRef = useRef<HTMLDivElement>(null);
  const glowTopRef = useRef<HTMLDivElement>(null);
  const glowBottomRef = useRef<HTMLDivElement>(null);
  const glowCenterRef = useRef<HTMLDivElement>(null);

  // Refs for section animations
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      
      // Apply parallax transforms with different speeds for depth
      if (baseTextureRef.current) {
        baseTextureRef.current.style.transform = `translateY(${currentScrollY * 0.15}px)`;
      }
      if (gridRef.current) {
        gridRef.current.style.transform = `translateY(${currentScrollY * 0.25}px)`;
      }
      if (platesRef.current) {
        platesRef.current.style.transform = `translateY(${currentScrollY * 0.35}px) rotate(0deg)`;
      }
      if (glowTopRef.current) {
        glowTopRef.current.style.transform = `translate(-24px, ${-128 + currentScrollY * 0.1}px)`;
      }
      if (glowBottomRef.current) {
        glowBottomRef.current.style.transform = `translate(-120px, ${-180 + currentScrollY * 0.2}px)`;
      }
      if (glowCenterRef.current) {
        glowCenterRef.current.style.transform = `translate(-50%, -50%) scale(${1 + currentScrollY * 0.0001})`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for section animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('section-visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const setSectionRef = (index: number) => (el: HTMLDivElement | null) => {
    sectionRefs.current[index] = el;
  };

  return (
    <>
      <ScrollProgress />
      <FloatingParticles />
      <SEOHead
        pageSlug="home"
        defaultTitle="EPC Event Poker Club - Покерный клуб премиум-класса в Москве | Турниры и рейтинг RPS"
        defaultDescription="Премиальный покерный клуб EPC в Москве. Турниры по покеру, уникальная рейтинговая система RPS, элитное сообщество игроков. Присоединяйся к лучшему покер клубу!"
        defaultKeywords="покер клуб москва, турниры по покеру, покерный клуб премиум, рейтинговая система покера, EPC покер, элитный покер клуб, покер турниры москва, рейтинг покера RPS"
        structuredData={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${window.location.origin}/#organization`,
              "name": "EPC Event Poker Club",
              "alternateName": "EPC Покер Клуб",
              "url": window.location.origin,
              "logo": {
                "@type": "ImageObject",
                "url": `${window.location.origin}/lovable-uploads/84d7799c-d9ab-4819-8831-7e2ba28051e8.png`,
                "width": 400,
                "height": 400
              },
              "description": "Премиальный покерный клуб в Москве с уникальной рейтинговой системой RPS",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Москва",
                "addressRegion": "Московская область", 
                "addressCountry": "RU"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": "55.7558",
                "longitude": "37.6176"
              },
              "areaServed": "Москва",
              "foundingDate": "2020",
              "slogan": "Премиальный покер в сердце Москвы",
              "sameAs": ["https://t.me/epc_poker"]
            },
            {
              "@type": "WebSite",
              "@id": `${window.location.origin}/#website`,
              "url": window.location.origin,
              "name": "EPC Event Poker Club",
              "description": "Премиальный покерный клуб в Москве",
              "publisher": {
                "@id": `${window.location.origin}/#organization`
              },
              "inLanguage": "ru-RU"
            },
            {
              "@type": "WebPage",
              "@id": `${window.location.origin}/#webpage`,
              "url": window.location.origin,
              "name": "EPC Event Poker Club - Покерный клуб премиум-класса в Москве",
              "isPartOf": {
                "@id": `${window.location.origin}/#website`
              },
              "about": {
                "@id": `${window.location.origin}/#organization`
              },
              "description": "Премиальный покерный клуб EPC в Москве. Турниры по покеру, уникальная рейтинговая система RPS, элитное сообщество игроков.",
              "inLanguage": "ru-RU"
            }
          ]
        }}
      />
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

        {/* Diagonal metal plates */}
        <div
          ref={platesRef}
          className="fixed inset-0 pointer-events-none opacity-15 z-0 transition-transform duration-0 will-change-transform"
          style={{
            backgroundImage: `
              linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.9) 40%, rgba(255,255,255,0.06) 41%, rgba(255,255,255,0.06) 42%, rgba(0,0,0,0.9) 43%, rgba(0,0,0,0.9) 100%)
            `,
            backgroundSize: "220px 220px",
          }}
        />

        {/* Neon glows */}
        <div 
          ref={glowTopRef}
          className="fixed w-[520px] h-[520px] bg-syndikate-orange/25 rounded-full blur-[160px] opacity-80 animate-pulse will-change-transform" 
        />
        <div 
          ref={glowBottomRef}
          className="fixed right-0 bottom-0 w-[520px] h-[520px] bg-syndikate-red/20 rounded-full blur-[160px] opacity-80 animate-pulse will-change-transform" 
        />
        <div 
          ref={glowCenterRef}
          className="fixed top-1/2 left-1/2 w-[640px] h-[640px] bg-syndikate-metal-light/10 rounded-full blur-[180px] opacity-70 will-change-transform" 
        />

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
        <main role="main" className="relative z-20">
          <Hero />
          
          {/* Section Divider */}
          <div className="brutal-section-divider">
            <div className="brutal-divider-line" />
            <div className="brutal-divider-bolt brutal-divider-bolt-left" />
            <div className="brutal-divider-bolt brutal-divider-bolt-right" />
          </div>

          <div ref={setSectionRef(0)} className="section-animate">
            <LazyTournamentList />
          </div>

          {/* Section Divider */}
          <div className="brutal-section-divider">
            <div className="brutal-divider-line" />
            <div className="brutal-divider-bolt brutal-divider-bolt-left" />
            <div className="brutal-divider-bolt brutal-divider-bolt-right" />
          </div>

          <div ref={setSectionRef(1)} className="section-animate">
            <TopPlayers />
          </div>

          {/* Section Divider */}
          <div className="brutal-section-divider">
            <div className="brutal-divider-line" />
            <div className="brutal-divider-bolt brutal-divider-bolt-left" />
            <div className="brutal-divider-bolt brutal-divider-bolt-right" />
          </div>

          <div ref={setSectionRef(2)} className="section-animate">
            <RatingBenefits />
          </div>

          {/* Section Divider */}
          <div className="brutal-section-divider">
            <div className="brutal-divider-line" />
            <div className="brutal-divider-bolt brutal-divider-bolt-left" />
            <div className="brutal-divider-bolt brutal-divider-bolt-right" />
          </div>

          <div ref={setSectionRef(3)} className="section-animate">
            <Features />
          </div>

          {/* Section Divider */}
          <div className="brutal-section-divider">
            <div className="brutal-divider-line" />
            <div className="brutal-divider-bolt brutal-divider-bolt-left" />
            <div className="brutal-divider-bolt brutal-divider-bolt-right" />
          </div>

          <div ref={setSectionRef(4)} className="section-animate">
            <Gallery />
          </div>

          {/* Section Divider */}
          <div className="brutal-section-divider">
            <div className="brutal-divider-line" />
            <div className="brutal-divider-bolt brutal-divider-bolt-left" />
            <div className="brutal-divider-bolt brutal-divider-bolt-right" />
          </div>

          <div ref={setSectionRef(5)} className="section-animate">
            <SocialProof />
          </div>
        </main>
        <Footer />
        
        {/* Custom global animations */}
        <style>{`
          /* Brutal Section Dividers */
          .brutal-section-divider {
            position: relative;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .brutal-divider-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              hsl(var(--syndikate-orange)) 15%,
              hsl(var(--syndikate-orange)) 50%,
              hsl(var(--syndikate-orange)) 85%,
              transparent 100%
            );
            box-shadow: 0 0 20px hsla(var(--syndikate-orange), 0.5);
          }

          .brutal-divider-line::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            top: -1px;
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.3) 50%,
              transparent 100%
            );
          }

          .brutal-divider-bolt {
            position: absolute;
            width: 12px;
            height: 12px;
            background: hsl(var(--syndikate-metal));
            border: 2px solid hsl(var(--syndikate-orange));
            border-radius: 50%;
            box-shadow: 
              0 0 10px hsla(var(--syndikate-orange), 0.5),
              inset 0 2px 4px rgba(0, 0, 0, 0.5);
          }

          .brutal-divider-bolt::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 4px;
            height: 4px;
            background: hsl(var(--syndikate-orange));
            border-radius: 50%;
          }

          .brutal-divider-bolt-left {
            left: 10%;
            animation: bolt-pulse 3s ease-in-out infinite;
          }

          .brutal-divider-bolt-right {
            right: 10%;
            animation: bolt-pulse 3s ease-in-out infinite 1.5s;
          }

          @keyframes bolt-pulse {
            0%, 100% {
              box-shadow: 
                0 0 10px hsla(var(--syndikate-orange), 0.5),
                inset 0 2px 4px rgba(0, 0, 0, 0.5);
            }
            50% {
              box-shadow: 
                0 0 20px hsla(var(--syndikate-orange), 0.8),
                0 0 30px hsla(var(--syndikate-orange), 0.4),
                inset 0 2px 4px rgba(0, 0, 0, 0.5);
            }
          }

          /* Section Animations */
          .section-animate {
            opacity: 0;
            transform: translateY(60px);
            transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .section-animate.section-visible {
            opacity: 1;
            transform: translateY(0);
          }

          /* Stagger animation for child elements */
          .section-visible > * {
            animation: stagger-fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards;
          }

          .section-visible > *:nth-child(1) { animation-delay: 0.1s; }
          .section-visible > *:nth-child(2) { animation-delay: 0.2s; }
          .section-visible > *:nth-child(3) { animation-delay: 0.3s; }
          .section-visible > *:nth-child(4) { animation-delay: 0.4s; }
          .section-visible > *:nth-child(5) { animation-delay: 0.5s; }

          @keyframes stagger-fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Smooth scroll behavior */
          html {
            scroll-behavior: smooth;
          }

          /* Existing animations */
          .animate-bounce-subtle {
            animation: bounce-subtle 4s ease-in-out infinite;
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 8s ease-in-out infinite;
          }
          
          .animate-glow {
            animation: glow 10s ease-in-out infinite;
          }

          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
            50% { transform: translateY(-15px) rotate(var(--tw-rotate)); }
          }

          @keyframes pulse-slow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }

          @keyframes glow {
            0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) rotate(45deg) scale(1); }
            50% { opacity: 0.25; transform: translate(-50%, -50%) rotate(45deg) scale(1.05); }
          }

          /* Performance optimizations */
          .will-change-transform {
            will-change: transform;
          }

          /* Reduce motion for accessibility */
          @media (prefers-reduced-motion: reduce) {
            .section-animate,
            .brutal-divider-bolt,
            .animate-bounce-subtle,
            .animate-pulse-slow,
            .animate-glow {
              animation: none !important;
              transition: none !important;
            }

            .section-animate {
              opacity: 1;
              transform: none;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default Index;