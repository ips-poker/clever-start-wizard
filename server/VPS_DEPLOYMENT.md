# 🚀 Полное руководство по деплою Poker Server v3 на VPS

## Быстрый деплой (обновление существующего сервера)

```bash
# 1. Подключение к серверу
ssh root@89.111.155.224

# 2. Переход в директорию проекта
cd /var/www/poker-server

# 3. Остановка сервера (graceful)
pm2 stop poker-server

# 4. Получение обновлений
git pull origin main

# 5. Установка зависимостей (если изменились)
npm install

# 6. Сборка TypeScript
npm run build

# 7. Запуск сервера
pm2 start poker-server

# 8. Проверка статуса
pm2 status

# 9. Просмотр логов
pm2 logs poker-server --lines 100
```

---

## Первичная установка (новый сервер)

### 1. Подготовка сервера

```bash
# Подключение
ssh root@YOUR_SERVER_IP

# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверка версий
node --version  # Должно быть v20.x
npm --version

# Установка PM2
npm install -g pm2

# Установка nginx
apt install -y nginx

# Установка git
apt install -y git
```

### 2. Клонирование проекта

```bash
# Создание директории
mkdir -p /var/www
cd /var/www

# Клонирование (замените на ваш репозиторий)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git poker-server
cd poker-server/server

# Установка зависимостей
npm install

# Сборка
npm run build
```

### 3. Настройка окружения

```bash
# Создание .env файла
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Опционально: Webhooks для алертов
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Опционально: Redis (для горизонтального масштабирования)
# REDIS_URL=redis://localhost:6379
EOF

# Защита файла
chmod 600 .env
```

### 4. Настройка Nginx

```bash
# Создание конфигурации
cat > /etc/nginx/sites-available/poker << 'EOF'
upstream poker_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # Редирект на HTTPS (после настройки SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://poker_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        
        # Buffer settings
        proxy_buffering off;
        proxy_buffer_size 16k;
        proxy_busy_buffers_size 24k;
        proxy_buffers 64 4k;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://poker_backend/health;
        access_log off;
    }

    # Metrics endpoint (ограничить доступ!)
    location /metrics {
        proxy_pass http://poker_backend/metrics;
        # allow 10.0.0.0/8;  # Разрешить только внутреннюю сеть
        # deny all;
    }
}
EOF

# Активация конфигурации
ln -sf /etc/nginx/sites-available/poker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка и перезапуск
nginx -t
systemctl reload nginx
```

### 5. SSL сертификат (Let's Encrypt)

```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение сертификата
certbot --nginx -d your-domain.com

# Автоматическое обновление
certbot renew --dry-run
```

### 6. Запуск с PM2

```bash
cd /var/www/poker-server/server

# Запуск приложения
pm2 start ecosystem.config.cjs --env production

# Сохранение конфигурации PM2
pm2 save

# Автозапуск при перезагрузке сервера
pm2 startup
# Выполните команду, которую выведет pm2 startup
```

### 7. Настройка файрвола

```bash
# Включение UFW
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# Проверка статуса
ufw status
```

---

## Полезные команды

### PM2 управление

```bash
# Статус всех процессов
pm2 status

# Логи в реальном времени
pm2 logs poker-server

# Последние 100 строк логов
pm2 logs poker-server --lines 100

# Только ошибки
pm2 logs poker-server --err

# Перезапуск (с сохранением соединений)
pm2 reload poker-server

# Жесткий перезапуск
pm2 restart poker-server

# Остановка
pm2 stop poker-server

# Мониторинг ресурсов
pm2 monit

# Информация о процессе
pm2 describe poker-server

# Очистка логов
pm2 flush
```

### Проверка состояния

```bash
# Health check
curl http://localhost:3001/health

# Детальный health check
curl http://localhost:3001/health | jq

# Prometheus метрики
curl http://localhost:3001/metrics

# Статистика API
curl http://localhost:3001/api/stats

# Проверка WebSocket
wscat -c ws://localhost:3001/ws/poker
```

### Отладка

```bash
# Проверка портов
netstat -tlnp | grep 3001
ss -tlnp | grep 3001

# Проверка процессов Node
ps aux | grep node

# Использование памяти
free -h

# Использование диска
df -h

# Логи nginx
tail -f /var/nginx/access.log
tail -f /var/nginx/error.log

# Системные логи
journalctl -u nginx -f
```

### Обновление кода

```bash
# Полный цикл обновления
cd /var/www/poker-server
git pull origin main
cd server
npm install
npm run build
pm2 reload poker-server
pm2 logs poker-server --lines 50
```

---

## Мониторинг и Алерты

### Настройка Slack алертов

```bash
# Добавьте в .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

### Настройка Discord алертов

```bash
# Добавьте в .env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXX
```

### Grafana Dashboard (опционально)

```bash
# Установка Prometheus
apt install prometheus -y

# Добавьте scrape config в /etc/prometheus/prometheus.yml:
scrape_configs:
  - job_name: 'poker-server'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

# Установка Grafana
apt install grafana -y
systemctl enable grafana-server
systemctl start grafana-server

# Grafana доступна на порту 3000
# http://YOUR_IP:3000 (admin/admin)
```

---

## Производительность (100-300 столов)

### Рекомендуемые настройки

```bash
# Увеличение лимитов файлов
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
EOF

# Оптимизация сети
cat >> /etc/sysctl.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.core.netdev_max_backlog = 65535
EOF

# Применение
sysctl -p
```

### Рекомендуемые ресурсы VPS

| Нагрузка | CPU | RAM | Диск |
|----------|-----|-----|------|
| До 50 столов | 2 vCPU | 4 GB | 40 GB SSD |
| 50-150 столов | 4 vCPU | 8 GB | 80 GB SSD |
| 150-300 столов | 8 vCPU | 16 GB | 160 GB SSD |

---

## Troubleshooting

### Сервер не запускается

```bash
# Проверьте логи
pm2 logs poker-server --lines 200

# Проверьте .env
cat /var/www/poker-server/server/.env

# Проверьте права
ls -la /var/www/poker-server/server/

# Запустите напрямую для отладки
cd /var/www/poker-server/server
node dist/index.js
```

### WebSocket не подключается

```bash
# Проверьте nginx
nginx -t
systemctl status nginx

# Проверьте порт
curl -I http://localhost:3001/health

# Проверьте файрвол
ufw status
```

### Высокое использование памяти

```bash
# Проверьте утечки
pm2 monit

# Перезапуск с очисткой
pm2 restart poker-server --update-env

# Проверьте GC
node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"
```

### База данных недоступна

```bash
# Проверьте CircuitBreaker статус
curl http://localhost:3001/health | jq '.services.database'

# Проверьте подключение к Supabase
curl -H "apikey: YOUR_KEY" https://YOUR_PROJECT.supabase.co/rest/v1/
```

---

## Контакты поддержки

При возникновении проблем:
1. Проверьте логи: `pm2 logs poker-server`
2. Проверьте метрики: `curl http://localhost:3001/metrics`
3. Проверьте health: `curl http://localhost:3001/health`
