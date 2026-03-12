#!/bin/bash

cd "$(dirname "$0")"

EXP_URL=$(head -1 tunnel-url.txt 2>/dev/null || echo "exp://happy-queens-count.loca.lt")

echo "📱 QR код для LocalTunnel"
echo ""
echo "URL: $EXP_URL"
echo ""
echo "📱 Откройте эту ссылку в браузере для QR кода:"
echo "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
echo ""

# Пытаемся открыть в браузере
open "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL" 2>/dev/null

echo "✅ QR код должен открыться в браузере"
echo ""
echo "💡 Или используйте URL напрямую в Expo Go: $EXP_URL"
