import { useEffect } from 'react';
import { useCMSContent } from '@/hooks/useCMSContent';
import { useSEOData } from '@/hooks/useSEOData';

interface SEOHeadProps {
  pageSlug: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultKeywords?: string;
  structuredData?: object;
}

export function SEOHead({ 
  pageSlug, 
  defaultTitle, 
  defaultDescription, 
  defaultKeywords,
  structuredData 
}: SEOHeadProps) {
  const { getContent } = useCMSContent(pageSlug);
  const { seoData, loading } = useSEOData(pageSlug);

  useEffect(() => {
    if (loading) return;

    // Получаем SEO данные из CMS или используем fallback
    const title = seoData?.meta_title || 
                  getContent('seo_title', defaultTitle || 'EPC Event Poker Club - Покерный клуб премиум-класса в Москве');
    
    const description = seoData?.meta_description || 
                       getContent('seo_description', defaultDescription || 'Премиальный покерный клуб EPC в Москве. Турниры по покеру, уникальная рейтинговая система RPS, элитное сообщество игроков.');
    
    const keywords = seoData?.meta_keywords || 
                    getContent('seo_keywords', defaultKeywords || 'покер клуб москва, турниры по покеру, покерный клуб премиум, рейтинговая система покера');

    const canonicalUrl = seoData?.canonical_url || window.location.href;
    const robotsMeta = seoData?.robots_meta || 'index, follow';

    // Обновляем title
    document.title = title;

    // Функция для обновления или создания мета-тега
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Основные мета-теги
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('robots', robotsMeta);
    updateMetaTag('author', 'EPC Event Poker Club');
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Яндекс-специфичные мета-теги
    updateMetaTag('yandex-verification', ''); // Заполнить после регистрации в Яндекс.Вебмастер
    updateMetaTag('geo.region', 'RU-MOW');
    updateMetaTag('geo.placename', 'Москва');
    updateMetaTag('geo.position', '55.7558;37.6176'); // Координаты Москвы

    // Open Graph теги
    updateMetaTag('og:title', seoData?.og_title || title, true);
    updateMetaTag('og:description', seoData?.og_description || description, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:url', canonicalUrl, true);
    updateMetaTag('og:site_name', 'EPC Event Poker Club', true);
    updateMetaTag('og:locale', 'ru_RU', true);
    
    if (seoData?.og_image) {
      updateMetaTag('og:image', seoData.og_image, true);
      updateMetaTag('og:image:width', '1200', true);
      updateMetaTag('og:image:height', '630', true);
      updateMetaTag('og:image:alt', title, true);
    }

    // Twitter Card теги
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    if (seoData?.og_image) {
      updateMetaTag('twitter:image', seoData.og_image);
    }

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Structured Data
    const finalStructuredData = structuredData || {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "EPC Event Poker Club",
      "alternateName": "EPC Покер Клуб",
      "description": description,
      "url": canonicalUrl,
      "logo": "/lovable-uploads/84d7799c-d9ab-4819-8831-7e2ba28051e8.png",
      "image": "/lovable-uploads/84d7799c-d9ab-4819-8831-7e2ba28051e8.png",
      "telephone": "+7 (495) 123-45-67",
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
      "areaServed": {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "latitude": "55.7558",
          "longitude": "37.6176"
        },
        "geoRadius": "50000"
      },
      "founder": {
        "@type": "Organization",
        "name": "EPC Event Poker Club"
      },
      "foundingDate": "2020",
      "slogan": "Премиальный покер в сердце Москвы",
      "knowsAbout": [
        "Покер",
        "Турниры по покеру", 
        "Покерные стратегии",
        "Рейтинговая система",
        "Обучение покеру"
      ],
      "offers": {
        "@type": "Offer",
        "name": "Участие в покерных турнирах",
        "description": "Турниры по покеру различных форматов с рейтинговой системой RPS"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": ["Russian"]
      },
      "sameAs": [
        "https://t.me/epc_poker"
      ]
    };

    // Добавляем или обновляем structured data
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(finalStructuredData);

    // Для покерного клуба добавляем дополнительную schema
    const pokerEventSchema = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": "Турниры по покеру EPC",
      "description": "Регулярные покерные турниры в премиальном клубе EPC",
      "location": {
        "@type": "Place",
        "name": "EPC Event Poker Club",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Москва",
          "addressCountry": "RU"
        }
      },
      "organizer": {
        "@type": "Organization",
        "name": "EPC Event Poker Club"
      },
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
    };

    let pokerEventScript = document.querySelector('script[data-schema="poker-events"]') as HTMLScriptElement;
    if (!pokerEventScript) {
      pokerEventScript = document.createElement('script');
      pokerEventScript.type = 'application/ld+json';
      pokerEventScript.setAttribute('data-schema', 'poker-events');
      document.head.appendChild(pokerEventScript);
    }
    pokerEventScript.textContent = JSON.stringify(pokerEventSchema);

  }, [pageSlug, seoData, loading, getContent, defaultTitle, defaultDescription, defaultKeywords, structuredData]);

  return null; // Этот компонент только управляет head, не рендерит UI
}