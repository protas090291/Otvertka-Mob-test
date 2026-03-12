# ⚠️ Важно: Expo Go и EAS Update

## 🔍 Проблема:

**EAS Update не работает напрямую с Expo Go!**

EAS Update предназначен для:
- ✅ Development builds (собранные приложения)
- ✅ Production builds (релизные версии)
- ❌ **НЕ работает с Expo Go**

---

## ✅ Правильное решение для Expo Go:

Для **Expo Go** нужно использовать **development server с tunnel**:

```bash
cd Helper2/mobile-app
npm run start:tunnel:stable
npm run qr:stable
```

Это создаст QR код с tunnel URL типа:
```
exp://xxxx-xxxx.exp.direct
```

**Этот QR код работает через любую сеть!**

---

## 📋 Два способа работы:

### 1️⃣ Expo Go (для тестирования):
- Используйте: `npm run start:tunnel:stable`
- Получите QR: `npm run qr:stable`
- Работает через любую сеть
- Нужен запущенный сервер

### 2️⃣ Development Build (для продакшена):
- Используйте: `npm run publish` (EAS Update)
- Работает без сервера
- Нужен собранный development build
- Не работает с Expo Go напрямую

---

## 💡 Рекомендация:

**Для тестирования сейчас используйте tunnel:**
```bash
npm run start:tunnel:stable
npm run qr:stable
```

**Для продакшена:**
1. Соберите development build: `eas build --profile development`
2. Установите на устройство
3. Используйте EAS Update для обновлений

---

## 🎯 Текущий QR код (tunnel):

QR код уже создан и открыт в браузере!

URL: `exp://relktho-zakharprotas-8081.exp.direct`

**Этот QR код работает через любую сеть!**
