#!/bin/bash
# Скрипт для запуска Express сервера на Time Web Cloud сервере
# Express сервер предоставляет health check и проксирует запросы к Metro Bundler

cd "$(dirname "$0")"

echo "🚀 Запуск Express сервера для Time Web Cloud..."
echo ""

# Экспортируем переменные окружения
export PORT=${PORT:-8080}
export METRO_PORT=${METRO_PORT:-8081}
export NODE_ENV=${NODE_ENV:-production}
export EXPO_NO_DOTENV=1
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
export NODE_OPTIONS='--max-old-space-size=4096'

# Запускаем Express сервер (который сам запустит Metro Bundler)
echo "📦 Запуск Express сервера на порту ${PORT}..."
echo "🔗 Metro Bundler будет доступен на порту ${METRO_PORT}"
echo ""

node server.js
