# Настройка Cloudflare Tunnel для API (Обход блокировок LTE)

Это решение использует Cloudflare Tunnel (cloudflared) для обхода блокировок Cloudflare Workers на LTE сетях. Туннель работает через протокол QUIC (UDP), который часто обходит блокировки.

## Преимущества Cloudflare Tunnel

- ✅ Работает через QUIC (UDP) вместо HTTP/HTTPS
- ✅ Обходит многие блокировки на уровне провайдера
- ✅ Бесплатно для любого трафика
- ✅ Автоматическое SSL шифрование
- ✅ Защита от DDoS атак

## Что нужно

1. **Сервер/VPS** (можно использовать любой):
   - Timeweb, REG.RU, VDSina (от 200₽/мес)
   - Домашний компьютер (если есть статический IP)
   - Любой Linux сервер с постоянным подключением

2. **Доступ к терминалу сервера** (SSH)

## Шаг 1: Установка cloudflared на сервер

### Ubuntu/Debian:

```bash
# Скачать и установить cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Проверить установку
cloudflared --version
```

### CentOS/RHEL:

```bash
# Скачать и установить
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.rpm
sudo rpm -i cloudflared-linux-amd64.rpm

# Проверить установку
cloudflared --version
```

### Docker (альтернатива):

```bash
# Запустить как контейнер
docker pull cloudflare/cloudflared:latest
```

## Шаг 2: Авторизация cloudflared

```bash
# Авторизоваться в Cloudflare
cloudflared tunnel login
```

Это откроет браузер для авторизации. Выберите домен **syndicate-poker.ru**.

## Шаг 3: Создание туннеля

```bash
# Создать туннель с именем 'supabase-api-tunnel'
cloudflared tunnel create supabase-api-tunnel

# Запомнить ID туннеля из вывода команды
# Например: Created tunnel supabase-api-tunnel with id a09c9140-45fc-4cbe-9b2f-e5df95d37b46
```

## Шаг 4: Создание конфигурационного файла

Создайте файл `/root/.cloudflared/config.yml` (или `~/.cloudflared/config.yml`):

```bash
nano ~/.cloudflared/config.yml
```

Вставьте содержимое из файла `etc/cloudflared/config.yml` проекта, **заменив** следующие значения:

```yaml
tunnel: ВАШ_TUNNEL_ID  # ID из Шага 3
credentials-file: /root/.cloudflared/ВАШ_TUNNEL_ID.json

ingress:
  # API поддомен - прокси к Supabase для обхода блокировок
  - hostname: api.syndicate-poker.ru
    service: https://mokhssmnorrhohrowxvu.supabase.co
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      httpHostHeader: mokhssmnorrhohrowxvu.supabase.co
  
  # Главный фронтенд домен
  - hostname: syndicate-poker.ru
    service: https://a391e581-510e-4cfc-905a-60ff6b51b1e6.lovableproject.com
    originRequest:
      noTLSVerify: true
  
  # WWW редирект на основной домен
  - hostname: www.syndicate-poker.ru
    service: https://a391e581-510e-4cfc-905a-60ff6b51b1e6.lovableproject.com
    originRequest:
      noTLSVerify: true
  
  # Catch-all правило (обязательно)
  - service: http_status:404
```

## Шаг 5: Настройка DNS в Cloudflare

1. Зайдите в **Cloudflare Dashboard** → **DNS** → **Records**
2. Удалите существующую CNAME запись для `api` (если есть)
3. Создайте CNAME запись для туннеля:

```bash
# Создать DNS запись для api поддомена
cloudflared tunnel route dns supabase-api-tunnel api.syndicate-poker.ru
```

Или вручную в Cloudflare Dashboard:
- **Type**: CNAME
- **Name**: api
- **Target**: `ВАШ_TUNNEL_ID.cfargotunnel.com`
- **Proxy status**: 🟠 Proxied (оранжевое облако)

## Шаг 6: Запуск туннеля

### Тестовый запуск:

```bash
cloudflared tunnel run supabase-api-tunnel
```

Если все работает, вы увидите:
```
Connection established
Registered tunnel connection
```

### Запуск как системный сервис (автозапуск):

```bash
# Установить как сервис
sudo cloudflared service install

# Запустить сервис
sudo systemctl start cloudflared

# Включить автозапуск
sudo systemctl enable cloudflared

# Проверить статус
sudo systemctl status cloudflared
```

## Шаг 7: Проверка работы

### 1. Проверка REST API:

```bash
curl -i https://api.syndicate-poker.ru/rest/v1/ \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc"
```

Должен вернуться статус `200 OK`.

