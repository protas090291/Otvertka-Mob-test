#!/bin/bash

# Переходим в директорию mobile-app
cd "$(dirname "$0")"

echo "🚀 Запуск Expo в фоновом режиме с tunnel..."

# Останавливаем предыдущий процесс
./stop-expo.sh 2>/dev/null
pkill -9 -f "expo\|ngrok" 2>/dev/null
sleep 2

# Освобождаем порт 8081
lsof -ti:8081 | xargs kill -9 > /dev/null 2>&1
sleep 1

# Проверяем наличие @expo/ngrok
if ! npm list @expo/ngrok > /dev/null 2>&1; then
    echo "📦 Установка @expo/ngrok..."
    npm install @expo/ngrok@^4.1.0 --save-dev > /dev/null 2>&1
fi

# Запускаем Expo через screen с логированием
# Screen создаст отдельную сессию которая будет работать постоянно
rm -f expo.log screenlog.*
screen -dmS expo-tunnel bash -c "cd '$(pwd)' && npx expo start --tunnel --clear 2>&1 | tee expo.log"

# Ждем запуска
sleep 5

# Проверяем что screen запустился
SCREEN_PID=$(screen -ls | grep "expo-tunnel" | awk '{print $1}' | cut -d. -f1)
if [ ! -z "$SCREEN_PID" ]; then
    echo $SCREEN_PID > expo.pid
    echo "✅ Expo запущен в screen сессии (PID: $SCREEN_PID)"
    echo ""
    echo "📝 Просмотр логов: tail -f expo.log"
    echo "📝 Просмотр screen: screen -r expo-tunnel"
    echo "🛑 Остановка: ./stop-expo.sh"
    echo ""
    echo "⏳ Ожидание QR кода (2-3 минуты)..."
    
    # Ждем появления QR кода
    for i in {1..20}; do
        sleep 10
        # Проверяем expo.log и screenlog.0
        for log in expo.log screenlog.0; do
            if [ -f "$log" ] && grep -q "exp://" "$log" 2>/dev/null; then
                if [ "$log" = "screenlog.0" ]; then
                    cp screenlog.0 expo.log 2>/dev/null
                fi
                echo ""
                echo "✅ QR код найден!"
                echo ""
                echo "📱 QR код и ссылка:"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                grep -A 30 "exp://" expo.log | head -40
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                echo "📋 Ссылка: $(grep 'exp://' expo.log | grep -v 'Metro waiting' | head -1 | sed 's/.*exp:\/\/\([^ ]*\).*/exp:\/\/\1/' || grep 'exp://' expo.log | head -1)"
                echo ""
                echo "💡 Открываю файл expo.log..."
                open expo.log 2>/dev/null
                exit 0
            fi
        done
        if [ $((i % 3)) -eq 0 ]; then
            echo "⏳ Ожидание... ($i/20)"
        fi
    done
    
    echo ""
    echo "⚠️  QR код еще не появился, но процесс работает"
    echo "💡 Проверьте: ./show-qr.sh или tail -f expo.log"
else
    echo "❌ Не удалось запустить screen"
    exit 1
fi
