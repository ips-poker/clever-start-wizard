# 🔧 Восстановление работы api.syndicate-poker.ru через Nginx прокси

## ❌ Текущая проблема

**DNS:** `api.syndicate-poker.ru` → **CNAME** → `mokhssmnorrhohrowxvu.supabase.co`  
**Результат:** Работает через VPN, НЕ работает на LTE (блокировка оператором)

## ✅ Правильное решение

**DNS:** `api.syndicate-poker.ru` → **A-запись** → `89.104.74.121` (ваш nginx сервер)  
**Nginx:** Проксирует запросы на `mokhssmnorrhohrowxvu.supabase.co`  
**Результат:** Работает везде, включая LTE

---

## 📋 План действий

1. Изменить DNS запись с CNAME на A-запись
2. Проверить/восстановить конфигурацию nginx на сервере
3. Обновить код приложения
4. Протестировать на LTE

---

## ШАГ 1: Изменение DNS записей

### 1.1 Вход в ISPManager
- URL: https://server194.hosting.reg.ru:1500
- Логин: `ce113322055`
- Раздел: **Управление DNS**

### 1.2 Удалить CNAME запись
Найти и удалить:
```
api.syndicate-poker.ru → CNAME → mokhssmnorrhohrowxvu.supabase.co
```

### 1.3 Создать A-запись
**Добавить новую запись:**
- **Тип записи:** `A (адрес Internet v4)`
- **Имя:** `api`
- **Значение:** `89.104.74.121`
- **TTL:** `3600` (или меньше для быстрой смены)

### 1.4 Сохранить TXT запись для SSL
**Оставить как есть:**
```
_acme-challenge.api.syndicate-poker.ru → TXT → [значение]
```

### 1.5 Проверка DNS (через 5-10 минут)
```bash
# Windows PowerShell или CMD
nslookup api.syndicate-poker.ru

# Должен вернуться:
# Name:    api.syndicate-poker.ru
# Address: 89.104.74.121

# Linux/Mac
dig api.syndicate-poker.ru A +short
# Должно вернуть: 89.104.74.121
```

---

## ШАГ 2: Проверка nginx на сервере

### 2.1 Подключение к серверу
```bash
ssh root@89.104.74.121
# Пароль: MpllODphydCZYstt
```

### 2.2 Проверка статуса nginx
```bash
# Проверить запущен ли nginx
systemctl status nginx

# Если не запущен, запустить:
systemctl start nginx
systemctl enable nginx
```

### 2.3 Проверка конфигурации nginx
```bash
# Проверить наличие конфигурации
ls -la /etc/nginx/sites-available/api.syndicate-poker.ru
ls -la /etc/nginx/sites-enabled/api.syndicate-poker.ru

# Проверить содержимое
cat /etc/nginx/sites-available/api.syndicate-poker.ru
```

### 2.4 Если конфигурации нет - создать
```bash
# Создать конфигурацию
nano /etc/nginx/sites-available/api.syndicate-poker.ru
```

**Вставить содержимое из файла `nginx-proxy-config.conf`:**
```nginx
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
```

**Сохранить:** `Ctrl+X` → `Y` → `Enter`

### 2.5 Активировать конфигурацию
```bash
# Создать симлинк если нет
ln -sf /etc/nginx/sites-available/api.syndicate-poker.ru /etc/nginx/sites-enabled/

# Удалить default если есть
rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Должно вывести:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 2.6 Проверка SSL сертификата
```bash
# Проверить наличие сертификата
ls -la /etc/letsencrypt/live/api.syndicate-poker.ru/

# Если сертификата нет:
certbot certonly --nginx -d api.syndicate-poker.ru
```

### 2.7 Перезапустить nginx
```bash
systemctl restart nginx
systemctl status nginx
```

### 2.8 Проверка firewall
```bash
# Проверить открыты ли порты
ufw status

# Если firewall не настроен:
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## ШАГ 3: Тестирование сервера

### 3.1 Тест с сервера
```bash
# На сервере выполнить:
curl -I https://api.syndicate-poker.ru

# Должно вернуть:
# HTTP/2 200
# или HTTP/2 401 (это нормально, нужен API key)
```

### 3.2 Просмотр логов
```bash
# Последние 50 строк ошибок
tail -50 /var/log/nginx/supabase-proxy-error.log

# Последние 50 запросов
tail -50 /var/log/nginx/supabase-proxy-access.log

# Следить в реальном времени
tail -f /var/log/nginx/supabase-proxy-access.log
```

### 3.3 Тест с локальной машины
```bash
# Через curl
curl -I https://api.syndicate-poker.ru/rest/v1/

# Должно вернуть:
# HTTP/2 401 (нормально, нужен apikey)
# Или другой код, но НЕ connection refused/timeout
```

---

## ШАГ 4: Обновление кода приложения

После того как DNS распространился и nginx работает, обновляем код:

