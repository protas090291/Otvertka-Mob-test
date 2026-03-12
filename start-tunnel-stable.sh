#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Запуск стабильного tunnel (автоперезапуск + сохранение URL)..."
echo "💡 Tunnel будет автоматически перезапускаться и сохранять URL"
echo ""

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

# Читаем сохраненный URL если есть
SAVED_URL=""
if [ -f tunnel-url-saved.txt ]; then
    SAVED_URL=$(head -1 tunnel-url-saved.txt)
    echo "📋 Найден сохраненный URL: $SAVED_URL"
fi

rm -f expo.log screenlog.*
TUNNEL_URL_FILE="tunnel-url-current.txt"

# Запускаем с автоматическим перезапуском
# URL будет сохраняться из логов отдельным процессом
screen -dmS expo-tunnel bash -c "
  cd '$(pwd)'
  while true; do
    echo '🚀 Запуск tunnel...' >> expo.log
    npx expo start --tunnel --clear 2>&1 | tee -a expo.log
    echo '⚠️  Tunnel оборвался, перезапускаю через 5 секунд...' >> expo.log
    sleep 5
  done
"

# Запускаем отдельный процесс для мониторинга и сохранения URL
screen -dmS expo-url-monitor bash -c "
  cd '$(pwd)'
  while true; do
    sleep 5
    if [ -f expo.log ]; then
      EXP_URL=\$(grep -oE 'exp://[a-z0-9-]+\.exp\.direct' expo.log | tail -1)
      if [ ! -z \"\$EXP_URL\" ]; then
        CURRENT_URL=\$(cat $TUNNEL_URL_FILE 2>/dev/null)
        if [ \"\$CURRENT_URL\" != \"\$EXP_URL\" ]; then
          echo \"\$EXP_URL\" > $TUNNEL_URL_FILE
          echo \"\$EXP_URL\" >> tunnel-url-saved.txt
          echo \"✅ Tunnel URL сохранен: \$EXP_URL\" >> url-monitor.log
        fi
      fi
    fi
  done
"

sleep 5

SCREEN_PID=$(screen -ls | grep "expo-tunnel" | awk '{print $1}' | cut -d. -f1)
if [ ! -z "$SCREEN_PID" ]; then
    echo $SCREEN_PID > expo.pid
    echo "✅ Tunnel запущен в screen сессии (PID: $SCREEN_PID)"
    echo "💡 Автоматический перезапуск включен"
else
    echo "❌ Не удалось запустить screen"
    exit 1
fi

echo ""
echo "⏳ Ожидание tunnel URL (2-3 минуты)..."
echo ""

# Ждем появления URL (проверяем несколько источников)
for i in {1..30}; do
    sleep 10
    
    # Проверяем файл с URL
    if [ -f "$TUNNEL_URL_FILE" ]; then
        EXP_URL=$(head -1 "$TUNNEL_URL_FILE")
        if [ ! -z "$EXP_URL" ]; then
            echo ""
            echo "✅ Tunnel URL получен из файла!"
            echo ""
            echo "📱 Expo URL: $EXP_URL"
            echo ""
            
            # Сохраняем в основной файл
            echo "$EXP_URL" > tunnel-url.txt
            echo "$EXP_URL" >> tunnel-url-saved.txt
            
            # Генерируем QR код
            QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
            echo "📱 QR код:"
            echo "$QR_URL"
            echo ""
            
            # Сохраняем QR код URL
            echo "$QR_URL" > qr-code-url.txt
            
            # Открываем QR код
            open "$QR_URL" 2>/dev/null
            
            echo "✅ QR код открыт в браузере!"
            echo ""
            echo "💡 Этот URL будет работать через любую сеть"
            echo "💡 Tunnel автоматически перезапустится при обрыве"
            echo "💡 URL сохранен в tunnel-url.txt и tunnel-url-saved.txt"
            echo ""
            echo "📝 Просмотр: screen -r expo-tunnel"
            echo "🛑 Остановка: ./stop-expo.sh"
            
            exit 0
        fi
    fi
    
    # Проверяем через ngrok API
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE '"public_url":"https://[^"]*exp\.direct[^"]*"' | head -1 | sed 's/"public_url":"//' | sed 's/"//')
    if [ ! -z "$NGROK_URL" ]; then
        EXP_URL=$(echo "$NGROK_URL" | sed 's|https://|exp://|' | sed 's|http://|exp://|')
        if [ ! -z "$EXP_URL" ]; then
            echo ""
            echo "✅ Tunnel URL получен через ngrok API!"
            echo ""
            echo "📱 Expo URL: $EXP_URL"
            echo ""
            
            # Сохраняем
            echo "$EXP_URL" > "$TUNNEL_URL_FILE"
            echo "$EXP_URL" > tunnel-url.txt
            echo "$EXP_URL" >> tunnel-url-saved.txt
            
            # Генерируем QR код
            QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
            echo "📱 QR код:"
            echo "$QR_URL"
            echo ""
            
            echo "$QR_URL" > qr-code-url.txt
            open "$QR_URL" 2>/dev/null
            
            echo "✅ QR код открыт в браузере!"
            echo ""
            echo "💡 Этот URL будет работать через любую сеть"
            echo "💡 Tunnel автоматически перезапустится при обрыве"
            echo ""
            echo "📝 Просмотр: screen -r expo-tunnel"
            echo "🛑 Остановка: ./stop-expo.sh"
            
            exit 0
        fi
    fi
    
    # Проверяем логи
    if [ -f expo.log ]; then
        EXP_URL=$(grep -oE 'exp://[a-z0-9-]+\.exp\.direct' expo.log | tail -1)
        if [ ! -z "$EXP_URL" ]; then
            echo ""
            echo "✅ Tunnel URL найден в логах!"
            echo ""
            echo "📱 Expo URL: $EXP_URL"
            echo ""
            
            # Сохраняем
            echo "$EXP_URL" > "$TUNNEL_URL_FILE"
            echo "$EXP_URL" > tunnel-url.txt
            echo "$EXP_URL" >> tunnel-url-saved.txt
            
            # Генерируем QR код
            QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
            echo "📱 QR код:"
            echo "$QR_URL"
            echo ""
            
            echo "$QR_URL" > qr-code-url.txt
            open "$QR_URL" 2>/dev/null
            
            echo "✅ QR код открыт в браузере!"
            echo ""
            echo "💡 Этот URL будет работать через любую сеть"
            echo ""
            echo "📝 Просмотр: screen -r expo-tunnel"
            echo "🛑 Остановка: ./stop-expo.sh"
            
            exit 0
        fi
    fi
    
    if [ $((i % 3)) -eq 0 ]; then
        echo "⏳ Ожидание... ($((i * 10)) секунд)"
        # Показываем статус Metro
        METRO_STATUS=$(curl -s http://localhost:8081/status 2>/dev/null | grep -q "running" && echo "✅ Metro работает" || echo "⏳ Metro запускается")
        echo "   $METRO_STATUS"
    fi
done

echo ""
echo "⚠️  Tunnel URL еще не получен, но процесс работает"
echo "💡 Проверьте: screen -r expo-tunnel"
echo "💡 Или логи: tail -f expo.log"