### 2. Проверка через сайт:

Откройте `https://syndicate-poker.ru/` на телефоне через LTE и проверьте в консоли (если возможно), что запросы идут к `api.syndicate-poker.ru`.

### 3. Проверка WebSocket:

Откройте Developer Tools → Network → WS и убедитесь, что WebSocket соединение устанавливается через `wss://api.syndicate-poker.ru/realtime/v1/websocket`.

## Мониторинг туннеля

### Просмотр логов:

```bash
# Логи системного сервиса
sudo journalctl -u cloudflared -f

# Или логи в реальном времени
sudo tail -f /var/log/cloudflared.log
```

### Метрики туннеля:

В Cloudflare Dashboard → **Traffic** → **Cloudflare Tunnel** можно посмотреть:
- Количество запросов
- Задержку (latency)
- Ошибки

## Возможные проблемы

### 1. "Failed to create tunnel"

**Причина**: Проблема с авторизацией

**Решение**:
```bash
cloudflared tunnel login
cloudflared tunnel list
```

### 2. "Connection refused"

**Причина**: Туннель не может подключиться к Supabase

**Решение**:
- Проверьте, что в config.yml правильно указан URL Supabase
- Убедитесь, что сервер имеет доступ к интернету
- Проверьте firewall правила

### 3. "DNS resolution failed"

**Причина**: DNS запись не создана или не распространилась

**Решение**:
```bash
# Проверить DNS
nslookup api.syndicate-poker.ru

# Пересоздать DNS запись
cloudflared tunnel route dns supabase-api-tunnel api.syndicate-poker.ru
```

### 4. Туннель работает, но сайт все равно не работает на LTE

**Причина**: Возможно DNS провайдер блокирует домен

**Решение**:
- Используйте альтернативные DNS: 1.1.1.1, 8.8.8.8
- На телефоне: Настройки → Wi-Fi → Изменить сеть → Дополнительно → DNS: 1.1.1.1

### 5. Высокая задержка (latency)

**Причина**: Географическое расположение сервера

**Решение**:
- Используйте VPS ближе к вашему региону
- Cloudflare автоматически маршрутизирует через ближайший дата-центр

## Стоимость

**Cloudflare Tunnel:**
- ✅ Бесплатно для любого объема трафика
- ✅ Нет ограничений по пропускной способности

**VPS/Сервер:**
- Timeweb: от 200₽/мес
- REG.RU: от 300₽/мес
- VDSina: от 150₽/мес
- Домашний ПК: бесплатно (но нужен статический IP)

## Откат назад (если не работает)

### Удалить туннель:

```bash
# Остановить сервис
sudo systemctl stop cloudflared
sudo systemctl disable cloudflared

# Удалить туннель
cloudflared tunnel delete supabase-api-tunnel
```

### Вернуться к Worker:

1. Удалите CNAME запись для `api.syndicate-poker.ru`
2. Добавьте обратно Custom Domain в Cloudflare Workers (как было раньше)
3. Сайт автоматически вернется к использованию Worker

## Дополнительная оптимизация

### 1. Кеширование ответов:

Добавьте в config.yml:

```yaml
originRequest:
  noTLSVerify: false
  connectTimeout: 30s
  httpHostHeader: mokhssmnorrhohrowxvu.supabase.co
  disableChunkedEncoding: false
  proxyType: http
```

### 2. Несколько туннелей для отказоустойчивости:

Запустите 2-3 экземпляра cloudflared на разных серверах с одним и тем же tunnel ID для автоматического failover.

### 3. Использование Argo Smart Routing:

В Cloudflare Dashboard → **Traffic** → **Argo Smart Routing** можно включить платную опцию (≈$5/мес) для ускорения соединения на 30%.

---

## Поддержка

Если возникли проблемы:
1. Проверьте логи: `sudo journalctl -u cloudflared -f`
2. Убедитесь, что DNS обновился: `nslookup api.syndicate-poker.ru`
3. Проверьте статус туннеля: `cloudflared tunnel info supabase-api-tunnel`
4. Проверьте Cloudflare Dashboard → Traffic → Cloudflare Tunnel

## Альтернативное решение: Nginx на VPS

Если Cloudflare Tunnel все равно не помогает, можно настроить простой Nginx reverse proxy на VPS в России:

```nginx
server {
    listen 443 ssl http2;
    server_name api.syndicate-poker.ru;

    ssl_certificate /etc/letsencrypt/live/api.syndicate-poker.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.syndicate-poker.ru/privkey.pem;

    location / {
        proxy_pass https://mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket поддержка
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Это надежнее, но требует отдельного VPS.