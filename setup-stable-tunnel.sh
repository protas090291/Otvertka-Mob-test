#!/bin/bash

# Скрипт для настройки стабильного tunnel для Expo Go
# Поддерживает: Ngrok Pro, Cloudflare Tunnel, Serveo

cd "$(dirname "$0")"

echo "🚀 Настройка стабильного tunnel для Expo Go"
echo ""

# Проверка вариантов
echo "📋 Доступные варианты:"
echo ""
echo "1. Ngrok Pro/Team (платный, самый стабильный)"
echo "   - Цена: от \$8/месяц"
echo "   - Стабильность: ⭐⭐⭐⭐⭐"
echo "   - Без обрывов: ✅"
echo ""
echo "2. Cloudflare Tunnel (бесплатный, очень стабильный)"
echo "   - Цена: БЕСПЛАТНО"
echo "   - Стабильность: ⭐⭐⭐⭐"
echo "   - Без обрывов: ✅ (почти)"
echo ""
echo "3. Serveo (бесплатный)"
echo "   - Цена: БЕСПЛАТНО"
echo "   - Стабильность: ⭐⭐⭐"
echo "   - Без обрывов: ⚠️ (может обрываться)"
echo ""

read -p "Выберите вариант (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "🔧 Настройка Ngrok Pro..."
        echo ""
        echo "Для использования Ngrok Pro нужно:"
        echo "1. Зарегистрироваться на https://dashboard.ngrok.com"
        echo "2. Получить authtoken"
        echo "3. Установить: ngrok config add-authtoken YOUR_TOKEN"
        echo ""
        read -p "Введите ваш ngrok authtoken (или нажмите Enter для пропуска): " authtoken
        if [ ! -z "$authtoken" ]; then
            ngrok config add-authtoken "$authtoken" 2>/dev/null || {
                echo "❌ Ошибка установки authtoken"
                echo "Установите ngrok: brew install ngrok/ngrok/ngrok"
                exit 1
            }
            echo "✅ Ngrok authtoken установлен"
        fi
        echo ""
        echo "📝 Создаю скрипт для запуска с Ngrok Pro..."
        cat > start-ngrok-pro.sh << 'NGROKPRO'
#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 Запуск Expo с Ngrok Pro tunnel..."

# Останавливаем предыдущие процессы
./stop-expo.sh 2>/dev/null

# Запускаем Metro в фоне
echo "📦 Запуск Metro Bundler..."
screen -dmS expo-metro bash -c "cd '$(pwd)' && npx expo start --clear 2>&1 | tee -a expo.log"

# Ждем запуска Metro
echo "⏳ Ожидание Metro Bundler..."
sleep 10

# Проверяем что Metro запустился
for i in {1..30}; do
    if curl -s http://localhost:8081/status > /dev/null 2>&1; then
        echo "✅ Metro Bundler запущен"
        break
    fi
    sleep 2
done

# Запускаем Ngrok Pro tunnel
echo "🌐 Запуск Ngrok Pro tunnel..."
screen -dmS expo-ngrok bash -c "cd '$(pwd)' && ngrok http 8081 --log=stdout 2>&1 | tee -a ngrok.log"

# Ждем получения URL
echo "⏳ Ожидание tunnel URL..."
sleep 5

# Получаем URL из ngrok API
for i in {1..30}; do
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE 'https://[^"]+\.ngrok-free\.app' | head -1)
    if [ ! -z "$NGROK_URL" ]; then
        EXP_URL=$(echo "$NGROK_URL" | sed 's|https://|exp://|')
        echo "✅ Tunnel URL получен: $EXP_URL"
        echo "$EXP_URL" > tunnel-url-current.txt
        
        # Создаем QR код
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "$QR_URL" > qr-code-url.txt
        echo "📱 QR код: $QR_URL"
        open "$QR_URL" 2>/dev/null
        
        echo ""
        echo "✅ Готово! Tunnel работает стабильно"
        echo "📱 URL: $EXP_URL"
        break
    fi
    sleep 2
done
NGROKPRO
        chmod +x start-ngrok-pro.sh
        echo "✅ Скрипт start-ngrok-pro.sh создан"
        ;;
        
    2)
        echo ""
        echo "🔧 Настройка Cloudflare Tunnel..."
        echo ""
        
        # Проверяем наличие cloudflared
        if ! command -v cloudflared &> /dev/null; then
            echo "📦 Установка cloudflared..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                brew install cloudflare/cloudflare/cloudflared 2>/dev/null || {
                    echo "❌ Не удалось установить через brew"
                    echo "Установите вручную: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
                    exit 1
                }
            else
                echo "Установите cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
                exit 1
            fi
        fi
        
        echo "✅ cloudflared установлен"
        echo ""
        echo "📝 Создаю скрипт для запуска с Cloudflare Tunnel..."
        cat > start-cloudflare-tunnel.sh << 'CLOUDFLARE'
