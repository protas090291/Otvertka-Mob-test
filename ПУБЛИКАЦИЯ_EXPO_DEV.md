# 🚀 Публикация в Expo Dev для постоянного QR кода

## ✅ Преимущества публикации в Expo Dev:

- ✅ **Постоянный URL** - не меняется никогда
- ✅ **Работает 24/7** - не нужно запускать сервер
- ✅ **Доступен из интернета** - работает с любой сети
- ✅ **Не истекает** - работает всегда
- ✅ **Один QR код навсегда** - не нужно пересканировать

---

## 📋 Шаги для публикации:

### Шаг 1: Создайте проект на Expo Dev

1. Откройте https://expo.dev
2. Войдите в аккаунт (zakharprotas)
3. Нажмите "Create a project" или "New Project"
4. Выберите "Blank" или "Blank (TypeScript)"
5. Название: `otvertka-mobile`
6. Slug: `otvertka-mobile` (должен совпадать с app.json)

После создания вы получите **projectId** (UUID формат).

### Шаг 2: Обновите app.json

Добавьте полученный projectId в `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "ВАШ-UUID-PROJECT-ID"
      }
    }
  }
}
```

### Шаг 3: Публикуйте через EAS Update

**Автоматический способ (рекомендуется):**

```bash
cd Helper2/mobile-app
npm run publish
```

Скрипт автоматически:
- Проверит вход в аккаунт
- Проверит наличие projectId
- Опубликует проект
- Создаст QR код

**Ручной способ:**

```bash
cd Helper2/mobile-app

# Установите EAS CLI (если еще не установлен)
npm install -g eas-cli

# Войдите в аккаунт (если еще не вошли)
npx eas-cli login

# Публикуйте
npx eas-cli update --branch production --message "Initial publish"
```

### Шаг 4: Получите постоянный URL

После публикации вы получите постоянный URL:
```
exp://expo.dev/@zakharprotas/otvertka-mobile
```

Этот URL будет работать **всегда**!

---

## 📱 Создание QR кода:

После получения постоянного URL создайте QR код:

```
https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=exp://expo.dev/@zakharprotas/otvertka-mobile
```

Этот QR код будет работать **навсегда**!

---

## 🔄 Обновление приложения:

Когда нужно обновить приложение:

```bash
cd Helper2/mobile-app
eas update --branch production --message "Update description"
```

URL и QR код остаются теми же!

---

## 💡 Альтернатива: Использовать существующий проект

Если проект уже создан на expo.dev:

1. Откройте https://expo.dev
2. Найдите проект `otvertka-mobile`
3. Скопируйте projectId из настроек проекта
4. Добавьте в `app.json` как показано выше
5. Публикуйте через `eas update`

---

## ⚠️ Важно:

- **ProjectId должен быть UUID** - получается при создании проекта на expo.dev
- **Slug должен совпадать** - `otvertka-mobile` в app.json и на expo.dev
- **Owner должен совпадать** - `zakharprotas` в app.json

---

**После публикации у вас будет постоянный QR код который работает всегда! 🎉**
