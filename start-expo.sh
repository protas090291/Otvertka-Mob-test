#!/bin/bash
cd "$(dirname "$0")"
echo "Запуск Expo сервера..."
echo "Текущая директория: $(pwd)"
npx expo start --clear --lan
