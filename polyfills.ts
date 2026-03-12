// Polyfills для Android совместимости
import { Buffer } from 'buffer';

// Настройка Buffer для Android (критично для Supabase)
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Настройка process для React Native (если нужно)
if (typeof global.process === 'undefined') {
  try {
    global.process = require('process');
  } catch (e) {
    // Если process не доступен, создаем минимальную заглушку
    global.process = {
      env: {},
      version: '',
      versions: {},
      platform: 'react-native',
    } as any;
  }
}

// TextEncoder/TextDecoder обычно доступны в React Native, но проверяем на всякий случай
if (typeof global.TextEncoder === 'undefined') {
  try {
    // Пробуем использовать встроенный или из expo
    if (typeof TextEncoder !== 'undefined') {
      global.TextEncoder = TextEncoder;
    }
  } catch (e) {
    console.warn('TextEncoder не доступен:', e);
  }
}

if (typeof global.TextDecoder === 'undefined') {
  try {
    if (typeof TextDecoder !== 'undefined') {
      global.TextDecoder = TextDecoder;
    }
  } catch (e) {
    console.warn('TextDecoder не доступен:', e);
  }
}
