#!/bin/bash

cd "$(dirname "$0")"

echo "📱 Поиск QR кода..."
echo ""

# Проверяем оба возможных файла логов
for LOG_FILE in expo.log screenlog.0; do
    if [ -f "$LOG_FILE" ]; then
        if grep -qE "exp://|expo://|exp\.direct" "$LOG_FILE" 2>/dev/null; then
            echo "✅ QR код найден в $LOG_FILE!"
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            grep -A 30 -B 2 -E "exp://|expo://|exp\.direct" "$LOG_FILE" | head -45
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "📋 Ссылка для подключения:"
            EXP_URL=$(grep -E "exp://|expo://" "$LOG_FILE" | grep -v "Metro waiting" | head -1 | sed -E 's/.*(exp[o]?:\/\/[^ ]+).*/\1/' | head -1)
            if [ ! -z "$EXP_URL" ]; then
                echo "$EXP_URL"
            else
                grep -E "exp://|expo://" "$LOG_FILE" | head -1
            fi
            echo ""
            echo "💡 Также можете открыть в браузере: http://localhost:8081"
            echo ""
            echo "💡 Открываю файл $LOG_FILE..."
            open "$LOG_FILE" 2>/dev/null
            exit 0
        fi
    fi
done

# Если QR код не найден
if [ -f expo.log ]; then
    echo "⚠️  QR код еще не появился"
    echo "📝 Последние строки логов:"
    tail -20 expo.log
    echo ""
    echo "💡 Metro Bundler все еще запускается..."
    echo ""
    echo "💡 Попробуйте:"
    echo "   - Откройте в браузере: http://localhost:8081"
    echo "   - Проверьте через минуту: ./show-qr.sh"
    echo "   - Смотрите логи в реальном времени: tail -f expo.log"
elif [ -f screenlog.0 ]; then
    echo "⚠️  QR код еще не появился"
    echo "📝 Последние строки логов:"
    tail -20 screenlog.0
    echo ""
    echo "💡 Metro Bundler все еще запускается..."
else
    echo "⚠️  Файлы логов не найдены"
    echo "💡 Запустите Expo: ./start-tunnel.sh или npm run start:tunnel"
fi
