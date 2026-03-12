# 🔧 Решение ошибки ERR_NGROK_9040

## ⚠️ Проблема:

Ошибка в логах ngrok:
```
ERR_NGROK_9040
We do not allow agents to connect to ngrok from your IP address (217.70.22.242)
```

**Причина:** Ваш IP адрес заблокирован в настройках безопасности ngrok.

---

## ✅ Решение:

### Шаг 1: Откройте настройки безопасности ngrok

Откройте: https://dashboard.ngrok.com/security/ip-restrictions

### Шаг 2: Добавьте ваш IP в whitelist

1. Найдите раздел **"IP Restrictions"** или **"IP Whitelist"**
2. Добавьте ваш IP адрес: **217.70.22.242**
3. Сохраните изменения

### Шаг 3: Или отключите IP restrictions временно

Если не хотите использовать IP whitelist:
1. Найдите настройку **"IP Restrictions"**
2. Отключите ее временно
3. Сохраните изменения

---

## 🔄 После добавления IP:

1. Ngrok tunnel автоматически переподключится
2. Dashboard заработает (http://localhost:4040)
3. Вы получите tunnel URL
4. QR код будет создан автоматически

---

## 💡 Альтернативное решение:

Если у вас динамический IP адрес, который часто меняется:

1. **Отключите IP restrictions** в настройках ngrok
2. Или используйте **Cloudflare Tunnel** (бесплатный, без IP restrictions)

---

## 📋 После решения проблемы:

После добавления IP в whitelist, tunnel автоматически заработает. Если нет - перезапустите:

```bash
cd Helper2/mobile-app
./stop-expo.sh
npm run start:ngrok-pro
```

---

**Добавьте IP в whitelist и все заработает!** 🚀
