#!/bin/bash

cd "$(dirname "$0")"

echo "🔍 Проверка альтернативного tunnel URL..."
echo ""

if [ -f tunnel-url.txt ]; then
    EXP_URL=$(head -1 tunnel-url.txt)
    TUNNEL_URL=$(tail -1 tunnel-url.txt)
    
    echo "✅ Tunnel URL найден:"
    echo "   $EXP_URL"
    echo ""
    echo "💡 Используйте этот URL в Expo Go"
    echo ""
    echo "📱 Для создания QR кода:"
    echo "   https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=$EXP_URL"
else
    echo "⚠️  Tunnel URL не найден"
    echo ""
    echo "Проверьте логи:"
    echo "   tail -f tunnel.log"
    echo ""
    echo "Или подключитесь к screen:"
    echo "   screen -r expo-tunnel"
fi
