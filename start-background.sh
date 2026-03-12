#!/bin/bash

# Переходим в директорию mobile-app
cd "$(dirname "$0")"

echo "🚀 Запуск Expo в tunnel режиме..."

# Останавливаем предыдущий процесс
if [ -f expo.pid ]; then
    OLD_PID=$(cat expo.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⚠️  Останавливаем предыдущий процесс (PID: $OLD_PID)"
        kill $OLD_PID 2>/dev/null
        sleep 2
    fi
    rm expo.pid
fi

# Останавливаем старые screen сессии если есть
screen -S expo-tunnel -X quit > /dev/null 2>&1
screen -S expo-lan -X quit > /dev/null 2>&1
pkill -9 -f "expo\|ngrok" 2>/dev/null
sleep 2

# Освобождаем порт 8081
lsof -ti:8081 | xargs kill -9 > /dev/null 2>&1
sleep 1

# Проверяем наличие @expo/ngrok для tunnel режима
if ! npm list @expo/ngrok > /dev/null 2>&1; then
    echo "📦 Установка @expo/ngrok для tunnel режима..."
    npm install @expo/ngrok@^4.1.0 --save-dev > /dev/null 2>&1
fi

# Используем screen для запуска Expo с автоматическим перезапуском при обрывах tunnel
# Screen создаст отдельную сессию которая будет работать постоянно
rm -f expo.log screenlog.*
screen -dmS expo-tunnel bash -c "cd '$(pwd)' && while true; do npx expo start --tunnel --clear 2>&1 | tee -a expo.log; echo '⚠️  Tunnel оборвался, перезапускаю через 5 секунд...' >> expo.log; sleep 5; done"

# Ждем немного чтобы screen запустился
sleep 5

# Находим PID screen процесса
SCREEN_PID=$(screen -ls | grep "expo-tunnel" | awk '{print $1}' | cut -d. -f1)
if [ ! -z "$SCREEN_PID" ]; then
    echo $SCREEN_PID > expo.pid
    echo "✅ Expo запущен в screen сессии (PID: $SCREEN_PID)"
    echo "💡 Tunnel будет автоматически перезапускаться при обрывах"
else
    echo "❌ Не удалось запустить screen сессию"
    exit 1
fi

echo ""
echo "📝 Просмотр логов: tail -f expo.log"
echo "📝 Просмотр screen: screen -r expo-tunnel"
echo "🛑 Остановка: ./stop-expo.sh"
echo ""
echo "⏳ Ожидание запуска сервера и появления QR кода (это может занять 2-3 минуты)..."
echo "💡 QR код будет сохранен в файле expo.log"

# Ждем и проверяем появление QR кода
for i in {1..25}; do
    sleep 12
    # Проверяем оба файла логов
    for log in expo.log screenlog.0; do
        if [ -f "$log" ] && grep -q "exp://" "$log" 2>/dev/null; then
            if [ "$log" = "screenlog.0" ]; then
                cp screenlog.0 expo.log 2>/dev/null
            fi
            echo ""
            echo "✅ QR код найден!"
            echo ""
            echo "📱 QR код и ссылка для подключения:"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            grep -A 30 "exp://" expo.log | head -40
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "💡 Полный QR код: ./show-qr.sh или откройте expo.log"
            echo "✅ Процесс работает в screen сессии, можно закрывать терминал!"
            echo "💡 Tunnel будет автоматически перезапускаться при обрывах"
            echo ""
            echo "📋 Ссылка для подключения:"
            grep "exp://" expo.log | grep -v "Metro waiting" | head -1 | sed 's/.*exp:\/\/\([^ ]*\).*/exp:\/\/\1/' || grep "exp://" expo.log | head -1
            # Открываем файл с QR кодом
            open expo.log 2>/dev/null
            exit 0
        fi
    done
    # Показываем прогресс каждые 36 секунд
    if [ $((i % 3)) -eq 0 ]; then
        echo "⏳ Ожидание... ($i/25 - проверка каждые 12 секунд)"
        # Показываем последние строки для информации
        if [ -f expo.log ]; then
            tail -2 expo.log 2>/dev/null | grep -v "^$" | tail -1
        fi
    fi
done

# Финальная проверка
echo ""
LOG_FILE="expo.log"
if [ ! -f "$LOG_FILE" ] && [ -f "screenlog.0" ]; then
    LOG_FILE="screenlog.0"
    cp screenlog.0 expo.log 2>/dev/null
fi

if [ -f "$LOG_FILE" ] && grep -q "exp://" "$LOG_FILE" 2>/dev/null; then
    echo "✅ QR код найден!"
    echo ""
    echo "📱 QR код и ссылка:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    grep -A 30 "exp://" "$LOG_FILE" | head -40
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Процесс работает в screen сессии, можно закрывать терминал!"
    echo "💡 Tunnel будет автоматически перезапускаться при обрывах"
    open expo.log 2>/dev/null
else
    echo "⚠️  QR код еще не появился, но процесс работает"
    echo "📝 Последние строки логов:"
    if [ -f "$LOG_FILE" ]; then
        tail -20 "$LOG_FILE" 2>/dev/null
    else
        echo "Логи еще не созданы"
    fi
    echo ""
    echo "💡 Проверьте через минуту: ./show-qr.sh"
    echo "💡 Или смотрите логи: tail -f expo.log"
    echo "💡 Или подключитесь к screen: screen -r expo-tunnel"
    echo "💡 Процесс работает в screen сессии, QR код появится в expo.log"
    echo "💡 Tunnel будет автоматически перезапускаться при обрывах"
fi
