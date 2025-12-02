# ✅ Рабочая конфигурация Nginx для api.syndicate-poker.ru

**Статус:** Протестировано и работает стабильно на LTE

## 🔧 Серверные настройки

- **IP сервера:** 89.104.74.121
- **Домен:** api.syndicate-poker.ru
- **DNS:** A-запись → 89.104.74.121
- **SSL:** Let's Encrypt (автообновление)
- **Backend:** https://mokhssmnorrhohrowxvu.supabase.co

## 📦 Быстрая установка

На сервере выполните:

```bash
bash nginx-install-commands.sh
```

Или вручную:

```bash
# 1. Скопируйте конфигурацию
sudo cp nginx-api.conf /etc/nginx/sites-available/api.syndicate-poker.ru

# 2. Активируйте
sudo ln -sf /etc/nginx/sites-available/api.syndicate-poker.ru /etc/nginx/sites-enabled/

# 3. Проверьте и перезапустите
sudo nginx -t && sudo systemctl restart nginx
```

## 🧪 Проверка работоспособности

```bash
# Статус nginx
systemctl status nginx

# Проверка API
curl -I https://api.syndicate-poker.ru

# Логи
tail -f /var/log/nginx/supabase-proxy-error.log
tail -f /var/log/nginx/supabase-proxy-access.log
```

## 🔐 SSL сертификат

Сертификат обновляется автоматически через certbot:

```bash
# Проверка автообновления
sudo certbot renew --dry-run

# Ручное обновление (если нужно)
sudo certbot renew
sudo systemctl reload nginx
```

## 💻 Настройки приложения

В `src/integrations/supabase/client.ts`:

```typescript
const SUPABASE_URL = "https://api.syndicate-poker.ru";
```

В `.env`:

```
VITE_SUPABASE_PROJECT_ID="mokhssmnorrhohrowxvu"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc"
VITE_SUPABASE_URL="https://mokhssmnorrhohrowxvu.supabase.co"
```

## 🚨 Восстановление при проблемах

### Если nginx не работает:

```bash
# 1. Проверьте конфигурацию
sudo nginx -t

# 2. Проверьте статус
sudo systemctl status nginx

# 3. Перезапустите
sudo systemctl restart nginx
```

### Если DNS не резолвится:

```bash
# Проверьте DNS
nslookup api.syndicate-poker.ru
dig api.syndicate-poker.ru

# Должен быть A-запись: 89.104.74.121
```

### Если SSL не работает:

```bash
# Проверьте сертификаты
sudo certbot certificates

# Переполучите сертификат
sudo certbot certonly --nginx -d api.syndicate-poker.ru
sudo systemctl reload nginx
```

## 📋 Архитектура

```
Пользователь (LTE)
    ↓
api.syndicate-poker.ru (89.104.74.121)
    ↓
Nginx (SSL + CORS)
    ↓
mokhssmnorrhohrowxvu.supabase.co
```

**Преимущества:**
- ✅ Работает на LTE (обход блокировок оператора)
- ✅ Собственный SSL сертификат
- ✅ Контроль над CORS
- ✅ Единая точка входа

## 🔄 Обновление конфигурации

Если нужно изменить настройки:

1. Отредактируйте `nginx-api.conf`
2. Скопируйте на сервер: `scp nginx-api.conf root@89.104.74.121:/etc/nginx/sites-available/api.syndicate-poker.ru`
3. Перезапустите nginx: `sudo systemctl reload nginx`

## 📞 Важные команды

```bash
# Подключение к серверу
ssh root@89.104.74.121

# Просмотр конфигурации
cat /etc/nginx/sites-available/api.syndicate-poker.ru

# Редактирование конфигурации
nano /etc/nginx/sites-available/api.syndicate-poker.ru

# Проверка портов
netstat -tulpn | grep nginx

# Проверка firewall
ufw status
```

---

**Последнее обновление:** 2025-12-02  
**Статус:** ✅ Работает стабильно
