#!/bin/bash

cd "$(dirname "$0")"

if [ -f expo.log ]; then
    echo "📝 Просмотр логов Expo (Ctrl+C для выхода)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -f expo.log
else
    echo "⚠️  Файл expo.log не найден"
    echo "💡 Убедитесь, что Expo запущен: ./start-background.sh"
fi
