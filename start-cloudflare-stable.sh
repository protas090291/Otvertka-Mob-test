#!/bin/bash

# Стабильный запуск Expo с Cloudflare Tunnel (бесплатный, очень надежный)

cd "$(dirname "$0")"

echo "🚀 Запуск Expo с Cloudflare Tunnel (бесплатный, стабильный)"
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
sleep 2

# Запускаем Metro Bundler с автоматическим перезапуском
echo "📦 Запуск Metro Bundler..."
screen -dmS expo-metro bash -c "
    cd '$(pwd)'
    while true; do
        echo '🚀 Запуск Metro Bundler...' >> expo.log
        npx expo start --clear 2>&1 | tee -a expo.log
        echo '⚠️  Metro остановился, перезапускаю через 5 секунд...' >> expo.log
        sleep 5
    done
"

# Ждем запуска Metro (увеличиваем время ожидания)
echo "⏳ Ожидание Metro Bundler..."
METRO_READY=false
for i in {1..60}; do
    if curl -s http://localhost:8081/status > /dev/null 2>&1; then
        echo "✅ Metro Bundler запущен и готов"
        METRO_READY=true
        sleep 3  # Дополнительная пауза для полной готовности
        break
    fi
    if [ $((i % 5)) -eq 0 ]; then
        echo "⏳ Ожидание Metro... ($i/60)"
    fi
    sleep 2
done

if [ "$METRO_READY" = false ]; then
    echo "⚠️  Metro Bundler не запустился за 2 минуты"
    echo "Проверьте логи: tail -f expo.log"
fi

# Запускаем Cloudflare Tunnel с автоматическим перезапуском
echo "🌐 Запуск Cloudflare Tunnel..."
screen -dmS expo-cloudflare bash -c "
    cd '$(pwd)'
    export PATH=\"\$HOME/.local/bin:\$PATH\"
    while true; do
        echo '🌐 Запуск Cloudflare Tunnel...' >> cloudflare.log
        cloudflared tunnel --url http://localhost:8081 2>&1 | tee -a cloudflare.log
        echo '⚠️  Cloudflare Tunnel остановился, перезапускаю через 5 секунд...' >> cloudflare.log
        sleep 5
    done
"

# Ждем получения URL
echo "⏳ Ожидание tunnel URL..."
sleep 5

# Получаем URL из логов Cloudflare
for i in {1..60}; do
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
        echo "✅ Готово! Cloudflare Tunnel работает стабильно"
        echo "📱 URL: $EXP_URL"
        echo "💡 Cloudflare Tunnel бесплатный и очень стабильный"
        echo ""
        echo "📋 Управление:"
        echo "  - Остановить: ./stop-expo.sh"
        echo "  - Логи Metro: tail -f expo.log"
        echo "  - Логи Cloudflare: tail -f cloudflare.log"
        echo "  - QR код: cat qr-code-url.txt"
        break
    fi
    
    sleep 2
done

if [ -z "$EXP_URL" ]; then
    echo "⚠️  Tunnel URL еще не готов, проверьте логи:"
    echo "  tail -f cloudflare.log"
fi

# Запускаем keep-alive механизм для поддержания соединения активным
echo ""
echo "🔄 Запуск keep-alive механизма..."
screen -dmS expo-keepalive bash -c "
    cd '$(pwd)'
    while true; do
        # Проверяем Metro и делаем легкий запрос чтобы поддерживать соединение
        curl -s http://localhost:8081/status > /dev/null 2>&1
        sleep 60  # Проверка каждую минуту
    done
"

echo "✅ Keep-alive механизм запущен"
echo "💡 Это предотвратит истечение соединения после неактивности"
echo ""
echo "📋 Полное управление:"
echo "  - Остановить все: ./stop-expo.sh"
echo "  - Логи Metro: tail -f expo.log"
echo "  - Логи Cloudflare: tail -f cloudflare.log"
echo "  - QR код: cat qr-code-url.txt"
