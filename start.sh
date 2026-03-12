#!/bin/bash

# Остановить все процессы Expo на порту 8081
echo "Останавливаю старые процессы Expo..."
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:8082 | xargs kill -9 2>/dev/null
sleep 2

# Очистить кеш и запустить
echo "Запускаю Expo с очисткой кеша..."
npx expo start --clear
