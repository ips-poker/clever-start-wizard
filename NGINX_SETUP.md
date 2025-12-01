# Инструкция по настройке Nginx прокси для Supabase API

## Информация о сервере

- **IP адрес:** 89.104.74.121
- **ОС:** Ubuntu 24.04 LTS
- **Домен API:** api.syndicate-poker.ru
- **Целевой Supabase:** mokhssmnorrhohrowxvu.supabase.co

## Шаг 1: Подключение к серверу

```bash
ssh root@89.104.74.121
# Пароль: MpllODphydCZYstt
```

**ВАЖНО:** После первого входа смените пароль:
```bash
passwd
```

## Шаг 2: Установка Nginx и Certbot

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Nginx
apt install nginx -y

# Установка Certbot для Let's Encrypt
apt install certbot python3-certbot-nginx -y

# Проверка статуса Nginx
systemctl status nginx
```

## Шаг 3: Настройка DNS

В панели управления DNS (https://dnsadmin.hosting.reg.ru/manager/ispmgr):

### УДАЛИТЬ существующую CNAME запись:
- ~~CNAME: api → mokhssmnorrhohrowxvu.supabase.co~~

### СОЗДАТЬ A-запись:
- **Тип:** A
- **Имя:** api
- **Значение:** 89.104.74.121
- **TTL:** 300 (или минимальный)

### Оставить TXT-запись для SSL:
- **Тип:** TXT
- **Имя:** _acme-challenge
- **Значение:** (как есть)

**Проверка DNS распространения:**
```bash
# На локальной машине
nslookup api.syndicate-poker.ru
dig api.syndicate-poker.ru

# Должен вернуться IP: 89.104.74.121
```

## Шаг 4: Создание ВРЕМЕННОЙ конфигурации Nginx (без SSL)

```bash
# Создать конфигурацию Nginx
nano /etc/nginx/sites-available/api.syndicate-poker.ru
```

Вставьте **ТОЛЬКО ШАГ 1** из файла `nginx-proxy-config.conf` (временная конфигурация без SSL)

```bash
# Создать симлинк
ln -s /etc/nginx/sites-available/api.syndicate-poker.ru /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию (если есть)
rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Запустить Nginx
systemctl restart nginx
```

## Шаг 5: Получение SSL сертификата

```bash
# Получить сертификат (Nginx уже запущен с временной конфигурацией)
certbot certonly --nginx -d api.syndicate-poker.ru

# Ввести email для уведомлений
# Согласиться с Terms of Service

# Настроить автообновление сертификата
certbot renew --dry-run
```

## Шаг 6: Обновление конфигурации с SSL

```bash
# Редактировать конфигурацию
nano /etc/nginx/sites-available/api.syndicate-poker.ru
```

Замените содержимое на **ШАГ 2** из файла `nginx-proxy-config.conf` (финальная конфигурация с SSL - раскомментируйте блок)

```bash
# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl restart nginx
```

## Шаг 7: Проверка работы

```bash
# Проверить статус Nginx
systemctl status nginx

# Проверить логи
tail -f /var/log/nginx/supabase-proxy-error.log
tail -f /var/log/nginx/supabase-proxy-access.log

# Тест запроса
curl https://api.syndicate-poker.ru/rest/v1/
```

## Шаг 8: Настройка Firewall

```bash
# Установить UFW
apt install ufw -y

# Разрешить SSH, HTTP и HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включить firewall
ufw enable

# Проверить статус
ufw status
```

## Мониторинг и обслуживание

### Проверка логов
```bash
# Ошибки
tail -f /var/log/nginx/supabase-proxy-error.log

# Доступ
tail -f /var/log/nginx/supabase-proxy-access.log

# Системные логи Nginx
journalctl -u nginx -f
```

### Перезапуск сервисов
```bash
# Перезапуск Nginx
systemctl restart nginx

# Перезагрузка конфигурации
nginx -s reload

# Проверка конфигурации
nginx -t
```

### Обновление SSL сертификата
```bash
# Автоматически обновляется, но можно проверить:
certbot renew

# Тест обновления
certbot renew --dry-run
```

## Troubleshooting

### Ошибка "502 Bad Gateway"
```bash
# Проверить доступность Supabase
curl -I https://mokhssmnorrhohrowxvu.supabase.co

# Проверить логи Nginx
tail -100 /var/log/nginx/supabase-proxy-error.log
```

### Ошибка "Connection refused"
```bash
# Проверить статус Nginx
systemctl status nginx

# Проверить порты
netstat -tlnp | grep nginx
```

### Ошибка SSL
```bash
# Проверить сертификат
certbot certificates

# Переустановить сертификат
certbot delete --cert-name api.syndicate-poker.ru
certbot certonly --standalone -d api.syndicate-poker.ru
systemctl restart nginx
```

## Безопасность

1. **Смените пароль root** после первого входа
2. **Создайте нового пользователя** вместо использования root
3. **Настройте SSH ключи** вместо паролей
4. **Регулярно обновляйте систему:**
   ```bash
   apt update && apt upgrade -y
   ```
5. **Мониторьте логи** на подозрительную активность

## Проверка работы приложения

После настройки проверьте, что ваше приложение работает:

1. Откройте https://syndicate-poker.ru
2. Проверьте, что данные загружаются из базы
3. Проверьте авторизацию
4. Проверьте создание/редактирование данных

Все запросы должны идти через https://api.syndicate-poker.ru и проксироваться на Supabase.
