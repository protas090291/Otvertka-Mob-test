#!/bin/bash

cd "$(dirname "$0")"

if [ -f expo.pid ]; then
    PID=$(cat expo.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "🛑 Останавливаем Expo (PID: $PID)"
        kill $PID
        sleep 2
        
        # Если процесс все еще работает, принудительно завершаем
        if ps -p $PID > /dev/null 2>&1; then
            echo "⚠️  Принудительное завершение процесса"
            kill -9 $PID
        fi
        
        echo "✅ Expo остановлен"
    else
        echo "⚠️  Процесс не найден (PID: $PID)"
    fi
    rm expo.pid
else
    echo "⚠️  Файл expo.pid не найден"
    echo "💡 Попробуйте найти процесс вручную: ps aux | grep 'expo start'"
fi

# Останавливаем screen сессии если есть
screen -S expo-tunnel -X quit > /dev/null 2>&1
screen -S expo-lan -X quit > /dev/null 2>&1
screen -S expo-metro -X quit > /dev/null 2>&1
screen -S expo-url-monitor -X quit > /dev/null 2>&1
screen -S expo-cloudflare -X quit > /dev/null 2>&1
screen -S expo-keepalive -X quit > /dev/null 2>&1

# Также убиваем все процессы expo, metro, ngrok, cloudflared, localtunnel на всякий случай
pkill -f "expo start" 2>/dev/null
pkill -f "metro" 2>/dev/null
pkill -f "ngrok" 2>/dev/null
pkill -f "cloudflared" 2>/dev/null
pkill -f "localtunnel\|lt " 2>/dev/null
pkill -f "keep-alive" 2>/dev/null
echo "✅ Все процессы Expo остановлены"
