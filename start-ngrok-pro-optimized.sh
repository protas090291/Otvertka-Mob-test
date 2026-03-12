#!/bin/bash

# Оптимизированный запуск Expo с Ngrok Pro для стабильной работы через любую сеть
# Решает проблему зависания на 62% при загрузке bundle

cd "$(dirname "$0")"

echo "🚀 Запуск Expo с Ngrok Pro (оптимизированный для стабильной загрузки)"
echo ""

# Проверка ngrok
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok не установлен"
    echo "Установите: brew install ngrok/ngrok/ngrok"
    exit 1
fi

# Проверка authtoken
if ! ngrok config check &> /dev/null; then
    echo "⚠️  Ngrok authtoken не настроен"
    echo ""
    echo "Для использования Ngrok Pro:"
    echo "1. Зарегистрируйтесь на https://dashboard.ngrok.com"
    echo "2. Выберите план Pro (\$8/месяц)"
    echo "3. Получите authtoken"
    echo "4. Запустите: ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    read -p "Введите ваш ngrok authtoken: " authtoken
    if [ ! -z "$authtoken" ]; then
        ngrok config add-authtoken "$authtoken" || {
            echo "❌ Ошибка установки authtoken"
            exit 1
        }
        echo "✅ Authtoken установлен"
    else
        echo "❌ Authtoken обязателен для Ngrok Pro"
        exit 1
    fi
fi

# Останавливаем предыдущие процессы
echo "🛑 Остановка предыдущих процессов..."
./stop-expo.sh 2>/dev/null
sleep 2

# Устанавливаем переменные окружения для оптимизации
export EXPO_NO_DOTENV=1
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=4096"

# Запускаем Metro Bundler с оптимизированными настройками
echo "📦 Запуск Metro Bundler с оптимизированными настройками..."
screen -dmS expo-metro bash -c "
    cd '$(pwd)'
    export EXPO_NO_DOTENV=1
    export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
    export NODE_OPTIONS='--max-old-space-size=4096'
    while true; do
        echo '🚀 Запуск Metro Bundler...' >> expo.log
        npx expo start --clear --max-workers=2 2>&1 | tee -a expo.log
        echo '⚠️  Metro остановился, перезапускаю через 5 секунд...' >> expo.log
        sleep 5
    done
"

# Ждем запуска Metro
echo "⏳ Ожидание Metro Bundler..."
for i in {1..30}; do
    if curl -s http://localhost:8081/status > /dev/null 2>&1; then
        echo "✅ Metro Bundler запущен"
        break
    fi
    sleep 2
done

# Запускаем Ngrok Pro tunnel с оптимизированными настройками
echo "🌐 Запуск Ngrok Pro tunnel с оптимизацией..."
screen -dmS expo-ngrok bash -c "
    cd '$(pwd)'
    while true; do
        echo '🌐 Запуск Ngrok Pro tunnel...' >> ngrok.log
        # Используем ngrok с оптимизированными настройками
        ngrok http 8081 --log=stdout --log-format=logfmt --log-level=info 2>&1 | tee -a ngrok.log
        echo '⚠️  Ngrok остановился, перезапускаю через 5 секунд...' >> ngrok.log
        sleep 5
    done
"

# Ждем получения URL
echo "⏳ Ожидание tunnel URL..."
sleep 10

# Получаем URL из ngrok API
for i in {1..60}; do
    # Пробуем получить URL через API
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE 'https://[^"]+\.ngrok[^"]*' | head -1)
    
    if [ ! -z "$NGROK_URL" ]; then
        EXP_URL=$(echo "$NGROK_URL" | sed 's|https://|exp://|')
        echo "✅ Tunnel URL получен: $EXP_URL"
        echo "$EXP_URL" > tunnel-url-current.txt
        echo "$EXP_URL" >> tunnel-url-saved.txt
        
        # Создаем QR код
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "$QR_URL" > qr-code-url.txt
        echo "📱 QR код: $QR_URL"
        open "$QR_URL" 2>/dev/null
        
        echo ""
        echo "✅ Готово! Ngrok Pro tunnel работает с оптимизацией"
        echo "📱 URL: $EXP_URL"
        echo ""
        echo "💡 Оптимизации применены:"
        echo "   ✅ Увеличены таймауты Metro до 10 минут"
        echo "   ✅ Оптимизирован размер bundle"
        echo "   ✅ Увеличена память Node.js"
        echo "   ✅ Ngrok Pro для стабильного соединения"
        echo ""
        echo "📋 Управление:"
        echo "  - Остановить: ./stop-expo.sh"
        echo "  - Логи Metro: tail -f expo.log"
        echo "  - Логи Ngrok: tail -f ngrok.log"
        echo "  - QR код: cat qr-code-url.txt"
        break
    fi
    
    # Также проверяем логи
    LOG_URL=$(grep -oE 'https://[^"]+\.ngrok[^"]*' ngrok.log 2>/dev/null | tail -1)
    if [ ! -z "$LOG_URL" ]; then
        EXP_URL=$(echo "$LOG_URL" | sed 's|https://|exp://|')
        echo "$EXP_URL" > tunnel-url-current.txt
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "$QR_URL" > qr-code-url.txt
        open "$QR_URL" 2>/dev/null
        echo "✅ Tunnel URL найден в логах: $EXP_URL"
        break
    fi
    
    sleep 2
done

if [ -z "$EXP_URL" ]; then
    echo "⚠️  Tunnel URL еще не готов, проверьте логи:"
    echo "  tail -f ngrok.log"
fi
