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
        {/* Global decorative elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-8 z-0">
          <div className="absolute top-20 left-10 text-amber-400/30 text-6xl animate-pulse">♠</div>
          <div className="absolute top-40 right-20 text-amber-400/25 text-5xl animate-bounce-subtle">♣</div>
          <div className="absolute bottom-40 left-20 text-amber-400/35 text-7xl animate-pulse">♥</div>
          <div className="absolute bottom-20 right-10 text-amber-400/20 text-4xl animate-bounce-subtle">♦</div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400/10 text-9xl rotate-45 animate-glow">♠</div>
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
          .animate-glow {
            animation: glow 6s ease-in-out infinite;
          }
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
            50% { transform: translateY(-15px) rotate(var(--tw-rotate)); }
          }
          @keyframes glow {
            0%, 100% { opacity: 0.05; transform: translate(-50%, -50%) rotate(45deg) scale(1); }
            50% { opacity: 0.1; transform: translate(-50%, -50%) rotate(45deg) scale(1.1); }
          }
        `}</style>
      </div>
    </>
  );
};

export default Index;
