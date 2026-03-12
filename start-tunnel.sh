#!/bin/bash

# Переходим в директорию mobile-app
cd "$(dirname "$0")"

echo "🚀 Запуск Expo в tunnel режиме (работает с любой сетью)..."
echo "💡 Tunnel режим позволяет подключаться через Wi-Fi и мобильный интернет"
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

# Запускаем Expo через screen с логированием
# Screen создаст отдельную сессию которая будет работать постоянно
# Важно: используем --tunnel для работы через интернет
# Увеличиваем таймауты для стабильной загрузки через tunnel
rm -f expo.log screenlog.*
screen -dmS expo-tunnel bash -c "cd '$(pwd)' && EXPO_NO_DOTENV=1 EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --tunnel --clear --max-workers=2 2>&1 | tee -a expo.log"

# Ждем запуска
sleep 5

# Проверяем что screen запустился
SCREEN_PID=$(screen -ls | grep "expo-tunnel" | awk '{print $1}' | cut -d. -f1)
if [ ! -z "$SCREEN_PID" ]; then
    echo $SCREEN_PID > expo.pid
    echo "✅ Expo запущен в screen сессии (PID: $SCREEN_PID)"
    echo ""
    echo "📝 Просмотр логов: tail -f expo.log"
    echo "📝 Просмотр screen: screen -r expo-tunnel"
    echo "🛑 Остановка: ./stop-expo.sh"
    echo ""
    echo "⏳ Ожидание QR кода (может занять 2-5 минут при первом запуске)..."
    echo ""
    
    # Ждем появления QR кода
    for i in {1..30}; do
        sleep 10
        
        # Проверяем готовность Metro через API
        METRO_STATUS=$(curl -s http://localhost:8081/status 2>/dev/null | grep -q "running" && echo "ready" || echo "waiting")
        
        # Проверяем expo.log и screenlog.0 на наличие QR кода
        for log in expo.log screenlog.0; do
            if [ -f "$log" ]; then
                # Ищем QR код в разных форматах
                if grep -qE "exp://|expo://|exp\.direct" "$log" 2>/dev/null; then
                    if [ "$log" = "screenlog.0" ]; then
                        cp screenlog.0 expo.log 2>/dev/null
                    fi
                    echo ""
                    echo "✅ QR код найден!"
                    echo ""
                    echo "📱 QR код и ссылка:"
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    grep -A 30 -E "exp://|expo://|exp\.direct" expo.log | head -40
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    echo ""
                    # Извлекаем ссылку
                    EXP_URL=$(grep -E "exp://|expo://" expo.log | grep -v "Metro waiting" | head -1 | sed -E 's/.*(exp[o]?:\/\/[^ ]+).*/\1/' | head -1)
                    if [ ! -z "$EXP_URL" ]; then
                        echo "📋 Ссылка для подключения:"
                        echo "$EXP_URL"
                        echo ""
                    fi
                    echo "💡 Также можете открыть в браузере: http://localhost:8081"
                    echo "💡 Открываю файл expo.log..."
                    open expo.log 2>/dev/null
                    exit 0
                fi
            fi
        done
        
        # Показываем прогресс
        if [ $((i % 3)) -eq 0 ]; then
            echo "⏳ Ожидание... ($((i * 10)) секунд | Metro: $METRO_STATUS"
            # Показываем последнюю строку лога для информации
            if [ -f expo.log ]; then
                LAST_LINE=$(tail -1 expo.log 2>/dev/null | grep -v "^$" | head -1)
                if [ ! -z "$LAST_LINE" ] && [ ${#LAST_LINE} -lt 100 ]; then
                    echo "   $LAST_LINE"
                fi
            fi
        fi
    done
    
    echo ""
    echo "⚠️  QR код еще не появился в логах, но процесс работает"
    echo ""
    echo "💡 Попробуйте следующие способы:"
    echo "   1. Откройте в браузере: http://localhost:8081"
    echo "   2. Проверьте логи: tail -f expo.log"
    echo "   3. Запустите: ./show-qr.sh"
    echo "   4. Подключитесь к screen: screen -r expo-tunnel"
    echo ""
    echo "📋 Metro Bundler может еще компилировать кэш при первом запуске"
    echo "💡 QR код появится автоматически когда Metro полностью запустится"
else
    echo "❌ Не удалось запустить screen"
    exit 1
fi
