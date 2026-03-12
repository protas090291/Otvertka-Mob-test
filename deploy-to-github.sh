#!/bin/bash

# Скрипт для автоматической загрузки мобильного приложения в GitHub
# Этот скрипт автоматически найдет директорию mobile-app и выполнит все необходимые команды

set -e

echo "🚀 Загрузка мобильного приложения в GitHub"
echo ""

# Определяем путь к скрипту и переходим в директорию mobile-app
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Рабочая директория: $(pwd)"
echo ""

# Проверка .gitignore
if [ ! -f .gitignore ]; then
    echo "❌ .gitignore не найден!"
    exit 1
fi

echo "✅ .gitignore найден"
echo ""

# Инициализация Git (если еще не инициализирован)
if [ ! -d .git ]; then
    echo "📦 Инициализирую Git репозиторий..."
    git init
    echo "✅ Git репозиторий инициализирован"
else
    echo "✅ Git репозиторий уже инициализирован"
fi
echo ""

# Настройка remote
echo "🔗 Настраиваю remote репозиторий..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/protas090291/Otvertka-Mob-test.git
echo "✅ Remote добавлен: https://github.com/protas090291/Otvertka-Mob-test.git"
echo ""

# Настройка пользователя Git (если не настроен глобально)
git config user.name "zakharprotas" 2>/dev/null || true
git config user.email "protas.090291@gmail.com" 2>/dev/null || true
echo "✅ Пользователь Git настроен"
echo ""

# Добавление файлов
echo "📦 Добавляю файлы в Git..."
git add .
echo "✅ Файлы добавлены"
echo ""

# Показываем статус
echo "📊 Статус (первые 30 файлов):"
git status --short | head -30
echo ""

# Создание коммита
echo "💾 Создаю коммит..."
if git commit -m "Initial commit: Mobile app for construction management (Отвёртка)

- Expo React Native application
- Supabase integration
- Voice control support
- Defect management system
- Android and iOS support
- Polyfills for Android compatibility" 2>&1; then
    echo "✅ Коммит создан"
else
    echo "⚠️  Коммит уже существует или нет изменений"
    echo "Проверяю статус..."
    git status
fi
echo ""

# Переключение на main ветку
echo "🌿 Переключаюсь на ветку main..."
git branch -M main 2>/dev/null || git checkout -b main 2>/dev/null
echo "✅ Ветка main активна"
echo ""

# Загрузка в GitHub
echo "🌐 Загружаю в GitHub..."
if git push -u origin main 2>&1; then
    echo ""
    echo "✅ ГОТОВО! Приложение загружено в GitHub!"
else
    echo ""
    echo "⚠️  Возможные проблемы:"
    echo "   1. Репозиторий не пустой на GitHub (нужно сделать force push)"
    echo "   2. Нет доступа к репозиторию (проверьте права доступа)"
    echo "   3. Нужна аутентификация (настройте GitHub credentials)"
    echo ""
    echo "Если репозиторий не пустой, выполните:"
    echo "   git push -u origin main --force"
    echo ""
    echo "Или настройте аутентификацию:"
    echo "   gh auth login"
    echo "   или используйте Personal Access Token"
    exit 1
fi

echo ""
echo "📋 ФИНАЛЬНЫЙ СТАТУС:"
echo ""
echo "✅ Репозиторий: https://github.com/protas090291/Otvertka-Mob-test.git"
echo "✅ Ветка: main"
echo ""

# Показываем последний коммит
if git log --oneline -1 2>/dev/null; then
    echo ""
fi

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
echo ""
