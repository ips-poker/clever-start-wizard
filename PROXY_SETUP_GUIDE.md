# Полная инструкция по настройке прокси-сервера для Supabase API

## 📋 Что у нас есть

- **Сервер:** 89.104.74.121 (Ubuntu 24.04 LTS)
- **Логин:** root
- **Пароль:** MpllODphydCZYstt
- **Домен:** api.syndicate-poker.ru
- **Supabase Project ID:** mokhssmnorrhohrowxvu
- **Целевой URL:** mokhssmnorrhohrowxvu.supabase.co

## 🎯 Цель

Настроить прокси-сервер для обхода блокировок Supabase через кастомный домен api.syndicate-poker.ru

---

## ЧАСТЬ 1: НАСТРОЙКА SUPABASE

### Шаг 1.1: Добавление кастомного домена в Supabase

1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/mokhssmnorrhohrowxvu/settings/api
2. Перейдите в **Settings** → **API** → **Custom Domains**
3. Нажмите **Add Custom Domain**
4. Введите: `api.syndicate-poker.ru`
5. Supabase покажет DNS записи, которые нужно добавить (TXT и CNAME)
6. **НЕ ЗАКРЫВАЙТЕ ЭТУ СТРАНИЦУ** - данные понадобятся

### Шаг 1.2: Что Supabase покажет (примерно):

```
Добавьте эти DNS записи:

TXT: _acme-challenge.api → [случайная строка для верификации]
CNAME: api → mokhssmnorrhohrowxvu.supabase.co
```

**ВАЖНО:** Мы НЕ будем добавлять CNAME, вместо этого используем A-запись на наш прокси-сервер!

---

## ЧАСТЬ 2: НАСТРОЙКА DNS

### Шаг 2.1: Вход в панель DNS

1. Откройте: https://dnsadmin.hosting.reg.ru/manager/ispmgr
2. Логин: `ce113322055`
3. Пароль: `omt5_y9DEq!p0Sl`

### Шаг 2.2: Настройка DNS записей

#### Удалить существующую CNAME запись (если есть):
- Найдите запись: `CNAME api → mokhssmnorrhohrowxvu.supabase.co`
- Удалите её (иконка корзины)

#### Добавить A-запись:
1. Нажмите **"+ Добавить запись"**
2. Заполните:
   - **Тип записи:** A
   - **Имя:** api
   - **IP-адрес:** 89.104.74.121
   - **TTL:** 300 (или минимальный доступный)
3. Нажмите **Сохранить**

#### Сохранить TXT запись для SSL (уже есть):
- Запись `_acme-challenge` должна остаться как есть
- Она нужна для верификации SSL сертификата

### Шаг 2.3: Проверка DNS (выполнить через 5-10 минут)

На вашем компьютере откройте терминал и выполните:

```bash
# Windows (PowerShell или CMD)
nslookup api.syndicate-poker.ru

# Mac/Linux
dig api.syndicate-poker.ru

# Должен вернуться IP: 89.104.74.121
```

Если DNS еще не обновился, подождите до 30 минут.

---

## ЧАСТЬ 3: НАСТРОЙКА СЕРВЕРА

### Шаг 3.1: Подключение к серверу

Откройте терминал (или PuTTY на Windows) и выполните:

```bash
ssh root@89.104.74.121
# Введите пароль: MpllODphydCZYstt
```

### Шаг 3.2: Смена пароля (ОБЯЗАТЕЛЬНО!)

```bash
passwd
# Введите новый пароль два раза
```

### Шаг 3.3: Обновление системы

```bash
apt update && apt upgrade -y
```

### Шаг 3.4: Установка Nginx

```bash
# Установка Nginx
apt install nginx -y

# Проверка установки
nginx -v

# Должно вывести: nginx version: nginx/1.24.x
```

### Шаг 3.5: Установка Certbot для SSL

```bash
# Установка Certbot
apt install certbot python3-certbot-nginx -y

# Проверка установки
certbot --version
```

### Шаг 3.6: Создание ВРЕМЕННОЙ конфигурации Nginx (без SSL)

```bash
# Создаем конфигурационный файл
nano /etc/nginx/sites-available/api.syndicate-poker.ru
```

