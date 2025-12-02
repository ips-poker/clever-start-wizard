# Настройка кастомного домена api.syndicate-poker.ru для Supabase

## ✅ Финальная конфигурация (ПРОВЕРЕНО И РАБОТАЕТ)

Дата настройки: 2 декабря 2025  
Статус: **Активен и работает на LTE**

---

## 1. DNS настройки в reg.ru (ISPManager)

### NS-серверы домена syndicate-poker.ru
```
ns1.hosting.reg.ru
ns2.hosting.reg.ru
```

### DNS записи для api.syndicate-poker.ru

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| CNAME | api | mokhssmnorrhohrowxvu.supabase.co | 3600 |
| TXT | _acme-challenge.api | 9ZxLICmfYRw4ZQjYosIY3O-JLr2DxikECsrAxMVQqEQ | 3600 |

**Важно:**
- CNAME запись указывает на прямой домен Supabase проекта
- TXT запись `_acme-challenge.api` используется для SSL сертификата (Let's Encrypt)
- TTL 3600 секунд (1 час)

---

## 2. Настройки в Supabase Dashboard

### Custom Domain в Supabase
1. Проект: `mokhssmnorrhohrowxvu`
2. Settings → Custom Domains
3. Добавлен домен: `api.syndicate-poker.ru`
4. Статус: **Active** ✅
5. SSL сертификат: Автоматически выдан Supabase (Let's Encrypt)

---

## 3. Изменения в коде приложения

### src/integrations/supabase/client.ts
```typescript
// Используем кастомный домен для Supabase API
const SUPABASE_URL = "https://api.syndicate-poker.ru";

const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc";
```

### .env
```env
VITE_SUPABASE_PROJECT_ID="mokhssmnorrhohrowxvu"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc"
VITE_SUPABASE_URL="https://api.syndicate-poker.ru"
```

---

## 4. Проверка работоспособности

### Команды для проверки DNS
```bash
# Проверка CNAME записи
dig api.syndicate-poker.ru CNAME +short
# Ожидаемый результат: mokhssmnorrhohrowxvu.supabase.co

# Проверка TXT записи для SSL
dig _acme-challenge.api.syndicate-poker.ru TXT +short
# Ожидаемый результат: "9ZxLICmfYRw4ZQjYosIY3O-JLr2DxikECsrAxMVQqEQ"

# Проверка NS серверов основного домена
dig syndicate-poker.ru NS +short
# Ожидаемый результат:
# ns1.hosting.reg.ru
# ns2.hosting.reg.ru
```

### Проверка API
```bash
# Проверка доступности Supabase API через кастомный домен
curl -I https://api.syndicate-poker.ru/rest/v1/

# Должен вернуть 200 OK с заголовками Supabase
```

### Проверка в браузере
1. Открыть DevTools → Network
2. Все запросы к Supabase должны идти через `api.syndicate-poker.ru`
3. SSL сертификат должен быть валидным (замок в адресной строке)

---

## 5. Что было исправлено

### Проблема 1: Конфликт с Cloudflare
**Решение:** Удалили домен из Cloudflare, вернули NS-серверы на reg.ru

### Проблема 2: DNS записи не распространялись
**Решение:** Убедились что используются NS-серверы reg.ru (ns1/ns2.hosting.reg.ru)

### Проблема 3: Приложение использовало старый URL
**Решение:** Обновили SUPABASE_URL в коде на кастомный домен

---

## 6. Преимущества кастомного домена

✅ **Брендинг:** API работает через ваш домен syndicate-poker.ru  
✅ **Безопасность:** Скрыт прямой URL проекта Supabase  
✅ **Надежность:** Можно мигрировать между Supabase проектами без изменения кода  
✅ **SSL:** Автоматические сертификаты от Supabase (Let's Encrypt)  
✅ **Производительность:** Работает на LTE и других сетях  

---

## 7. Мониторинг и обслуживание

### Автоматическое обновление SSL
- Supabase автоматически обновляет SSL сертификаты
- Проверять статус можно в Supabase Dashboard → Settings → Custom Domains

### Проверка работоспособности
```bash
# Добавить в cron для мониторинга
curl -f https://api.syndicate-poker.ru/rest/v1/ || echo "API недоступен!"
```

### Если домен перестал работать
1. Проверить DNS записи (команды выше)
2. Проверить статус в Supabase Dashboard
3. Проверить NS-серверы домена
4. При необходимости переактивировать домен в Supabase

---

## 8. Контакты и ссылки

### Supabase Dashboard
- Проект: https://supabase.com/dashboard/project/mokhssmnorrhohrowxvu
- Custom Domains: https://supabase.com/dashboard/project/mokhssmnorrhohrowxvu/settings/general

### reg.ru
- DNS управление: ISPManager → Доменные имена → syndicate-poker.ru → DNS

### Документация
- Supabase Custom Domains: https://supabase.com/docs/guides/platform/custom-domains
- Let's Encrypt (SSL): https://letsencrypt.org/

---

## 9. Быстрая диагностика проблем

| Проблема | Возможная причина | Решение |
|----------|-------------------|---------|
| 502 Bad Gateway | DNS не распространились | Подождать 1-2 часа, проверить dig команды |
| SSL ошибка | Проблема с сертификатом | Проверить TXT запись _acme-challenge |
| 404 Not Found | Неверный путь API | Проверить SUPABASE_URL в коде |
| CORS ошибка | Неправильный домен | Добавить api.syndicate-poker.ru в Supabase CORS |
| Долгая загрузка | Проблема с DNS | Использовать публичные DNS (8.8.8.8) |

---

## 10. История изменений

**2 декабря 2025**
- ✅ Настроены DNS записи в reg.ru
- ✅ Активирован домен в Supabase
- ✅ Обновлен код приложения
- ✅ Протестирована работа на LTE
- ✅ Создана документация

---

## ⚠️ ВАЖНО: НЕ УДАЛЯТЬ

Этот файл содержит критическую информацию о настройке инфраструктуры.  
При миграции или восстановлении проекта используйте эти настройки.

**Проект ID Supabase:** mokhssmnorrhohrowxvu  
**Кастомный домен:** api.syndicate-poker.ru  
**Статус:** Активен ✅
