#!/usr/bin/env node
/**
 * Express сервер для Time Web Cloud
 * Предоставляет health check endpoint и проксирует запросы к Metro Bundler
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const METRO_PORT = process.env.METRO_PORT || 8081;

// Флаг готовности Metro Bundler
let metroReady = false;
let metroProcess = null;

// Логирование для отладки
console.log('🚀 Инициализация Express сервера...');
console.log(`📡 PORT: ${PORT}, METRO_PORT: ${METRO_PORT}`);

// Health check endpoint для Time Web Cloud
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Expo Metro Bundler Proxy',
    metro_port: METRO_PORT,
    metro_ready: metroReady,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    metro_ready: metroReady 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Expo Metro Bundler Proxy Server',
    endpoints: {
      health: '/status',
      metro: `http://localhost:${METRO_PORT}`
    },
    metro_ready: metroReady
  });
});

// Проксируем все остальные запросы к Metro Bundler
const metroProxy = createProxyMiddleware({
  target: `http://localhost:${METRO_PORT}`,
  changeOrigin: true,
  ws: true, // WebSocket support для hot reload
  logLevel: 'warn',
  timeout: 30000,
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    console.error('❌ Metro proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Metro Bundler недоступен',
        message: 'Metro Bundler еще не запущен или остановлен',
        metro_ready: metroReady
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    // Добавляем заголовки если нужно
    proxyReq.setHeader('X-Forwarded-For', req.ip);
  }
});

// Функция проверки доступности Metro Bundler
function checkMetroHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${METRO_PORT}/status`, { timeout: 2000 }, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Применяем прокси ко всем запросам кроме health check
app.use(async (req, res, next) => {
  // Health check endpoints всегда доступны
  if (req.path === '/status' || req.path === '/health' || req.path === '/') {
    return next();
  }
  
  // Проверяем готовность Metro перед проксированием
  if (!metroReady) {
    const isReady = await checkMetroHealth();
    if (isReady) {
      metroReady = true;
      console.log('✅ Metro Bundler готов к работе');
    } else {
      return res.status(503).json({
        error: 'Metro Bundler еще не готов',
        message: 'Пожалуйста, подождите несколько секунд',
        metro_ready: false
      });
    }
  }
  
  metroProxy(req, res, next);
});

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
    '--host', 'lan',
    '--port', METRO_PORT.toString(),
    '--no-dev', // Отключаем dev режим для продакшена
    '--minify'  // Минификация для продакшена
  ];

  metroProcess = spawn('npx', metroArgs, {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'], // Перенаправляем вывод для логирования
    env: {
      ...process.env,
      EXPO_NO_DOTENV: '1',
      EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
      NODE_OPTIONS: '--max-old-space-size=4096',
      CI: 'true' // Указываем что это CI окружение
    },
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

  // Периодически проверяем готовность Metro
  const healthCheckInterval = setInterval(async () => {
    if (!metroReady && metroProcess && !metroProcess.killed) {
      const isReady = await checkMetroHealth();
      if (isReady) {
        metroReady = true;
        console.log('✅ Metro Bundler готов (проверка health)');
        clearInterval(healthCheckInterval);
      }
    } else if (metroReady) {
      clearInterval(healthCheckInterval);
    }
  }, 5000);

  // Очищаем интервал через 2 минуты
  setTimeout(() => {
    clearInterval(healthCheckInterval);
  }, 120000);

  return metroProcess;
}

// Запускаем сервер
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Express сервер запущен на порту ${PORT}`);
  console.log(`📡 Health check: http://0.0.0.0:${PORT}/status`);
  console.log(`🔗 Metro Bundler будет доступен на порту ${METRO_PORT}`);
  console.log(`🌐 Сервер готов принимать запросы`);
  
  // Запускаем Metro Bundler асинхронно (не блокируем запуск Express)
  setTimeout(() => {
    console.log('🚀 Запуск Metro Bundler в фоновом режиме...');
    startMetro();
  }, 2000); // Небольшая задержка для полной инициализации Express
});

// Обработка ошибок сервера
server.on('error', (err) => {
  console.error('❌ Ошибка Express сервера:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️  Порт ${PORT} уже занят`);
  }
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`🛑 Получен ${signal}, останавливаю сервер...`);
  
  // Останавливаем Metro Bundler
  if (metroProcess && !metroProcess.killed) {
    console.log('🛑 Останавливаю Metro Bundler...');
    metroProcess.kill('SIGTERM');
    
    // Ждем завершения Metro
    setTimeout(() => {
      if (metroProcess && !metroProcess.killed) {
        metroProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
  
  // Закрываем Express сервер
  server.close(() => {
    console.log('✅ Express сервер остановлен');
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('uncaughtException', (err) => {
  console.error('❌ Необработанная ошибка:', err);
  // Не завершаем процесс, чтобы сервер продолжал работать
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанный rejection:', reason);
  // Не завершаем процесс
});
