import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, content, pageSlug, keywords, competitors } = await req.json();

    // Анализ с Perplexity API специально для российского SEO
    const analysisPrompt = `
    Проанализируй SEO оптимизацию для покерного клуба в России под Яндекс поиск:
    
    URL: ${url}
    Контент: ${content}
    Ключевые слова: ${keywords || 'покер клуб, турниры по покеру, рейтинговая система покера'}
    Конкуренты: ${competitors || 'pokerdom.ru, pokerstars.ru, partypoker.ru'}
    
    Дай конкретные рекомендации:
    1. Оптимальные title и description для Яндекса
    2. H1 заголовок и структуру H2-H6
    3. Ключевые слова и их плотность
    4. Мета-теги для Яндекса (robots, geo, etc)
    5. Structured data для покерного клуба
    6. Конкретные фразы для региона Москва
    7. Внутренние ссылки и анкоры
    8. Рекомендации по контенту
    
    Ответ в JSON формате с детальными рекомендациями на русском языке.
    `;

    console.log('Sending request to Perplexity API for SEO analysis');

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по SEO оптимизации для российского рынка и Яндекса. Отвечай только на русском языке с конкретными рекомендациями.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
        return_images: false,
        return_related_questions: false,
        search_domain_filter: ['ya.ru', 'yandex.ru'],
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    const analysisResult = perplexityData.choices[0].message.content;

    console.log('Analysis result from Perplexity:', analysisResult);

    // Парсим результат анализа
    let parsedAnalysis;
    try {
      // Пытаемся извлечь JSON из ответа
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        // Если JSON не найден, создаем структурированный ответ
        parsedAnalysis = {
          recommendations: analysisResult,
          score: 65,
          issues: ['Требуется оптимизация для Яндекса', 'Добавить региональные ключевые слова'],
          suggestions: ['Оптимизировать title для региона', 'Добавить schema markup', 'Улучшить внутреннюю перелинковку']
        };
      }
    } catch (e) {
      console.error('Error parsing analysis result:', e);
      parsedAnalysis = {
        recommendations: analysisResult,
        score: 65,
        issues: ['Требуется оптимизация для Яндекса'],
        suggestions: ['Оптимизировать мета-теги', 'Добавить structured data']
      };
    }

    // Сохраняем результат анализа в базу
    const { error: saveError } = await supabase
      .from('cms_content')
      .upsert({
        page_slug: `seo_analysis_${pageSlug}`,
        content_key: 'analysis_result',
        content_type: 'json',
        content_value: JSON.stringify(parsedAnalysis),
        meta_data: {
          analyzed_at: new Date().toISOString(),
          url: url,
          keywords: keywords
        }
      });

    if (saveError) {
      console.error('Error saving analysis result:', saveError);
    }

    // Генерируем автоматические SEO рекомендации
    const seoRecommendations = {
      title: `EPC Event Poker Club - Покерный клуб в Москве | Турниры и рейтинг RPS`,
      description: `Премиальный покерный клуб EPC в Москве. Турниры по покеру, уникальная рейтинговая система RPS, элитное сообщество игроков. Присоединяйся к лучшему покер клубу!`,
      h1: `EPC Event Poker Club - Покерный клуб премиум-класса в Москве`,
      keywords: `покер клуб москва, турниры по покеру, покерный клуб премиум, рейтинговая система покера, EPC покер, элитный покер клуб`,
      schema: {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "EPC Event Poker Club",
        "description": "Премиальный покерный клуб в Москве",
        "url": "https://epc-poker.ru",
        "logo": "https://epc-poker.ru/logo.png",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Москва",
          "addressCountry": "RU"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service"
        },
        "sameAs": ["https://t.me/epc_poker"]
      }
    };

    return new Response(JSON.stringify({
      success: true,
      analysis: parsedAnalysis,
      recommendations: seoRecommendations,
      score: parsedAnalysis.score || 65,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in SEO analyzer function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});