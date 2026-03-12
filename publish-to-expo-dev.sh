#!/bin/bash

# Скрипт для публикации в Expo Dev
# Требуется: проект должен быть создан на https://expo.dev

cd "$(dirname "$0")"

echo "🚀 Публикация в Expo Dev"
echo ""

# Проверка входа
echo "🔐 Проверка входа..."
npx eas-cli whoami 2>&1 | grep -q "zakharprotas" || {
    echo "❌ Необходимо войти в аккаунт:"
    echo "   npx eas-cli login"
    exit 1
}

echo "✅ Вход выполнен"
echo ""

# Проверка projectId в app.json
PROJECT_ID=$(grep -A 2 '"projectId"' app.json | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)

if [ -z "$PROJECT_ID" ]; then
    echo "⚠️  ProjectId не найден в app.json"
    echo ""
    echo "📋 Инструкция:"
    echo "1. Откройте https://expo.dev"
    echo "2. Создайте проект 'otvertka-mobile'"
    echo "3. Скопируйте projectId (UUID формат)"
    echo "4. Добавьте в app.json:"
    echo '   "extra": { "eas": { "projectId": "ВАШ-UUID" } }'
    echo ""
    echo "Или используйте стабильный tunnel: ./start-tunnel-stable.sh"
    exit 1
fi

echo "✅ ProjectId найден: $PROJECT_ID"
echo ""

# Публикация
echo "📦 Публикация через EAS Update..."
npx eas-cli update --branch production --message "Update: $(date +'%Y-%m-%d %H:%M:%S')" --non-interactive 2>&1 | tee publish.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "✅ Публикация успешна!"
    echo ""
    echo "📱 Постоянный URL:"
    echo "   exp://expo.dev/@zakharprotas/otvertka-mobile"
    echo ""
    echo "📱 QR код:"
    QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=exp://expo.dev/@zakharprotas/otvertka-mobile"
    echo "$QR_URL"
    echo "$QR_URL" > qr-code-permanent.txt
    echo ""
    echo "💡 Этот QR код работает навсегда!"
    echo "💡 Откройте QR код: open '$QR_URL'"
    open "$QR_URL" 2>/dev/null || echo "Откройте QR код вручную: $QR_URL"
else
    echo ""
    echo "❌ Ошибка публикации. Проверьте логи: publish.log"
    exit 1
fi
