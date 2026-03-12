#!/bin/bash

# Keep-alive механизм для поддержания Metro/tunnel соединения активным
# Предотвращает истечение соединения после неактивности

cd "$(dirname "$0")"

echo "🔄 Запуск keep-alive механизма..."
echo "Это предотвратит истечение соединения после неактивности"
echo ""

# Проверяем что Metro запущен
if ! curl -s http://localhost:8081/status > /dev/null 2>&1; then
    echo "⚠️  Metro Bundler не запущен"
    echo "Запустите сначала: npm run start:cloudflare"
    exit 1
fi

echo "✅ Metro Bundler обнаружен"
echo "🔄 Keep-alive активен (проверка каждые 60 секунд)"
echo ""

# Запускаем keep-alive в фоне
screen -dmS expo-keepalive bash -c "
    cd '$(pwd)'
    while true; do
        # Проверяем Metro
        if curl -s http://localhost:8081/status > /dev/null 2>&1; then
            echo \"[$(date '+%H:%M:%S')] ✅ Metro активен\" >> keep-alive.log
        else
            echo \"[$(date '+%H:%M:%S')] ⚠️  Metro не отвечает\" >> keep-alive.log
        fi
        
        # Делаем легкий запрос к Metro чтобы поддерживать соединение
        curl -s http://localhost:8081/status > /dev/null 2>&1
        
        # Ждем 60 секунд перед следующей проверкой
        sleep 60
    done
"

echo "✅ Keep-alive запущен в фоне"
echo ""
echo "📋 Управление:"
echo "  - Остановить: screen -X -S expo-keepalive quit"
echo "  - Логи: tail -f keep-alive.log"
echo ""
echo "💡 Keep-alive будет поддерживать соединение активным"
echo "   Это предотвратит проблемы после неактивности"
