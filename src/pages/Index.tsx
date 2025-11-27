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
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Industrial metal base texture */}
        <div className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0" />

        {/* Metal grid overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px),
              repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)
            `,
          }}
        />

        {/* Diagonal metal plates */}
        <div
          className="fixed inset-0 pointer-events-none opacity-15 z-0"
          style={{
            backgroundImage: `
              linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.9) 40%, rgba(255,255,255,0.06) 41%, rgba(255,255,255,0.06) 42%, rgba(0,0,0,0.9) 43%, rgba(0,0,0,0.9) 100%)
            `,
            backgroundSize: "220px 220px",
          }}
        />

        {/* Neon glows */}
        <div className="fixed -top-32 -left-24 w-[520px] h-[520px] bg-syndikate-orange/25 rounded-full blur-[160px] opacity-80 animate-pulse" />
        <div className="fixed bottom-[-180px] right-[-120px] w-[520px] h-[520px] bg-syndikate-red/20 rounded-full blur-[160px] opacity-80 animate-pulse" />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-syndikate-metal-light/10 rounded-full blur-[180px] opacity-70" />

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
            0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) rotate(45deg) scale(1); }
            50% { opacity: 0.25; transform: translate(-50%, -50%) rotate(45deg) scale(1.05); }
          }
        `}</style>
      </div>
    </>
  );
};

export default Index;
