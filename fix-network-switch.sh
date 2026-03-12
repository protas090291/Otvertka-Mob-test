#!/bin/bash

# Скрипт для решения проблемы переключения сети
# Когда телефон переключается на другую сеть, нужно пересканировать QR код

cd "$(dirname "$0")"

echo "🔧 Решение проблемы переключения сети"
echo ""

# Проверяем текущий tunnel
echo "📋 Проверяю текущий tunnel..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE 'https://[^"]+\.exp\.direct' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Tunnel не найден. Запускаю tunnel..."
    ./start-tunnel-stable.sh &
    sleep 15
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE 'https://[^"]+\.exp\.direct' | head -1)
fi

if [ ! -z "$NGROK_URL" ]; then
    EXP_URL=$(echo "$NGROK_URL" | sed 's|https://|exp://|')
    echo "✅ Tunnel URL найден: $EXP_URL"
    echo "$EXP_URL" > tunnel-url-current.txt
    
    # Создаем QR код
    QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
    echo "$QR_URL" > qr-code-url.txt
    echo "📱 QR код: $QR_URL"
    open "$QR_URL" 2>/dev/null
    
    echo ""
    echo "⚠️  ВАЖНО:"
    echo "1. Отсканируйте QR код в Expo Go"
    echo "2. Дождитесь полной загрузки (100%)"
    echo "3. Если переключили сеть - ПЕРЕСКАНИРУЙТЕ QR код заново!"
    echo ""
    echo "💡 Expo Go кэширует локальный адрес, поэтому нужно пересканировать"
    echo "   после переключения сети на мобильный интернет"
else
    echo "❌ Не удалось получить tunnel URL"
    echo "Попробуйте запустить: npm run start:tunnel:stable"
fi