#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 Запуск Expo с Cloudflare Tunnel..."

# Останавливаем предыдущие процессы
./stop-expo.sh 2>/dev/null

# Запускаем Metro в фоне
echo "📦 Запуск Metro Bundler..."
screen -dmS expo-metro bash -c "cd '$(pwd)' && npx expo start --clear 2>&1 | tee -a expo.log"

# Ждем запуска Metro
echo "⏳ Ожидание Metro Bundler..."
sleep 10

# Проверяем что Metro запустился
for i in {1..30}; do
    if curl -s http://localhost:8081/status > /dev/null 2>&1; then
        echo "✅ Metro Bundler запущен"
        break
    fi
    sleep 2
done

# Запускаем Cloudflare Tunnel
echo "🌐 Запуск Cloudflare Tunnel..."
screen -dmS expo-cloudflare bash -c "cd '$(pwd)' && cloudflared tunnel --url http://localhost:8081 2>&1 | tee -a cloudflare.log"

# Ждем получения URL
echo "⏳ Ожидание tunnel URL..."
sleep 5

# Получаем URL из логов Cloudflare
for i in {1..60}; do
    CLOUDFLARE_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' cloudflare.log 2>/dev/null | tail -1)
    if [ ! -z "$CLOUDFLARE_URL" ]; then
        EXP_URL=$(echo "$CLOUDFLARE_URL" | sed 's|https://|exp://|')
        echo "✅ Tunnel URL получен: $EXP_URL"
        echo "$EXP_URL" > tunnel-url-current.txt
        
        # Создаем QR код
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "$QR_URL" > qr-code-url.txt
        echo "📱 QR код: $QR_URL"
        open "$QR_URL" 2>/dev/null
        
        echo ""
        echo "✅ Готово! Cloudflare Tunnel работает"
        echo "📱 URL: $EXP_URL"
        break
    fi
    sleep 2
done
CLOUDFLARE
        chmod +x start-cloudflare-tunnel.sh
        echo "✅ Скрипт start-cloudflare-tunnel.sh создан"
        ;;
        
    3)
        echo ""
        echo "🔧 Настройка Serveo..."
        echo ""
        echo "📝 Создаю скрипт для запуска с Serveo..."
        cat > start-serveo-tunnel.sh << 'SERVEO'
#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 Запуск Expo с Serveo tunnel..."

# Останавливаем предыдущие процессы
./stop-expo.sh 2>/dev/null

# Запускаем Metro в фоне
echo "📦 Запуск Metro Bundler..."
screen -dmS expo-metro bash -c "cd '$(pwd)' && npx expo start --clear 2>&1 | tee -a expo.log"

# Ждем запуска Metro
echo "⏳ Ожидание Metro Bundler..."
sleep 10

# Запускаем Serveo tunnel
echo "🌐 Запуск Serveo tunnel..."
screen -dmS expo-serveo bash -c "cd '$(pwd)' && ssh -o StrictHostKeyChecking=no -R 80:localhost:8081 serveo.net 2>&1 | tee -a serveo.log"

# Ждем получения URL
echo "⏳ Ожидание tunnel URL..."
sleep 5

# Получаем URL из логов Serveo
for i in {1..30}; do
    SERVEO_URL=$(grep -oE 'https://[a-z0-9-]+\.serveo\.net' serveo.log 2>/dev/null | tail -1)
    if [ ! -z "$SERVEO_URL" ]; then
        EXP_URL=$(echo "$SERVEO_URL" | sed 's|https://|exp://|')
        echo "✅ Tunnel URL получен: $EXP_URL"
        echo "$EXP_URL" > tunnel-url-current.txt
        
        # Создаем QR код
        QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$EXP_URL"
        echo "$QR_URL" > qr-code-url.txt
        echo "📱 QR код: $QR_URL"
        open "$QR_URL" 2>/dev/null
        
        echo ""
        echo "✅ Готово! Serveo Tunnel работает"
        echo "📱 URL: $EXP_URL"
        break
    fi
    sleep 2
done
SERVEO
        chmod +x start-serveo-tunnel.sh
        echo "✅ Скрипт start-serveo-tunnel.sh создан"
        ;;
        
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Запустите соответствующий скрипт"
echo "2. Отсканируйте QR код в Expo Go"
echo "3. Наслаждайтесь стабильным подключением!"
