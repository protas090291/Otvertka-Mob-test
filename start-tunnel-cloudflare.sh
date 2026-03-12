#!/bin/bash

# Переходим в директорию mobile-app
cd "$(dirname "$0")"

echo "🚀 Запуск Expo с Cloudflare Tunnel (альтернатива ngrok)..."
echo "💡 Cloudflare Tunnel более стабилен для больших bundle"
echo ""

# Останавливаем предыдущий процесс
./stop-expo.sh 2>/dev/null
pkill -9 -f "expo\|ngrok\|cloudflared" 2>/dev/null
sleep 2

# Освобождаем порт 8081
lsof -ti:8081 | xargs kill -9 > /dev/null 2>&1
sleep 1

# Проверяем наличие cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Установка cloudflared..."
    echo ""
    echo "Для macOS:"
    echo "  brew install cloudflare/cloudflare/cloudflared"
    echo ""
    echo "Или скачайте с: https://github.com/cloudflare/cloudflared/releases"
    echo ""
    read -p "Нажмите Enter после установки cloudflared..."
    
    if ! command -v cloudflared &> /dev/null; then
        echo "❌ cloudflared не найден. Установите его и запустите скрипт снова."
        exit 1
    fi
fi

# Запускаем Metro Bundler в фоне (без tunnel, tunnel будет через cloudflared)
echo "🚀 Запуск Metro Bundler..."
rm -f expo.log screenlog.* tunnel.log
screen -dmS expo-metro bash -c "cd '$(pwd)' && npx expo start --clear 2>&1 | tee -a expo.log"

sleep 5

# Ждем пока Metro запустится
echo "⏳ Ожидание запуска Metro Bundler..."
for i in {1..12}; do
    sleep 5
    if curl -s http://localhost:8081/status 2>/dev/null | grep -q "running"; then
        echo "✅ Metro Bundler запущен"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "❌ Metro Bundler не запустился"
        exit 1
    fi
done

# Запускаем Cloudflare Tunnel
echo "🌐 Запуск Cloudflare Tunnel..."
screen -dmS expo-tunnel bash -c "cd '$(pwd)' && cloudflared tunnel --url http://localhost:8081 2>&1 | tee -a tunnel.log"

sleep 5

# Получаем tunnel URL из логов
echo "⏳ Ожидание tunnel URL..."
for i in {1..20}; do
    sleep 2
    if [ -f tunnel.log ]; then
        TUNNEL_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" tunnel.log | head -1)
        if [ ! -z "$TUNNEL_URL" ]; then
            # Преобразуем в exp:// формат
            EXP_URL=$(echo "$TUNNEL_URL" | sed 's|https://|exp://|' | sed 's|http://|exp://|')
            
            echo ""
            echo "✅ Tunnel создан!"
            echo ""
            echo "📱 Tunnel URL: $TUNNEL_URL"
            echo "📱 Expo URL: $EXP_URL"
            echo ""
            echo "💡 Используйте этот URL в Expo Go вместо QR кода"
            echo "💡 Или создайте QR код с этим URL"
            echo ""
            
            # Сохраняем URL в файл
            echo "$EXP_URL" > tunnel-url.txt
            echo "$TUNNEL_URL" >> tunnel-url.txt
            
            # Показываем как создать QR код
            echo "📋 Для создания QR кода используйте:"
            echo "   qrencode -t ANSI '$EXP_URL'"
            echo "   или откройте: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=$EXP_URL"
            echo ""
            
            SCREEN_PID=$(screen -ls | grep "expo-tunnel" | awk '{print $1}' | cut -d. -f1)
            if [ ! -z "$SCREEN_PID" ]; then
                echo $SCREEN_PID > expo.pid
            fi
            
            echo "✅ Процессы запущены в screen сессиях"
            echo "📝 Просмотр Metro: screen -r expo-metro"
            echo "📝 Просмотр Tunnel: screen -r expo-tunnel"
            echo "🛑 Остановка: ./stop-expo.sh"
            echo ""
            
            exit 0
        fi
    fi
done

echo "⚠️  Tunnel URL не получен, но процессы запущены"
echo "💡 Проверьте логи: tail -f tunnel.log"
echo "💡 Или подключитесь: screen -r expo-tunnel"
