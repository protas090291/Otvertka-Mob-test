#!/bin/bash
# Скрипт для запуска Metro Bundler на Time Web Cloud сервере

cd "$(dirname "$0")"

echo "🚀 Запуск Metro Bundler на сервере..."
echo ""

# Экспортируем переменные окружения
export PORT=${PORT:-8080}
export NODE_ENV=${NODE_ENV:-production}
export EXPO_NO_DOTENV=1
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
export NODE_OPTIONS='--max-old-space-size=4096'

# Запускаем Metro Bundler на порту 8080
echo "📦 Запуск Metro Bundler на порту ${PORT}..."
echo ""

npx expo start --host lan --port ${PORT} --no-dev --minify
