#!/usr/bin/env node
/**
 * Скрипт для запуска Metro Bundler на Time Web Cloud
 * Metro Bundler работает на порту 8081 (внутренний порт)
 * Nginx проксирует запросы с порта 80 на порт 8081
 */

const { spawn } = require('child_process');

const METRO_PORT = process.env.METRO_PORT || 8081; // Внутренний порт для Metro (nginx проксирует с 80)

// Флаг готовности Metro Bundler
let metroReady = false;
let metroProcess = null;

// Логирование для отладки
console.log('🚀 Инициализация Metro Bundler...');
console.log(`📡 METRO_PORT: ${METRO_PORT} (внутренний порт для nginx)`);

// Запускаем Metro Bundler как дочерний процесс
function startMetro() {
  // Если процесс уже запущен, не запускаем повторно
  if (metroProcess && !metroProcess.killed) {
    console.log('⚠️  Metro Bundler уже запущен');
    return metroProcess;
  }
  
  console.log('🚀 Запуск Metro Bundler...');
  
  const metroArgs = [
    'expo',
    'start',
    '--host', 'lan', // Используем 'lan' так как Expo CLI не поддерживает '0.0.0.0'
    '--port', METRO_PORT.toString(), // Metro использует порт 8081 (внутренний)
    '--clear' // Очистка кеша при запуске
  ];

  // Создаем env без CI переменных (Time Web Cloud может устанавливать CI=true)
  const env = { ...process.env };
  delete env.CI; // Явно удаляем CI чтобы избежать non-interactive mode
  delete env.CI_NAME;
  delete env.CI_BUILD_ID;
  delete env.CI_BUILD_NUMBER;
  delete env.CONTINUOUS_INTEGRATION;
  
  env.EXPO_NO_DOTENV = '1';
  env.EXPO_DEVTOOLS_LISTEN_ADDRESS = '0.0.0.0';
  env.NODE_OPTIONS = '--max-old-space-size=4096';

  metroProcess = spawn('npx', metroArgs, {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe'], // stdin: 'inherit' для интерактивного режима
    env: env,
    detached: false
  });

  // Логируем вывод Metro
  metroProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Metro] ${output.trim()}`);
    
    // Проверяем готовность Metro по выводу
    if (output.includes('Metro') && output.includes('ready')) {
      metroReady = true;
      console.log('✅ Metro Bundler готов!');
    }
  });

  metroProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error(`[Metro Error] ${output.trim()}`);
  });

  metroProcess.on('error', (err) => {
    console.error('❌ Ошибка запуска Metro:', err.message);
    metroReady = false;
    
    // Пытаемся перезапустить через 10 секунд
    setTimeout(() => {
      console.log('🔄 Попытка перезапуска Metro...');
      startMetro();
    }, 10000);
  });

  metroProcess.on('exit', (code, signal) => {
    console.log(`⚠️  Metro Bundler остановлен (код: ${code}, сигнал: ${signal})`);
    metroReady = false;
    metroProcess = null;
    
    // Перезапускаем только если это не нормальное завершение
    if (code !== 0 && code !== null && signal !== 'SIGTERM' && signal !== 'SIGINT') {
      console.log('🔄 Перезапуск Metro через 10 секунд...');
      setTimeout(startMetro, 10000);
    }
  });

  return metroProcess;
}

// Запускаем Metro Bundler напрямую
console.log(`🚀 Запуск Metro Bundler на порту ${METRO_PORT}...`);
console.log(`📡 Health check: http://localhost:${METRO_PORT}/status`);
console.log(`🌐 Metro Bundler будет доступен через nginx на порту 80`);
console.log(`🔗 Nginx проксирует порт 80 → порт ${METRO_PORT}`);

// Запускаем Metro Bundler
startMetro();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, останавливаю Metro Bundler...');
  if (metroProcess && !metroProcess.killed) {
    metroProcess.kill('SIGTERM');
    setTimeout(() => {
      if (metroProcess && !metroProcess.killed) {
        metroProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('🛑 Получен SIGINT, останавливаю Metro Bundler...');
  if (metroProcess && !metroProcess.killed) {
    metroProcess.kill('SIGINT');
    setTimeout(() => {
      if (metroProcess && !metroProcess.killed) {
        metroProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
});

// Обработка необработанных ошибок
process.on('uncaughtException', (err) => {
  console.error('❌ Необработанная ошибка:', err);
  // Не завершаем процесс, чтобы Metro продолжал работать
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанный rejection:', reason);
  // Не завершаем процесс
});
