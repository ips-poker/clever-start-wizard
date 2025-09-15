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

const Index = () => {
  return (
    <>
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
      <div className="min-h-screen">
        <Header />
        <main role="main">
          <Hero />
          <LazyTournamentList />
          <TopPlayers />
          <RatingBenefits />
          <Features />
          <Gallery />
          <SocialProof />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
