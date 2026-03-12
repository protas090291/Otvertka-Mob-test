#!/bin/bash
# Быстрая загрузка в GitHub - выполните эту команду в терминале

cd Helper2/mobile-app

# Инициализация Git
if [ ! -d .git ]; then
    git init
fi

# Настройка remote
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/protas090291/Otvertka-Mob-test.git

# Настройка пользователя
git config user.name "zakharprotas" 2>/dev/null || true
git config user.email "protas.090291@gmail.com" 2>/dev/null || true

# Добавление файлов
git add .

# Создание коммита
git commit -m "Initial commit: Mobile app for construction management (Отвёртка)

- Expo React Native application
- Supabase integration
- Voice control support
- Defect management system
- Android and iOS support
- Polyfills for Android compatibility" 2>/dev/null || echo "Коммит уже существует"

# Переключение на main
git branch -M main 2>/dev/null || git checkout -b main 2>/dev/null

# Загрузка в GitHub
git push -u origin main

echo ""
echo "✅ Готово! Репозиторий: https://github.com/protas090291/Otvertka-Mob-test.git"
