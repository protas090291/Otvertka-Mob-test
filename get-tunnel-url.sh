#!/bin/bash

cd "$(dirname "$0")"

echo "🔍 Поиск актуального tunnel URL..."
echo ""

# Проверяем через ngrok API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE '"public_url":"[^"]*"' | head -1 | sed 's/"public_url":"//' | sed 's/"//')

if [ ! -z "$NGROK_URL" ]; then
    echo "✅ Tunnel URL найден через ngrok API:"
    echo "   $NGROK_URL"
    echo ""
    
    # Преобразуем https:// в exp://
    EXP_URL=$(echo "$NGROK_URL" | sed 's|https://|exp://|' | sed 's|http://|exp://|')
    echo "📱 URL для Expo Go:"
    echo "   $EXP_URL"
    echo ""
    echo "💡 Отсканируйте QR код заново или используйте этот URL"
else
    echo "⚠️  Ngrok API недоступен"
    echo ""
    echo "🔍 Проверяю логи..."
    
    # Ищем в логах
    for log in expo.log screenlog.0; do
        if [ -f "$log" ]; then
            EXP_URL=$(grep -E "exp://.*exp\.direct|expo://.*exp\.direct" "$log" 2>/dev/null | head -1 | sed -E 's/.*(exp[o]?:\/\/[^ ]+exp\.direct[^ ]*).*/\1/' | head -1)
            if [ ! -z "$EXP_URL" ]; then
                echo "✅ Найден в $log:"
                echo "   $EXP_URL"
                exit 0
            fi
        fi
    done
    
    echo ""
    echo "💡 Подключитесь к screen чтобы увидеть QR код:"
    echo "   screen -r expo-tunnel"
fi