Скопируйте и вставьте следующую **ВРЕМЕННУЮ конфигурацию** (без SSL):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.syndicate-poker.ru;

    # Логи
    access_log /var/log/nginx/supabase-proxy-access.log;
    error_log /var/log/nginx/supabase-proxy-error.log;

    # Таймауты
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;

    # Размер файлов
    client_max_body_size 50M;

    # Проксирование к Supabase
    location / {
        proxy_pass https://mokhssmnorrhohrowxvu.supabase.co;
        
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'authorization, x-client-info, apikey, content-type, range, x-supabase-api-version' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Range, X-Supabase-Api-Version' always;
        add_header 'Access-Control-Max-Age' '86400' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }

        # WebSocket для Realtime
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_redirect off;
    }
}
```

**Сохранение файла в nano:**
- Нажмите `Ctrl + X`
- Нажмите `Y` (Yes)
- Нажмите `Enter`

### Шаг 3.7: Активация временной конфигурации

```bash
# Создаем симлинк
ln -s /etc/nginx/sites-available/api.syndicate-poker.ru /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию (если есть)
rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
nginx -t

# Должно вывести: 
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Запускаем Nginx
systemctl restart nginx

# Проверяем статус
systemctl status nginx
```

### Шаг 3.8: Получение SSL сертификата

```bash
# Получаем сертификат (Nginx УЖЕ запущен)
certbot certonly --nginx -d api.syndicate-poker.ru

# Certbot спросит:
# 1. Email для уведомлений - введите ваш email
# 2. Согласиться с Terms of Service - введите Y
# 3. Получать новости - введите N или Y (на выбор)
```

### Шаг 3.9: Обновление конфигурации с SSL

```bash
# Редактируем конфигурацию
nano /etc/nginx/sites-available/api.syndicate-poker.ru
```

Замените содержимое на **ФИНАЛЬНУЮ конфигурацию с SSL**:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.syndicate-poker.ru;

    # Редирект на HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.syndicate-poker.ru;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/api.syndicate-poker.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.syndicate-poker.ru/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/api.syndicate-poker.ru/chain.pem;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Логи
    access_log /var/log/nginx/supabase-proxy-access.log;
    error_log /var/log/nginx/supabase-proxy-error.log;

    # Таймауты
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;

    # Размер файлов
    client_max_body_size 50M;

    # Проксирование к Supabase
    location / {
        proxy_pass https://mokhssmnorrhohrowxvu.supabase.co;
        
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'authorization, x-client-info, apikey, content-type, range, x-supabase-api-version' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Range, X-Supabase-Api-Version' always;
        add_header 'Access-Control-Max-Age' '86400' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }

        # WebSocket для Realtime
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_redirect off;
    }
}
```

**Сохранение файла в nano:**
- Нажмите `Ctrl + X`
- Нажмите `Y` (Yes)
- Нажмите `Enter`

```bash
# Проверяем конфигурацию
nginx -t

# Перезапускаем Nginx
systemctl restart nginx

# Проверяем статус
systemctl status nginx
```

### Шаг 3.10: Настройка Firewall

```bash
# Установка UFW
apt install ufw -y

# Разрешаем необходимые порты
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Включаем firewall
ufw enable

# Подтвердите: y

# Проверяем статус
ufw status
```

### Шаг 3.11: Настройка автообновления SSL

```bash
# Тестируем автообновление
certbot renew --dry-run

# Если всё ОК, выведется:
# Congratulations, all simulated renewals succeeded
```

---

## ЧАСТЬ 4: ПРОВЕРКА РАБОТЫ

### Шаг 4.1: Проверка прокси-сервера

```bash
# На сервере выполните:
curl -I https://api.syndicate-poker.ru

# Должно вернуть: HTTP/2 200 или 308
```

### Шаг 4.2: Проверка логов

```bash
# Смотрим последние ошибки
tail -50 /var/log/nginx/supabase-proxy-error.log

# Смотрим последние запросы
tail -50 /var/log/nginx/supabase-proxy-access.log

# Следим за логами в реальном времени
tail -f /var/log/nginx/supabase-proxy-access.log
# Ctrl+C для выхода
```

### Шаг 4.3: Проверка приложения

1. Откройте ваше приложение: https://syndicate-poker.ru
2. Откройте DevTools (F12)
3. Перейдите на вкладку Network
4. Обновите страницу
5. Проверьте, что запросы идут на `api.syndicate-poker.ru`
6. Проверьте, что данные загружаются

### Шаг 4.4: Тестирование Supabase API

