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

В браузере для переключения режима:

```javascript
// Включить прокси (для LTE/блокировок)
localStorage.setItem('SUPABASE_MODE', 'proxy')
location.reload()

// Вернуться на прямой Supabase
localStorage.setItem('SUPABASE_MODE', 'direct')
location.reload()
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

### Если ошибка 503:

```bash
# Проверить логи
tail -50 /var/log/nginx/supabase-proxy-error.log

# Проверить DNS резолвинг Supabase
nslookup mokhssmnorrhohrowxvu.supabase.co

# Тест прямого подключения к Supabase
curl -v https://mokhssmnorrhohrowxvu.supabase.co/rest/v1/
```

## 📋 Архитектура

```
Пользователь (LTE)
    ↓
api.syndicate-poker.ru (89.104.74.121)
    ↓
Nginx (SSL + CORS + DNS Resolver)
    ↓
mokhssmnorrhohrowxvu.supabase.co
```

**Преимущества:**
- ✅ Работает на LTE (обход блокировок оператора)
- ✅ Собственный SSL сертификат
- ✅ Контроль над CORS
- ✅ Единая точка входа
- ✅ DNS resolver через Google (8.8.8.8) для стабильности
- ✅ Увеличенные буферы для больших запросов

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

## 🔧 Ключевые настройки nginx

### Буферы для больших заголовков
```nginx
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
large_client_header_buffers 4 64k;
```

### DNS Resolver
```nginx
resolver 8.8.8.8 8.8.4.4 1.1.1.1 valid=300s ipv6=off;
resolver_timeout 10s;
```

---

**Последнее обновление:** 2025-12-26  
**Статус:** ✅ Работает стабильно (исправлены буферы и DNS)
