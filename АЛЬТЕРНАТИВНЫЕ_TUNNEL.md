# 🌐 Альтернативные Tunnel сервисы

## ⚠️ Проблема с ngrok
Ngrok может быть нестабильным при загрузке больших bundle через мобильный интернет, особенно на 39-40% загрузки.

## ✅ Решение: Используйте альтернативные tunnel сервисы

### Вариант 1: Cloudflare Tunnel (Рекомендуется) ⭐

**Преимущества:**
- ✅ Очень стабильный
- ✅ Хорошо работает с большими файлами
- ✅ Бесплатный
- ✅ Быстрый

**Установка:**
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Или скачайте с: https://github.com/cloudflare/cloudflared/releases
```

**Запуск:**
```bash
cd Helper2/mobile-app
./start-tunnel-cloudflare.sh
```

**Использование:**
1. Скрипт покажет tunnel URL (например: `exp://xxxx.trycloudflare.com`)
2. Используйте этот URL в Expo Go вместо QR кода
3. Или создайте QR код с этим URL

---

### Вариант 2: LocalTunnel

**Преимущества:**
- ✅ Простой в использовании
- ✅ Бесплатный
- ✅ Не требует регистрации

**Установка:**
```bash
npm install -g localtunnel
```

**Запуск:**
```bash
cd Helper2/mobile-app
./start-tunnel-localtunnel.sh
```

**Использование:**
1. Скрипт покажет tunnel URL (например: `exp://xxxx.loca.lt`)
2. Используйте этот URL в Expo Go

---

## 📋 Сравнение сервисов

| Сервис | Стабильность | Скорость | Простота | Рекомендация |
|--------|--------------|----------|----------|--------------|
| **Cloudflare Tunnel** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Лучший выбор |
| **LocalTunnel** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Хорошая альтернатива |
| **Ngrok** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⚠️ Проблемы с большими bundle |

---

## 🚀 Быстрый старт с Cloudflare Tunnel

### Шаг 1: Установите cloudflared
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Шаг 2: Запустите tunnel
```bash
cd Helper2/mobile-app
./start-tunnel-cloudflare.sh
```

### Шаг 3: Используйте полученный URL
Скрипт покажет URL вида: `exp://xxxx.trycloudflare.com`

Используйте его в Expo Go вместо QR кода.

---

## 💡 Создание QR кода из URL

Если получили tunnel URL и хотите создать QR код:

### Онлайн:
Откройте в браузере:
```
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=ВАШ_URL
```

### Через командную строку (macOS):
```bash
brew install qrencode
qrencode -t ANSI 'exp://xxxx.trycloudflare.com'
```

---

## 🔄 Переключение между tunnel сервисами

### Остановить текущий:
```bash
./stop-expo.sh
```

### Запустить другой:
```bash
# Cloudflare Tunnel
./start-tunnel-cloudflare.sh

# LocalTunnel
./start-tunnel-localtunnel.sh

# Ngrok (оригинальный)
./start-tunnel.sh
```

---

## ⚠️ Важно

1. **Cloudflare Tunnel** - лучший выбор для стабильной работы с большими bundle
2. **LocalTunnel** - хорошая альтернатива, но может быть медленнее
3. После переключения tunnel сервиса нужно **пересканировать QR код** или использовать новый URL

---

**Рекомендую начать с Cloudflare Tunnel - он самый стабильный! 🚀**
