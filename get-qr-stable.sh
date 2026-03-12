#!/bin/bash

cd "$(dirname "$0")"

echo "📱 Получение стабильного QR кода..."
echo ""

# Сначала проверяем актуальный URL через ngrok API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE '"public_url":"https://[^"]*exp\.direct[^"]*"' | head -1 | sed 's/"public_url":"//' | sed 's/"//')
if [ ! -z "$NGROK_URL" ]; then
    EXP_URL=$(echo "$NGROK_URL" | sed 's|https://|exp://|' | sed 's|http://|exp://|')
    if [ ! -z "$EXP_URL" ]; then
        echo "✅ Найден актуальный tunnel URL через ngrok API:"
        echo "   $EXP_URL"
        echo ""
        
        # Сохраняем
        echo "$EXP_URL" > tunnel-url-current.txt
        echo "$EXP_URL" > tunnel-url.txt
        echo "$EXP_URL" >> tunnel-url-saved.txt
        
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "📱 QR код:"
        echo "$QR_URL"
        echo ""
        
        echo "$QR_URL" > qr-code-url.txt
        open "$QR_URL" 2>/dev/null
        
        echo "✅ QR код открыт в браузере!"
        echo ""
        echo "💡 Этот URL работает через любую сеть"
        echo "💡 Используйте его в Expo Go"
        
        exit 0
    fi
fi

# Проверяем сохраненный URL
if [ -f tunnel-url-saved.txt ]; then
    EXP_URL=$(tail -1 tunnel-url-saved.txt | grep -oE 'exp://[a-z0-9-]+\.exp\.direct' | head -1)
    if [ ! -z "$EXP_URL" ]; then
        echo "✅ Найден сохраненный tunnel URL:"
        echo "   $EXP_URL"
        echo ""
        
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "📱 QR код:"
        echo "$QR_URL"
        echo ""
        
        # Открываем QR код
        open "$QR_URL" 2>/dev/null
        
        echo "✅ QR код открыт в браузере!"
        echo ""
        echo "💡 Этот URL работает через любую сеть"
        echo "💡 Используйте его в Expo Go"
        
        exit 0
    fi
fi

# Проверяем текущий URL
if [ -f tunnel-url-current.txt ]; then
    EXP_URL=$(head -1 tunnel-url-current.txt)
    if [ ! -z "$EXP_URL" ]; then
        echo "✅ Найден текущий tunnel URL:"
        echo "   $EXP_URL"
        echo ""
        
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "📱 QR код:"
        echo "$QR_URL"
        echo ""
        
        open "$QR_URL" 2>/dev/null
        echo "✅ QR код открыт!"
        
        exit 0
    fi
fi

# Проверяем логи
if [ -f expo.log ]; then
    EXP_URL=$(grep -oE 'exp://[a-z0-9-]+\.exp\.direct' expo.log | tail -1)
    if [ ! -z "$EXP_URL" ]; then
        echo "✅ Найден tunnel URL в логах:"
        echo "   $EXP_URL"
        echo ""
        
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "📱 QR код:"
        echo "$QR_URL"
        echo ""
        
        open "$QR_URL" 2>/dev/null
        echo "✅ QR код открыт!"
        
        exit 0
    fi
fi

echo "⚠️  Tunnel URL не найден"
echo ""
echo "💡 Запустите tunnel:"
echo "   ./start-tunnel-stable.sh"
echo ""
echo "💡 Или проверьте логи:"
echo "   tail -f expo.log"
echo "   screen -r expo-tunnel"
