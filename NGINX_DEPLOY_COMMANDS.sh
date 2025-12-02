#!/bin/bash
# Команды для настройки nginx прокси на сервере 89.104.74.121
# Выполнять последовательно, после подключения по SSH

echo "=== ШАГ 1: Подключение к серверу ==="
echo "ssh root@89.104.74.121"
echo "Пароль: MpllODphydCZYstt"
echo ""

echo "=== ШАГ 2: Обновление системы ==="
cat << 'EOF'
apt update && apt upgrade -y
EOF
echo ""

echo "=== ШАГ 3: Установка Nginx и Certbot (если не установлены) ==="
cat << 'EOF'
# Проверить установлен ли nginx
systemctl status nginx

# Если не установлен:
apt install nginx -y
apt install certbot python3-certbot-nginx -y
EOF
echo ""

echo "=== ШАГ 4: Создание конфигурации nginx ==="
cat << 'EOF'
# Создать файл конфигурации
cat > /etc/nginx/sites-available/api.syndicate-poker.ru << 'NGINX_CONFIG'
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
NGINX_CONFIG
EOF
echo ""

echo "=== ШАГ 5: Активация конфигурации ==="
cat << 'EOF'
# Создать симлинк
ln -sf /etc/nginx/sites-available/api.syndicate-poker.ru /etc/nginx/sites-enabled/

# Удалить default конфигурацию
rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t
EOF
echo ""

echo "=== ШАГ 6: Получение SSL сертификата (если нет) ==="
cat << 'EOF'
# Проверить наличие сертификата
ls -la /etc/letsencrypt/live/api.syndicate-poker.ru/

# Если сертификата нет, получить:
certbot certonly --nginx -d api.syndicate-poker.ru

# Следовать инструкциям certbot:
# 1. Ввести email
# 2. Согласиться с Terms (Y)
# 3. Новости (N или Y)
EOF
echo ""

echo "=== ШАГ 7: Перезапуск nginx ==="
cat << 'EOF'
systemctl restart nginx
systemctl status nginx
EOF
echo ""

echo "=== ШАГ 8: Настройка firewall ==="
cat << 'EOF'
# Проверить firewall
ufw status

# Если не настроен:
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
EOF
echo ""

echo "=== ШАГ 9: Проверка работы ==="
cat << 'EOF'
# Тест с сервера
curl -I https://api.syndicate-poker.ru

# Просмотр логов
tail -50 /var/log/nginx/supabase-proxy-error.log
tail -50 /var/log/nginx/supabase-proxy-access.log

# Следить за логами в реальном времени
tail -f /var/log/nginx/supabase-proxy-access.log
EOF
echo ""

echo "=== ШАГ 10: Настройка автообновления SSL ==="
cat << 'EOF'
# Тест обновления сертификата
certbot renew --dry-run

# Должно вывести: Congratulations, all simulated renewals succeeded
EOF
echo ""

echo "==================================="
echo "✅ Готово! Nginx прокси настроен"
echo "==================================="
echo ""
echo "Проверьте работу:"
echo "1. На сервере: curl -I https://api.syndicate-poker.ru"
echo "2. На компьютере: откройте https://syndicate-poker.ru"
echo "3. На телефоне (LTE): проверьте работу без VPN"
