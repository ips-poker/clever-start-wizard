#!/bin/bash

# Nginx Proxy для Supabase - Установка
# Исправлены: буферы для больших заголовков, DNS resolver

echo "🚀 Установка nginx конфигурации для api.syndicate-poker.ru"
echo ""

# 1. Удаляем старую конфигурацию
echo "🗑️  Удаление старой конфигурации..."
rm -f /etc/nginx/sites-available/api.syndicate-poker.ru
rm -f /etc/nginx/sites-enabled/api.syndicate-poker.ru

# 2. Создаем новую конфигурацию
echo "📝 Создание новой конфигурации..."
cat > /etc/nginx/sites-available/api.syndicate-poker.ru << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.syndicate-poker.ru;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.syndicate-poker.ru;

    ssl_certificate /etc/letsencrypt/live/api.syndicate-poker.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.syndicate-poker.ru/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/api.syndicate-poker.ru/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    access_log /var/log/nginx/supabase-proxy-access.log;
    error_log /var/log/nginx/supabase-proxy-error.log;

    # Увеличенные таймауты
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;

    client_max_body_size 50M;

    # FIX: Увеличенные буферы для больших заголовков
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    large_client_header_buffers 4 64k;

    # FIX: DNS resolver для правильного резолвинга Supabase
    resolver 8.8.8.8 8.8.4.4 1.1.1.1 valid=300s ipv6=off;
    resolver_timeout 10s;

    # Upstream переменная для динамического DNS
    set $supabase_backend "mokhssmnorrhohrowxvu.supabase.co";

    location / {
        # Использование переменной для принудительного DNS резолвинга
        proxy_pass https://$supabase_backend;
        
        proxy_ssl_server_name on;
        proxy_ssl_name mokhssmnorrhohrowxvu.supabase.co;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;

        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'authorization, x-client-info, apikey, content-type, range, x-supabase-api-version, accept-profile, content-profile, prefer' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Range, X-Supabase-Api-Version' always;
        add_header 'Access-Control-Max-Age' '86400' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_buffering off;
        proxy_redirect off;
    }
}
EOF

# 3. Активируем конфигурацию
echo "🔗 Активация конфигурации..."
ln -sf /etc/nginx/sites-available/api.syndicate-poker.ru /etc/nginx/sites-enabled/

# 4. Тестируем конфигурацию
echo "🧪 Тестирование конфигурации..."
nginx -t

# 5. Перезапускаем nginx
if [ $? -eq 0 ]; then
    echo "🔄 Перезапуск nginx..."
    systemctl restart nginx
    
    echo ""
    echo "✅ Готово! Конфигурация установлена и nginx перезапущен."
    echo ""
    echo "📊 Проверьте работу:"
    echo "curl -I https://api.syndicate-poker.ru"
    echo ""
    echo "📋 Ключевые исправления:"
    echo "  • Увеличены буферы proxy_buffer_size до 128k"
    echo "  • Добавлен DNS resolver через Google (8.8.8.8)"
    echo "  • Динамический резолвинг upstream"
    echo ""
    
    # Показать статус
    systemctl status nginx --no-pager -l
else
    echo "❌ Ошибка в конфигурации! Nginx не перезапущен."
    echo ""
    echo "Проверьте синтаксис конфигурации вручную:"
    echo "cat /etc/nginx/sites-available/api.syndicate-poker.ru"
fi
