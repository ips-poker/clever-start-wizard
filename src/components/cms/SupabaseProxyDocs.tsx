import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Server, Shield, Zap, Database, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const SupabaseProxyDocs = () => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  };

  const baseConfig = `# Базовая конфигурация nginx для прокси Supabase
# /etc/nginx/sites-available/api.epc-poker.ru

upstream supabase {
    server mokhssmnorrhohrowxvu.supabase.co:443;
    keepalive 32;
}

# Ограничение запросов
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    listen 80;
    listen [::]:80;
    server_name api.epc-poker.ru;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.epc-poker.ru;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/api.epc-poker.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.epc-poker.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Размеры буферов и таймауты
    client_max_body_size 100M;
    client_body_buffer_size 128k;
    proxy_connect_timeout 90;
    proxy_send_timeout 90;
    proxy_read_timeout 90;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    # Применяем ограничения
    limit_req zone=api_limit burst=200 nodelay;
    limit_conn addr 50;

    # Логирование
    access_log /var/log/nginx/api.epc-poker.ru.access.log;
    error_log /var/log/nginx/api.epc-poker.ru.error.log;

    # CORS headers для всех запросов
    add_header 'Access-Control-Allow-Origin' 'https://epc-poker.ru' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'authorization, x-client-info, apikey, content-type, x-amz-user-agent, x-amz-date, x-amz-content-sha256' always;
    add_header 'Access-Control-Max-Age' '3600' always;
    add_header 'Access-Control-Expose-Headers' 'content-length, content-range' always;

    # Обработка OPTIONS запросов (preflight)
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://epc-poker.ru' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'authorization, x-client-info, apikey, content-type, x-amz-user-agent, x-amz-date, x-amz-content-sha256' always;
        add_header 'Access-Control-Max-Age' '3600' always;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' '0';
        return 204;
    }

    # REST API (PostgREST)
    location /rest/v1/ {
        proxy_pass https://supabase/rest/v1/;
        proxy_ssl_server_name on;
        proxy_ssl_name mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
    }

    # Authentication
    location /auth/v1/ {
        proxy_pass https://supabase/auth/v1/;
        proxy_ssl_server_name on;
        proxy_ssl_name mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
    }

    # Storage
    location /storage/v1/ {
        proxy_pass https://supabase/storage/v1/;
        proxy_ssl_server_name on;
        proxy_ssl_name mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
        
        # Дополнительные настройки для больших файлов
        client_max_body_size 100M;
        proxy_request_buffering off;
    }

    # Realtime (WebSocket)
    location /realtime/v1/ {
        proxy_pass https://supabase/realtime/v1/;
        proxy_ssl_server_name on;
        proxy_ssl_name mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket настройки
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        keepalive_timeout 86400;
    }

    # Edge Functions
    location /functions/v1/ {
        proxy_pass https://supabase/functions/v1/;
        proxy_ssl_server_name on;
        proxy_ssl_name mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header Host mokhssmnorrhohrowxvu.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
        proxy_read_timeout 300;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}`;

  const advancedConfig = `# Расширенная конфигурация с кэшированием и безопасностью

# Зона кэширования
proxy_cache_path /var/cache/nginx/supabase levels=1:2 keys_zone=supabase_cache:10m max_size=1g inactive=60m use_temp_path=off;

# Дополнительные security headers
map $sent_http_content_type $security_headers {
    default "nosniff";
}

server {
    # ... (базовая конфигурация из предыдущего примера) ...

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options $security_headers always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Кэширование статических ресурсов
    location ~* \\\\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        proxy_pass https://supabase;
        proxy_cache supabase_cache;
        proxy_cache_valid 200 304 12h;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        add_header X-Cache-Status $upstream_cache_status;
        expires 12h;
    }

    # Блокировка подозрительных User-Agent
    if ($http_user_agent ~* (bot|crawler|spider|scraper)) {
        return 403;
    }

    # Блокировка некоторых методов
    if ($request_method !~ ^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$) {
        return 405;
    }

    # IP whitelist для административных операций (опционально)
    location /auth/v1/admin/ {
        allow 192.168.1.0/24;  # Разрешить локальную сеть
        allow 10.0.0.0/8;      # Разрешить внутреннюю сеть
        deny all;
        
        proxy_pass https://supabase/auth/v1/admin/;
        # ... остальные proxy настройки ...
    }
}`;

  const monitoringConfig = `# Конфигурация мониторинга и метрик

# Логирование в JSON формате
log_format json_combined escape=json
  '{'
    '"time_local":"$time_local",'
    '"remote_addr":"$remote_addr",'
    '"remote_user":"$remote_user",'
    '"request":"$request",'
    '"status": "$status",'
    '"body_bytes_sent":"$body_bytes_sent",'
    '"request_time":"$request_time",'
    '"http_referrer":"$http_referer",'
    '"http_user_agent":"$http_user_agent",'
    '"upstream_response_time":"$upstream_response_time",'
    '"upstream_addr":"$upstream_addr"'
  '}';

server {
    # ... базовая конфигурация ...

    # JSON логи для анализа
    access_log /var/log/nginx/api.epc-poker.ru.json.log json_combined;

    # Метрики для Prometheus (требует nginx-module-vts)
    location /metrics {
        allow 127.0.0.1;  # Только localhost
        deny all;
        vhost_traffic_status_display;
        vhost_traffic_status_display_format json;
    }

    # Статус nginx
    location /nginx_status {
        allow 127.0.0.1;
        deny all;
        stub_status;
    }
}`;

  const dockerConfig = `# docker-compose.yml для быстрого деплоя nginx

version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./sites-available:/etc/nginx/sites-available:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
      - nginx_logs:/var/log/nginx
    restart: unless-stopped
    networks:
      - proxy_network

  certbot:
    image: certbot/certbot
    volumes:
      - ./ssl:/etc/letsencrypt
      - ./certbot-webroot:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait; done;'"
    networks:
      - proxy_network

volumes:
  nginx_cache:
  nginx_logs:

networks:
  proxy_network:
    driver: bridge`;

  const troubleshootingGuide = [
    {
      problem: "CORS ошибки при авторизации",
      solution: "Убедитесь что OPTIONS запросы возвращают правильные заголовки и код 204. Проверьте что заголовки добавлены с флагом 'always'.",
      command: "curl -I -X OPTIONS https://api.epc-poker.ru/auth/v1/token"
    },
    {
      problem: "Realtime подключения падают",
      solution: "Проверьте настройки WebSocket: Upgrade и Connection headers, увеличьте таймауты до 86400 секунд.",
      command: "tail -f /var/log/nginx/api.epc-poker.ru.error.log"
    },
    {
      problem: "Большие файлы не загружаются",
      solution: "Увеличьте client_max_body_size и добавьте proxy_request_buffering off для /storage/v1/",
      command: "nginx -t && systemctl reload nginx"
    },
    {
      problem: "502 Bad Gateway",
      solution: "Проверьте что upstream сервер доступен, DNS резолвится, и SSL сертификаты валидны.",
      command: "curl -v https://mokhssmnorrhohrowxvu.supabase.co"
    }
  ];

  const setupSteps = [
    "Установить nginx: apt-get install nginx",
    "Создать конфигурационный файл: /etc/nginx/sites-available/api.epc-poker.ru",
    "Создать символическую ссылку: ln -s /etc/nginx/sites-available/api.epc-poker.ru /etc/nginx/sites-enabled/",
    "Получить SSL сертификат: certbot --nginx -d api.epc-poker.ru",
    "Проверить конфигурацию: nginx -t",
    "Перезапустить nginx: systemctl reload nginx",
    "Проверить логи: tail -f /var/log/nginx/api.epc-poker.ru.error.log"
  ];

  return (
    <div className="space-y-6">
      <Card className="border-brutal bg-brutal-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-brutal-text">
            <Server className="w-6 h-6" />
            Документация по настройке Nginx прокси для Supabase
          </CardTitle>
          <CardDescription>
            Полное руководство по настройке прокси-сервера для работы с Supabase API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Важно</AlertTitle>
            <AlertDescription>
              Эта конфигурация предназначена для production окружения. Убедитесь, что у вас есть SSL сертификаты и правильно настроен DNS.
            </AlertDescription>
          </Alert>

          {/* Быстрый старт */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Быстрый старт
            </h3>
            <div className="space-y-2">
              {setupSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded border-brutal">
                  <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                  <code className="text-sm flex-1">{step}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Конфигурации */}
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Базовая</TabsTrigger>
              <TabsTrigger value="advanced">Расширенная</TabsTrigger>
              <TabsTrigger value="monitoring">Мониторинг</TabsTrigger>
              <TabsTrigger value="docker">Docker</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Базовая конфигурация</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(baseConfig, "Конфигурация")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Копировать
                </Button>
              </div>
              <pre className="bg-black/90 text-green-400 p-4 rounded border-brutal overflow-x-auto text-xs font-mono">
                {baseConfig}
              </pre>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Расширенная конфигурация</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(advancedConfig, "Конфигурация")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Копировать
                </Button>
              </div>
              <pre className="bg-black/90 text-green-400 p-4 rounded border-brutal overflow-x-auto text-xs font-mono">
                {advancedConfig}
              </pre>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Мониторинг и метрики</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(monitoringConfig, "Конфигурация")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Копировать
                </Button>
              </div>
              <pre className="bg-black/90 text-green-400 p-4 rounded border-brutal overflow-x-auto text-xs font-mono">
                {monitoringConfig}
              </pre>
            </TabsContent>

            <TabsContent value="docker" className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Docker Compose</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(dockerConfig, "Docker конфигурация")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Копировать
                </Button>
              </div>
              <pre className="bg-black/90 text-green-400 p-4 rounded border-brutal overflow-x-auto text-xs font-mono">
                {dockerConfig}
              </pre>
            </TabsContent>
          </Tabs>

          {/* Устранение неполадок */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Устранение неполадок
            </h3>
            <div className="space-y-3">
              {troubleshootingGuide.map((item, index) => (
                <Card key={index} className="border-brutal">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      {item.problem}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{item.solution}</p>
                    <div className="bg-muted p-2 rounded flex items-center justify-between">
                      <code className="text-xs">{item.command}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(item.command, "Команда")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Ключевые моменты */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Ключевые моменты конфигурации</AlertTitle>
            <AlertDescription className="space-y-2">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>CORS заголовки с флагом 'always' для работы с ошибками</li>
                <li>Обязательная обработка OPTIONS запросов для preflight</li>
                <li>WebSocket upgrade headers для Realtime подключений</li>
                <li>Увеличенные таймауты (86400s) для длительных соединений</li>
                <li>proxy_request_buffering off для загрузки больших файлов</li>
                <li>SSL сертификаты для безопасного соединения</li>
                <li>Правильный Host header для Supabase</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Проверка конфигурации */}
          <Card className="border-brutal bg-brutal-darker">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                Проверка работоспособности
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                После применения конфигурации проверьте работу всех эндпоинтов:
              </p>
              <div className="space-y-2">
                <code className="block text-xs bg-black/20 p-2 rounded">
                  curl -I https://api.epc-poker.ru/rest/v1/
                </code>
                <code className="block text-xs bg-black/20 p-2 rounded">
                  curl -I https://api.epc-poker.ru/auth/v1/health
                </code>
                <code className="block text-xs bg-black/20 p-2 rounded">
                  curl -I https://api.epc-poker.ru/storage/v1/
                </code>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
