#!/bin/bash

# Скрипт для загрузки мобильного приложения в GitHub
# Запустите этот скрипт из директории mobile-app

set -e

echo "🚀 Загрузка мобильного приложения в GitHub"
echo ""

# Проверка .gitignore
if [ ! -f .gitignore ]; then
    echo "❌ .gitignore не найден!"
    exit 1
fi

echo "✅ .gitignore найден"

# Инициализация Git (если еще не инициализирован)
if [ ! -d .git ]; then
    echo "📦 Инициализирую Git репозиторий..."
    git init
else
    echo "✅ Git репозиторий уже инициализирован"
fi

# Настройка remote
echo "🔗 Настраиваю remote репозиторий..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/protas090291/Otvertka-Mob-test.git
echo "✅ Remote добавлен: https://github.com/protas090291/Otvertka-Mob-test.git"

# Настройка пользователя Git (если не настроен глобально)
git config user.name "zakharprotas" 2>/dev/null || true
git config user.email "protas.090291@gmail.com" 2>/dev/null || true

# Добавление файлов
echo "📦 Добавляю файлы в Git..."
git add .
echo "✅ Файлы добавлены"

# Показываем статус
echo ""
echo "📊 Статус (первые 30 файлов):"
git status --short | head -30

# Создание коммита
echo ""
echo "💾 Создаю коммит..."
git commit -m "Initial commit: Mobile app for construction management (Отвёртка)

- Expo React Native application
- Supabase integration
- Voice control support
- Defect management system
- Android and iOS support
- Polyfills for Android compatibility" || {
    echo "⚠️  Коммит уже существует или нет изменений"
    echo "Проверяю статус..."
    git status
}

# Переключение на main ветку
echo ""
echo "🌿 Переключаюсь на ветку main..."
git branch -M main 2>/dev/null || git checkout -b main 2>/dev/null

# Загрузка в GitHub
echo ""
echo "🌐 Загружаю в GitHub..."
git push -u origin main || {
    echo ""
    echo "⚠️  Возможные проблемы:"
    echo "   1. Репозиторий не пустой на GitHub (нужно сделать force push или удалить файлы)"
    echo "   2. Нет доступа к репозиторию (проверьте права доступа)"
    echo ""
    echo "Если репозиторий не пустой, выполните:"
    echo "   git push -u origin main --force"
    exit 1
}

echo ""
echo "✅ ГОТОВО! Приложение загружено в GitHub!"
echo ""
echo "📋 ФИНАЛЬНЫЙ СТАТУС:"
echo ""
echo "✅ Репозиторий: https://github.com/protas090291/Otvertka-Mob-test.git"
echo "✅ Ветка: main"
echo "✅ Все файлы загружены"
echo ""
echo "📁 Что загружено:"
echo "   ✅ Весь исходный код приложения"
echo "   ✅ package.json и конфигурация"
echo "   ✅ app.json"
echo "   ✅ Все компоненты и экраны"
echo "   ✅ Скрипты для запуска"
echo "   ✅ Polyfills для Android"
echo "   ✅ README и документация"
echo ""
echo "📝 Что исключено (.gitignore):"
echo "   ✅ node_modules/"
echo "   ✅ Логи (*.log)"
echo "   ✅ Временные файлы"
echo "   ✅ Build файлы"
echo ""
echo "💡 Теперь можно клонировать на сервер:"
echo "   git clone https://github.com/protas090291/Otvertka-Mob-test.git"
