# 🚀 Быстрая настройка Nginx прокси (5 минут)

## 📋 Предварительные требования

✅ DNS изменен: `api.syndicate-poker.ru` → A-запись → `89.104.74.121`  
✅ DNS распространился (проверить: `nslookup api.syndicate-poker.ru`)

---

## 🔧 Команды для копирования (выполнять на сервере)

### 1️⃣ Подключение к серверу
```bash
ssh root@89.104.74.121
# Пароль: MpllODphydCZYstt
```

### 2️⃣ Установка nginx (если нет)
```bash
apt update && apt upgrade -y
apt install nginx certbot python3-certbot-nginx -y
```

### 3️⃣ Создание конфигурации (скопировать целиком)
```bash
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
EOF
```

### 4️⃣ Активация конфигурации
```bash
ln -sf /etc/nginx/sites-available/api.syndicate-poker.ru /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
```

**Должно вывести:** `syntax is ok` и `test is successful`

### 5️⃣ Получение SSL сертификата
```bash
certbot certonly --nginx -d api.syndicate-poker.ru
```

Введите:
- Email для уведомлений
- `Y` - согласие с Terms
- `N` или `Y` - новости

### 6️⃣ Перезапуск nginx
```bash
systemctl restart nginx
systemctl status nginx
```

**Должно быть:** `active (running)` зелёным

### 7️⃣ Настройка firewall
```bash
ufw allow 22/tcp
ufw allow 80/tcp  
ufw allow 443/tcp
ufw --force enable
ufw status
```

### 8️⃣ Проверка работы
```bash
# Тест API
curl -I https://api.syndicate-poker.ru

# Должно вернуть: HTTP/2 200 или HTTP/2 401
```

---

## ✅ Проверка на телефоне (LTE)

1. **Выключить WiFi и VPN**
2. Открыть https://syndicate-poker.ru
3. Проверить загрузку данных
4. Проверить авторизацию

---

## 📊 Просмотр логов

```bash
# Последние ошибки
tail -50 /var/log/nginx/supabase-proxy-error.log

# Последние запросы  
tail -50 /var/log/nginx/supabase-proxy-access.log

# Следить в реальном времени
tail -f /var/log/nginx/supabase-proxy-access.log
# Ctrl+C для выхода
```

---

## 🔍 Диагностика проблем

### ❌ Ошибка "nginx: [emerg] bind() to 0.0.0.0:80 failed"
```bash
# Проверить что занимает порт
netstat -tlnp | grep :80

# Остановить Apache если установлен
systemctl stop apache2
systemctl disable apache2

# Перезапустить nginx
systemctl restart nginx
```

### ❌ Ошибка "502 Bad Gateway"
```bash
# Проверить доступность Supabase
curl -I https://mokhssmnorrhohrowxvu.supabase.co

# Посмотреть логи
tail -100 /var/log/nginx/supabase-proxy-error.log
```

### ❌ SSL сертификат не получается
```bash
# Убедиться что DNS распространился
dig api.syndicate-poker.ru A +short
# Должно вернуть: 89.104.74.121

# Попробовать standalone режим
systemctl stop nginx
certbot certonly --standalone -d api.syndicate-poker.ru
systemctl start nginx
```

---

## 🎉 Готово!

Ваш nginx прокси настроен и работает!

**Схема работы:**
```
Клиент (LTE) 
    ↓
api.syndicate-poker.ru
    ↓  
89.104.74.121 (nginx)
    ↓
mokhssmnorrhohrowxvu.supabase.co
    ↓
✅ Работает на LTE!
```

---

## 🔐 Доступы

**Сервер:** 89.104.74.121  
**Логин:** root  
**Пароль:** MpllODphydCZYstt

**Важно:** Смените пароль после настройки!
```bash
passwd
```
