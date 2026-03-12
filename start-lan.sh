#!/bin/bash

# Переходим в директорию mobile-app
cd "$(dirname "$0")"

echo "🚀 Запуск Expo в tunnel режиме (работает с любой сетью)..."
echo "💡 Используется tunnel режим для работы через Wi-Fi и мобильный интернет"
echo ""

# Используем tunnel скрипт
./start-tunnel.sh