### 4.1 Файл: src/integrations/supabase/client.ts
```typescript
// Используем кастомный домен через nginx прокси
const SUPABASE_URL = "https://api.syndicate-poker.ru";
```

### 4.2 Файл: .env
```env
VITE_SUPABASE_URL="https://api.syndicate-poker.ru"
```

---

## ШАГ 5: Финальное тестирование

### 5.1 Тест на компьютере
1. Открыть https://syndicate-poker.ru
2. F12 → Network
3. Фильтр: `api.syndicate`
4. Обновить страницу
5. Все запросы должны идти на `api.syndicate-poker.ru`
6. Данные должны загружаться

### 5.2 Тест на телефоне через LTE
1. **Выключить VPN и WiFi**
2. Использовать только LTE
3. Открыть https://syndicate-poker.ru
4. Проверить загрузку данных
5. Проверить авторизацию
6. Проверить создание/редактирование записей

---

## 🔍 Диагностика проблем

### Проблема: DNS не обновился
```bash
# Проверить DNS
nslookup api.syndicate-poker.ru

# Очистить DNS кеш (Windows)
ipconfig /flushdns

# Подождать 10-30 минут
```

### Проблема: 502 Bad Gateway
```bash
# На сервере проверить:
systemctl status nginx
tail -100 /var/log/nginx/supabase-proxy-error.log

# Проверить доступность Supabase
curl -I https://mokhssmnorrhohrowxvu.supabase.co
```

### Проблема: SSL ошибка
```bash
# Проверить сертификат
certbot certificates

# Переустановить если нужно
certbot renew --force-renewal
systemctl restart nginx
```

### Проблема: Connection timeout на LTE
```bash
# Проверить что DNS указывает на правильный IP
dig api.syndicate-poker.ru A +short
# Должно быть: 89.104.74.121

# Проверить firewall
ufw status
# Должны быть открыты: 22, 80, 443
```

---

## 📊 Схема работы

### ❌ Старая схема (не работает на LTE)
```
Клиент (LTE) 
    ↓
api.syndicate-poker.ru (DNS CNAME)
    ↓
mokhssmnorrhohrowxvu.supabase.co ← БЛОКИРОВКА ОПЕРАТОРОМ
    ↓
❌ Не работает
```

### ✅ Новая схема (работает везде)
```
Клиент (LTE)
    ↓
api.syndicate-poker.ru (DNS A-запись)
    ↓
89.104.74.121 (VPS с nginx) ← Обычный сервер, не блокируется
    ↓
mokhssmnorrhohrowxvu.supabase.co ← Прокси запрос с сервера
    ↓
✅ Работает!
```

---

## 🎯 Почему это работает?

1. **Оператор не видит конечный адрес**  
   С точки зрения оператора, вы подключаетесь к обычному VPS серверу `89.104.74.121`

2. **Nginx делает запросы от имени сервера**  
   Сервер уже сам делает запросы к Supabase, используя свой IP

3. **SSL работает корректно**  
   Let's Encrypt выдает сертификат для `api.syndicate-poker.ru`

4. **Нет блокировок**  
   Оператор не блокирует обычные VPS серверы

---

## 📝 Checklist

- [ ] DNS изменен с CNAME на A-запись (89.104.74.121)
- [ ] DNS распространился (проверено через nslookup)
- [ ] Nginx запущен на сервере
- [ ] Конфигурация nginx настроена правильно
- [ ] SSL сертификат получен
- [ ] Firewall настроен (порты 80, 443 открыты)
- [ ] Тест с сервера работает (curl -I https://api.syndicate-poker.ru)
- [ ] Код приложения обновлен (SUPABASE_URL)
- [ ] Тест на компьютере работает
- [ ] Тест на телефоне (LTE без VPN) работает

---

## 🔐 Учетные данные

### Сервер VPS
- **IP:** 89.104.74.121
- **Логин:** root
- **Пароль:** MpllODphydCZYstt

### ISPManager DNS
- **URL:** https://server194.hosting.reg.ru:1500
- **Логин:** ce113322055
- **Пароль:** omt5_y9DEq!p0Sl

### Supabase
- **Project ID:** mokhssmnorrhohrowxvu
- **URL:** https://mokhssmnorrhohrowxvu.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/mokhssmnorrhohrowxvu

---

## ⚠️ ВАЖНО

1. После изменения DNS подождите **10-30 минут** для распространения
2. Не удаляйте TXT запись `_acme-challenge` - она нужна для SSL
3. Регулярно обновляйте сервер: `apt update && apt upgrade -y`
4. Мониторьте логи nginx на ошибки

---

## 📞 Поддержка

Если что-то не работает:
1. Проверьте все пункты в Checklist
2. Посмотрите логи nginx на сервере
3. Проверьте что DNS обновился
4. Убедитесь что firewall настроен правильно
