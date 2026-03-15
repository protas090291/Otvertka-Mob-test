#!/bin/bash
# Скрипт для запуска Metro Bundler на Time Web Cloud сервере

cd "$(dirname "$0")"

echo "🚀 Запуск Metro Bundler на сервере..."
echo ""

# Экспортируем переменные окружения
export EXPO_NO_DOTENV=1
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
export NODE_OPTIONS='--max-old-space-size=4096'

# Запускаем Metro Bundler на всех интерфейсах (0.0.0.0)
# Используем --host lan для работы через внешний IP
# --port 8081 для указания порта
# --clear для очистки кеша
echo "📦 Запуск Metro Bundler на порту 8081..."
npx expo start --host lan --port 8081 --clear