```bash
# С вашего компьютера:
curl https://api.syndicate-poker.ru/rest/v1/

# Должно вернуть ошибку 401 (это нормально, API требует ключ)
```

---

## ЧАСТЬ 5: ФИНАЛЬНАЯ НАСТРОЙКА SUPABASE

### Шаг 5.1: Подтверждение кастомного домена

1. Вернитесь в Supabase Dashboard
2. Перейдите в **Settings** → **API** → **Custom Domains**
3. Найдите `api.syndicate-poker.ru`
4. Нажмите **Verify** или подождите автоматической верификации
5. Статус должен измениться на **Active** (может занять до 10 минут)

---

## 🎉 ГОТОВО!

Теперь ваше приложение использует прокси-сервер для доступа к Supabase API через кастомный домен.

### Что происходит:

```
Клиент (браузер)
    ↓
https://api.syndicate-poker.ru
    ↓
Nginx на VPS (89.104.74.121)
    ↓
https://mokhssmnorrhohrowxvu.supabase.co
    ↓
Supabase API
```

---

## 📊 МОНИТОРИНГ И ОБСЛУЖИВАНИЕ

### Проверка статуса сервисов

```bash
# Статус Nginx
systemctl status nginx

# Перезапуск Nginx
systemctl restart nginx

# Проверка конфигурации
nginx -t

# Просмотр логов в реальном времени
tail -f /var/log/nginx/supabase-proxy-error.log
```

### Обновление SSL сертификата (автоматически)

```bash
# Сертификат обновляется автоматически каждые 60 дней
# Для принудительного обновления:
certbot renew

# Для теста:
certbot renew --dry-run
```

### Обновление системы

```bash
# Регулярно обновляйте систему (раз в неделю):
apt update && apt upgrade -y
```

---

## 🚨 РЕШЕНИЕ ПРОБЛЕМ

### Ошибка 502 Bad Gateway

```bash
# 1. Проверьте доступность Supabase
curl -I https://mokhssmnorrhohrowxvu.supabase.co

# 2. Проверьте логи
tail -100 /var/log/nginx/supabase-proxy-error.log

# 3. Перезапустите Nginx
systemctl restart nginx
```

### Ошибка SSL

```bash
# Переустановите сертификат
systemctl stop nginx
certbot delete --cert-name api.syndicate-poker.ru
certbot certonly --standalone -d api.syndicate-poker.ru
systemctl start nginx
```

### DNS не обновился

```bash
# Проверьте DNS
nslookup api.syndicate-poker.ru

# Если возвращает старый IP, подождите до 24 часов
# или обратитесь в поддержку reg.ru
```

### Приложение не работает

```bash
# 1. Проверьте Nginx
systemctl status nginx

# 2. Проверьте firewall
ufw status

# 3. Проверьте логи
tail -100 /var/log/nginx/supabase-proxy-error.log

# 4. Проверьте конфигурацию
nginx -t
```

---

## 🔒 БЕЗОПАСНОСТЬ

### Обязательные шаги:

1. **Смените пароль root**
2. **Создайте нового пользователя:**
   ```bash
   adduser admin
   usermod -aG sudo admin
   ```
3. **Настройте SSH ключи** вместо паролей
4. **Установите fail2ban:**
   ```bash
   apt install fail2ban -y
   systemctl enable fail2ban
   ```

---

## 📞 ПОДДЕРЖКА

### Контакты хостинг-провайдера:

- **DNS панель:** https://dnsadmin.hosting.reg.ru/manager/ispmgr
- **Логин DNS:** ce113322055
- **Пароль DNS:** omt5_y9DEq!p0Sl

### Полезные команды для логов:

```bash
# Nginx access logs
tail -f /var/log/nginx/supabase-proxy-access.log

# Nginx error logs
tail -f /var/log/nginx/supabase-proxy-error.log

# Системные логи Nginx
journalctl -u nginx -f

# SSL logs
journalctl -u certbot -f
```

---

## ✅ ЧЕКЛИСТ ПРОВЕРКИ

- [ ] DNS A-запись создана (api → 89.104.74.121)
- [ ] Nginx установлен и запущен
- [ ] SSL сертификат получен
- [ ] Firewall настроен
- [ ] Прокси работает (curl test)
- [ ] Приложение загружает данные
- [ ] Кастомный домен Active в Supabase
- [ ] Пароль root изменен
- [ ] Автообновление SSL работает
