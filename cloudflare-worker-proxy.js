/**
 * Cloudflare Worker для проксирования Supabase API
 * 
 * Этот worker перенаправляет все запросы с api.syndikate-poker.ru
 * на реальный Supabase endpoint: mokhssmnorrhohrowxvu.supabase.co
 * 
 * Инструкция по установке:
 * 1. Зайдите в Cloudflare Dashboard -> Workers & Pages
 * 2. Создайте новый Worker с названием "supabase-proxy"
 * 3. Скопируйте весь код из этого файла в редактор Worker
 * 4. Нажмите "Deploy"
 * 5. В Cloudflare Dashboard -> Workers & Pages -> supabase-proxy -> Settings -> Triggers
 *    добавьте Custom Domain: api.syndikate-poker.ru
 * 6. В DNS добавьте CNAME запись:
 *    Имя: api
 *    Цель: supabase-proxy.ваш-аккаунт.workers.dev
 *    Proxy: Включен (оранжевое облако)
 */

const SUPABASE_URL = 'mokhssmnorrhohrowxvu.supabase.co';

export default {
  async fetch(request) {
    // Получаем URL запроса
    const url = new URL(request.url);
    
    // Заменяем хост на реальный Supabase URL
    url.hostname = SUPABASE_URL;
    
    // Базовые CORS заголовки
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      // Значение заголовка Access-Control-Allow-Headers будет доустановлено ниже
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Expose-Headers': 'Content-Range, X-Supabase-Api-Version',
      'Access-Control-Max-Age': '86400',
    };

    // Обработка preflight запросов
    if (request.method === 'OPTIONS') {
      const requestHeaders = request.headers.get('Access-Control-Request-Headers');
      if (requestHeaders) {
        corsHeaders['Access-Control-Allow-Headers'] = requestHeaders;
      } else {
        corsHeaders['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type, range';
      }

      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      // Создаем новый запрос с измененным URL
      const modifiedRequest = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });

      // Проверка на WebSocket upgrade (для Realtime)
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader === 'websocket') {
        // Для WebSocket соединений просто проксируем
        return fetch(modifiedRequest);
      }

      // Выполняем запрос к реальному Supabase
      const response = await fetch(modifiedRequest);

      // Клонируем ответ, чтобы добавить CORS заголовки
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      });

      // Добавляем CORS заголовки к ответу
      Object.entries(corsHeaders).forEach(([key, value]) => {
        modifiedResponse.headers.set(key, value);
      });

      return modifiedResponse;

    } catch (error) {
      // Логирование ошибок
      console.error('Proxy error:', error);
      
      return new Response(
        JSON.stringify({ 
          error: 'Proxy Error', 
          message: error.message 
        }), 
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  }
};
