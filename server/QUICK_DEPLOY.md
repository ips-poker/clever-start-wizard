# 🎰 Quick Deploy to VPS 89.111.155.224

## Шаг 1: Подключение к серверу

```bash
ssh root@89.111.155.224
```

## Шаг 2: Клонирование и установка

```bash
# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx

# Установка PM2
npm install -g pm2

# Создание директории
mkdir -p /opt/poker-server
cd /opt/poker-server

# Копирование файлов (выполнить ЛОКАЛЬНО)
# scp -r server/* root@89.111.155.224:/opt/poker-server/
```

## Шаг 3: Установка на сервере

```bash
cd /opt/poker-server
npm install
npm run build
```

## Шаг 4: Настройка .env

```bash
nano /opt/poker-server/.env
```

```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://mokhssmnorrhohrowxvu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc
CORS_ORIGINS=https://syndikatet.lovableproject.com,http://localhost:8080
JWT_SECRET=your-random-secret-key
LOG_LEVEL=info
```

## Шаг 5: Настройка Nginx

```bash
nano /etc/nginx/sites-available/poker
```

```nginx
upstream poker_backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name 89.111.155.224;

    location / {
        proxy_pass http://poker_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/poker {
        proxy_pass http://poker_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/poker /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## Шаг 6: Запуск PM2

```bash
cd /opt/poker-server
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

## Шаг 7: Проверка

```bash
# Проверка статуса
pm2 status

# Проверка health
curl http://89.111.155.224/health

# Логи
pm2 logs poker-server
```

## Endpoints

| Endpoint | URL |
|----------|-----|
| Health | http://89.111.155.224/health |
| API | http://89.111.155.224/api/ |
| WebSocket | ws://89.111.155.224/ws/poker |

## Полезные команды

```bash
# Перезапуск
pm2 restart poker-server

# Логи в реальном времени
pm2 logs poker-server --lines 100

# Статистика
pm2 monit

# Обновление кода
cd /opt/poker-server
git pull  # или scp
npm install
npm run build
pm2 restart poker-server
```

## Firewall

```bash
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```
