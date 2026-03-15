# 🚀 Настройка Expo Go через Nginx (без туннеля)

Это решение позволяет использовать Expo Go с удалённого сервера Time Web Cloud без туннелей, с постоянным QR-кодом и стабильным подключением.

## ✅ Преимущества

- ✅ **Постоянный QR-код** - один раз отсканировал, работает всегда
- ✅ **Работает в любой сети** - Wi-Fi, LTE, любая страна
- ✅ **Нет обрывов** - нет туннелей, нет перебоев
- ✅ **Автоматические обновления** - сохранил код → все видят изменения
- ✅ **Стандартный порт 80** - Time Web Cloud всегда видит порт 80

## 📋 Пошаговая настройка

### Шаг 1: Подключитесь к серверу по SSH

```bash
ssh username@ip-сервера
```

Или используйте VS Code Remote-SSH для удобной работы.

### Шаг 2: Установите nginx (если ещё нет)

```bash
sudo apt update
sudo apt install nginx -y
```

Проверьте установку:
```bash
nginx -v
```

### Шаг 3: Создайте конфиг nginx для Expo

Скопируйте файл `nginx-expo.conf` на сервер в директорию `/etc/nginx/sites-available/`:

```bash
sudo cp /path/to/nginx-expo.conf /etc/nginx/sites-available/expo
```

Или создайте файл вручную:

```bash
sudo nano /etc/nginx/sites-available/expo
```

Вставьте содержимое из `nginx-expo.conf`:

```nginx
server {
    listen 80;
    server_name _;  # или ваш домен protas090291-otvertka-mob-test-beaf.twc1.net

    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
}
```

Сохраните файл: `Ctrl+O` → `Enter` → `Ctrl+X`

### Шаг 4: Активируйте конфиг nginx

```bash
# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/expo /etc/nginx/sites-enabled/

# Удалите дефолтный конфиг (если нужно)
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфиг на ошибки
sudo nginx -t

# Если всё ок, перезапустите nginx
sudo systemctl restart nginx
```

### Шаг 5: Настройте Time Web Cloud

#### 5.1. Команда запуска

В разделе "Настройки деплоя" → "Команда запуска":

```
node server.js
```

#### 5.2. Переменные окружения

В разделе "Настройки" → "Переменные":

- **УДАЛИТЕ:** `PORT` (больше не нужна)
- **ДОБАВЬТЕ:** `METRO_PORT` = `8081`

Оставьте остальные переменные:
- `NODE_ENV` = `production`
- `EXPO_NO_DOTENV` = `1`
- `EXPO_DEVTOOLS_LISTEN_ADDRESS` = `0.0.0.0`
- `NODE_OPTIONS` = `--max-old-space-size=4096`

#### 5.3. Health Check Path

Оставьте:
```
/status
```

Metro Bundler предоставляет health check через `/status`.

#### 5.4. Сохраните и перезапустите

1. Нажмите "Сохранить данные"
2. Перезапустите приложение
3. Подождите 2-3 минуты

### Шаг 6: Проверьте работу

#### 6.1. Проверка Metro через nginx

В браузере телефона откройте:
```
http://protas090291-otvertka-mob-test-beaf.twc1.net
```

Должен открыться Metro status page или QR-код — значит nginx проксирует правильно.

#### 6.2. Подключение через Expo Go

В Expo Go введите вручную:
```
exp://protas090291-otvertka-mob-test-beaf.twc1.net
```

**Без порта** — nginx сам перенаправит на 8081.

#### 6.3. QR-код

Metro Bundler автоматически создаст QR-код. Вы увидите его:
- В логах Time Web Cloud
- На странице `http://protas090291-otvertka-mob-test-beaf.twc1.net`

Отсканируйте QR-код в Expo Go — приложение должно подключиться!

## 🔧 Дополнительная настройка (опционально)

### Использование домена вместо IP

Если у вас есть домен:

1. В Time Web Cloud → DNS → добавьте A-запись:
   ```
   ваш-домен.com → IP сервера
   ```

2. В nginx конфиге замените:
   ```nginx
   server_name _;
   ```
   на:
   ```nginx
   server_name ваш-домен.com;
   ```

3. Перезапустите nginx:
   ```bash
   sudo systemctl restart nginx
   ```

4. В Expo Go используйте:
   ```
   exp://ваш-домен.com
   ```

## 🐛 Решение проблем

### Проблема: "502 Bad Gateway"

**Причина:** Metro Bundler не запущен на порту 8081

**Решение:**
1. Проверьте логи Time Web Cloud — запустился ли Metro
2. Проверьте переменную `METRO_PORT` = `8081`
3. Перезапустите приложение

### Проблема: "Connection refused"

**Причина:** Nginx не может подключиться к Metro

**Решение:**
```bash
# Проверьте что Metro слушает на 8081
curl http://localhost:8081/status

# Если не отвечает, проверьте логи
# В Time Web Cloud → Логи
```

### Проблема: QR-код не работает в Expo Go

**Причина:** Неправильный формат URL

**Решение:**
- Используйте формат: `exp://protas090291-otvertka-mob-test-beaf.twc1.net`
- **Без порта** — nginx сам перенаправит
- **Без `http://`** — только `exp://`

## ✅ Результат

После настройки:

- ✅ Metro Bundler работает на порту 8081 (внутренний)
- ✅ Nginx проксирует порт 80 → порт 8081
- ✅ Health check доступен через `/status`
- ✅ QR-код доступен на главной странице
- ✅ Expo Go может подключиться через стандартный порт 80
- ✅ Постоянный QR-код — один раз отсканировал, работает всегда
- ✅ Работает в любой сети без перебоев

---

**После этих шагов всё должно работать!** 🚀
