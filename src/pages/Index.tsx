import React from 'react';
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

const Index = () => {
  return (
    <>
      <ScrollProgress />
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Elegant Poker Chips Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10 z-0">
          {/* Scattered elegant chips */}
          <div className="absolute top-20 left-10 w-16 h-16 rounded-full animate-pulse-slow">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 opacity-30"></div>
            <div className="absolute inset-1 rounded-full bg-slate-900/80 border border-amber-400/20"></div>
          </div>
          
          <div className="absolute top-1/4 right-20 w-12 h-12 rounded-full animate-bounce-subtle">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 opacity-25"></div>
            <div className="absolute inset-1 rounded-full bg-slate-900/80 border border-purple-400/20"></div>
          </div>
          
          <div className="absolute bottom-1/3 left-1/4 w-20 h-20 rounded-full animate-pulse-slow">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-red-600 opacity-35"></div>
            <div className="absolute inset-1.5 rounded-full bg-slate-900/80 border-2 border-red-400/20"></div>
          </div>
          
          <div className="absolute bottom-20 right-1/4 w-14 h-14 rounded-full animate-bounce-subtle">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 opacity-25"></div>
            <div className="absolute inset-1 rounded-full bg-slate-900/80 border border-blue-400/20"></div>
          </div>
        </div>

        {/* Elegant Poker Suits */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10 z-0">
          <div className="absolute top-20 left-10 animate-pulse-slow">
            <div className="text-amber-400/40 text-6xl filter drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">♠</div>
          </div>
          <div className="absolute top-1/3 right-20 animate-bounce-subtle">
            <div className="text-amber-400/35 text-5xl filter drop-shadow-[0_0_12px_rgba(251,191,36,0.25)]">♣</div>
          </div>
          <div className="absolute bottom-1/3 left-20 animate-pulse-slow">
            <div className="text-red-400/45 text-7xl filter drop-shadow-[0_0_20px_rgba(248,113,113,0.4)]">♥</div>
          </div>
          <div className="absolute bottom-20 right-10 animate-bounce-subtle">
            <div className="text-amber-400/30 text-4xl filter drop-shadow-[0_0_10px_rgba(251,191,36,0.2)]">♦</div>
          </div>
          <div className="absolute top-1/2 left-1/3 animate-pulse-slow">
            <div className="text-purple-400/30 text-5xl filter drop-shadow-[0_0_12px_rgba(192,132,252,0.25)]">♠</div>
          </div>
          <div className="absolute bottom-1/2 right-1/3 animate-bounce-subtle">
            <div className="text-blue-400/25 text-6xl filter drop-shadow-[0_0_15px_rgba(96,165,250,0.3)]">♦</div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-glow">
            <div className="text-amber-400/10 text-9xl rotate-45 filter drop-shadow-[0_0_25px_rgba(251,191,36,0.15)]">♠</div>
          </div>
        </div>
        
        {/* Ambient light spots */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <Header />
        <main role="main" className="relative z-10">
          <Hero />
          <LazyTournamentList />
          <TopPlayers />
          <RatingBenefits />
          <Features />
          <Gallery />
          <SocialProof />
        </main>
        <Footer />
        
        {/* Custom global animations */}
        <style>{`
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
            0%, 100% { opacity: 0.1; transform: translate(-50%, -50%) rotate(45deg) scale(1); }
            50% { opacity: 0.15; transform: translate(-50%, -50%) rotate(45deg) scale(1.05); }
          }
        `}</style>
      </div>
    </>
  );
};

export default Index;
