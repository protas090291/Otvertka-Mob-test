# Инструкция по загрузке в GitHub

## Автоматическая загрузка

Выполните одну из команд в Terminal из директории `mobile-app`:

### Вариант 1: Python скрипт (рекомендуется)
```bash
cd ~/Desktop/"OwnerReady — 2.0 — mob"/Helper2/mobile-app
python3 deploy-to-github.py
```

### Вариант 2: Bash скрипт
```bash
cd ~/Desktop/"OwnerReady — 2.0 — mob"/Helper2/mobile-app
chmod +x deploy-to-github.sh
./deploy-to-github.sh
```

## Ручная загрузка (если скрипты не работают)

Выполните команды по порядку:

```bash
# 1. Перейдите в директорию mobile-app
cd ~/Desktop/"OwnerReady — 2.0 — mob"/Helper2/mobile-app

# 2. Инициализируйте Git (если еще не инициализирован)
git init

# 3. Настройте remote репозиторий
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/protas090291/Otvertka-Mob-test.git

# 4. Настройте пользователя Git
git config user.name "zakharprotas"
git config user.email "protas.090291@gmail.com"

# 5. Добавьте все файлы
git add .

# 6. Создайте коммит
git commit -m "Initial commit: Mobile app for construction management (Отвёртка)

- Expo React Native application
- Supabase integration
- Voice control support
- Defect management system
- Android and iOS support
- Polyfills for Android compatibility"

# 7. Переключитесь на ветку main
git branch -M main

# 8. Загрузите в GitHub
git push -u origin main
```

## Если репозиторий не пустой на GitHub

Если на GitHub уже есть файлы, используйте force push:

```bash
git push -u origin main --force
```

## Если нужна аутентификация

Настройте GitHub credentials:

```bash
# Вариант 1: GitHub CLI
gh auth login

# Вариант 2: Personal Access Token
# Создайте токен на https://github.com/settings/tokens
# Используйте токен вместо пароля при push
```

## После успешной загрузки

Репозиторий будет доступен по адресу:
**https://github.com/protas090291/Otvertka-Mob-test.git**

Можно клонировать на сервер:
```bash
git clone https://github.com/protas090291/Otvertka-Mob-test.git
```
