#!/bin/bash

# Улучшенная версия Cloudflare Tunnel с лучшей синхронизацией

cd "$(dirname "$0")"

echo "🚀 Запуск Expo с улучшенным Cloudflare Tunnel"
echo ""

# Проверка cloudflared
export PATH="$HOME/.local/bin:$PATH"

if ! command -v cloudflared &> /dev/null; then
    echo "📦 cloudflared не найден, устанавливаю..."
    mkdir -p ~/.local/bin 2>/dev/null
    if [[ "$OSTYPE" == "darwin"* ]]; then
        curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz -o /tmp/cloudflared.tgz
        tar -xzf /tmp/cloudflared.tgz -C /tmp
        mv /tmp/cloudflared ~/.local/bin/cloudflared 2>/dev/null || cp /tmp/cloudflared ~/.local/bin/cloudflared
        chmod +x ~/.local/bin/cloudflared
        export PATH="$HOME/.local/bin:$PATH"
    else
        echo "Установите cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
fi

if ! command -v cloudflared &> /dev/null; then
    echo "❌ Не удалось установить cloudflared"
    exit 1
fi

echo "✅ cloudflared готов: $(cloudflared --version 2>&1 | head -1)"

# Останавливаем предыдущие процессы
echo "🛑 Остановка предыдущих процессов..."
./stop-expo.sh 2>/dev/null
sleep 3

# Освобождаем порт 8081 если занят
if lsof -ti:8081 > /dev/null 2>&1; then
    echo "🛑 Освобождаю порт 8081..."
    kill -9 $(lsof -ti:8081) 2>/dev/null
    sleep 2
fi

# Запускаем Metro Bundler с автоматическим перезапуском
echo "📦 Запуск Metro Bundler..."
screen -dmS expo-metro bash -c "
    cd '$(pwd)'
    export EXPO_NO_DOTENV=1
    export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
    while true; do
        echo '[$(date +%H:%M:%S)] 🚀 Запуск Metro Bundler...' >> expo.log
        npx expo start --clear --host tunnel 2>&1 | tee -a expo.log
        echo '[$(date +%H:%M:%S)] ⚠️  Metro остановился, перезапускаю через 5 секунд...' >> expo.log
        sleep 5
    done
"

# Ждем запуска Metro (улучшенная проверка)
echo "⏳ Ожидание Metro Bundler..."
METRO_READY=false
for i in {1..90}; do
    # Проверяем что Metro отвечает на /status
    if curl -s http://localhost:8081/status > /dev/null 2>&1; then
        # Дополнительная проверка - что Metro действительно готов
        sleep 5
        if curl -s http://localhost:8081/status > /dev/null 2>&1; then
            echo "✅ Metro Bundler запущен и готов (попытка $i)"
            METRO_READY=true
            sleep 5  # Дополнительная пауза для полной готовности
            break
        fi
    fi
    if [ $((i % 10)) -eq 0 ]; then
        echo "⏳ Ожидание Metro... ($i/90)"
    fi
    sleep 2
done

if [ "$METRO_READY" = false ]; then
    echo "❌ Metro Bundler не запустился за 3 минуты"
    echo "Проверьте логи: tail -f expo.log"
    exit 1
fi

# Проверяем что Metro действительно работает
echo "🔍 Финальная проверка Metro..."
for i in {1..10}; do
    if curl -s http://localhost:8081/status > /dev/null 2>&1; then
        echo "✅ Metro подтвержден и готов"
        break
    fi
    sleep 1
done

# Запускаем Cloudflare Tunnel с автоматическим перезапуском
echo "🌐 Запуск Cloudflare Tunnel..."
screen -dmS expo-cloudflare bash -c "
    cd '$(pwd)'
    export PATH=\"\$HOME/.local/bin:\$PATH\"
    while true; do
        echo '[$(date +%H:%M:%S)] 🌐 Запуск Cloudflare Tunnel...' >> cloudflare.log
        # Используем --no-tls-verify для локального подключения
        cloudflared tunnel --url http://localhost:8081 --no-tls-verify 2>&1 | tee -a cloudflare.log
        echo '[$(date +%H:%M:%S)] ⚠️  Cloudflare Tunnel остановился, перезапускаю через 5 секунд...' >> cloudflare.log
        sleep 5
    done
"

# Ждем получения URL
echo "⏳ Ожидание tunnel URL..."
sleep 10

# Получаем URL из логов Cloudflare
EXP_URL=""
for i in {1..90}; do
    CLOUDFLARE_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' cloudflare.log 2>/dev/null | tail -1)
    
    if [ ! -z "$CLOUDFLARE_URL" ]; then
        EXP_URL=$(echo "$CLOUDFLARE_URL" | sed 's|https://|exp://|')
        echo "✅ Tunnel URL получен: $EXP_URL"
        echo "$EXP_URL" > tunnel-url-current.txt
        echo "$EXP_URL" >> tunnel-url-saved.txt
        
        # Создаем QR код
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "$QR_URL" > qr-code-url.txt
        echo "📱 QR код: $QR_URL"
        open "$QR_URL" 2>/dev/null
        
        echo ""
        echo "✅ Готово! Улучшенный Cloudflare Tunnel работает"
        echo "📱 URL: $EXP_URL"
        echo ""
        break
    fi
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "⏳ Ожидание tunnel URL... ($i/90)"
    fi
    
    sleep 2
done

if [ -z "$EXP_URL" ]; then
    echo "⚠️  Tunnel URL еще не готов, проверьте логи:"
    echo "  tail -f cloudflare.log"
    echo ""
    echo "💡 Попробуйте альтернативный tunnel:"
    echo "  npm run start:ngrok-pro"
    exit 1
fi

# Запускаем keep-alive механизм
echo "🔄 Запуск keep-alive механизма..."
screen -dmS expo-keepalive bash -c "
    cd '$(pwd)'
    while true; do
        curl -s http://localhost:8081/status > /dev/null 2>&1
        sleep 60
    done
"

echo "✅ Keep-alive механизм запущен"
echo ""
echo "📋 Управление:"
echo "  - Остановить: ./stop-expo.sh"
echo "  - Логи Metro: tail -f expo.log"
echo "  - Логи Cloudflare: tail -f cloudflare.log"
echo "  - QR код: cat qr-code-url.txt"
