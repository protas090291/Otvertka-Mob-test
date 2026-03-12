#!/bin/bash

# Запуск Ngrok Pro специально для решения проблемы переключения сети
# Ngrok Pro гарантирует стабильное соединение через любую сеть

cd "$(dirname "$0")"

echo "🚀 Запуск Ngrok Pro для стабильной работы через любую сеть"
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

# Устанавливаем переменные окружения
export EXPO_NO_DOTENV=1
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=4096"

# Запускаем Metro Bundler
echo "📦 Запуск Metro Bundler..."
screen -dmS expo-metro bash -c "
    cd '$(pwd)'
    export EXPO_NO_DOTENV=1
    export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
    export NODE_OPTIONS='--max-old-space-size=4096'
    while true; do
        npx expo start --clear --max-workers=2 2>&1 | tee -a expo.log
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

# Запускаем Ngrok Pro с настройками для стабильности
echo "🌐 Запуск Ngrok Pro tunnel..."
screen -dmS expo-ngrok bash -c "
    cd '$(pwd)'
    while true; do
        ngrok http 8081 --log=stdout --log-format=logfmt --log-level=info 2>&1 | tee -a ngrok.log
        sleep 5
    done
"

# Ждем получения URL
echo "⏳ Ожидание tunnel URL..."
sleep 10

# Получаем URL
for i in {1..60}; do
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
        echo "✅ Готово! Ngrok Pro tunnel работает"
        echo "📱 URL: $EXP_URL"
        echo ""
        echo "💡 Преимущества Ngrok Pro:"
        echo "   ✅ Стабильное соединение через любую сеть"
        echo "   ✅ Не нужно пересканировать QR код при переключении сети"
        echo "   ✅ Работает автоматически"
        echo ""
        echo "📋 Инструкция:"
        echo "1. Отсканируйте QR код в Expo Go"
        echo "2. Дождитесь загрузки (100%)"
        echo "3. Можете переключаться между сетями - все будет работать!"
        break
    fi
    
    sleep 2
done

if [ -z "$EXP_URL" ]; then
    echo "⚠️  Tunnel URL еще не готов, проверьте логи:"
    echo "  tail -f ngrok.log"
fi
