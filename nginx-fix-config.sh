#!/bin/bash

# Удаляем неправильный файл
rm -f /etc/nginx/sites-available/api.syndicate-poker.ru
rm -f /etc/nginx/sites-enabled/api.syndicate-poker.ru

# Создаем правильную конфигурацию
cat > /etc/nginx/sites-available/api.syndicate-poker.ru << 'ENDOFFILE'
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

    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;

    client_max_body_size 50M;

    location / {
        proxy_pass https://mokhssmnorrhohrowxvu.supabase.co;
        
        proxy_ssl_server_name on;
        proxy_ssl_name mokhssmnorrhohrowxvu.supabase.co;
        
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
ENDOFFILE

# Активируем конфигурацию
ln -sf /etc/nginx/sites-available/api.syndicate-poker.ru /etc/nginx/sites-enabled/

# Тестируем
nginx -t

# Перезапускаем nginx
systemctl restart nginx

# Проверяем статус
systemctl status nginx

echo ""
echo "✅ Конфигурация исправлена и применена!"
echo "Проверьте работу: curl -I https://api.syndicate-poker.ru"
