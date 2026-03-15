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
// Metro Bundler использует тот же порт что и Express (8080)
// Это нужно для того, чтобы порт был открыт извне в Time Web Cloud
const METRO_PORT = process.env.METRO_PORT || PORT;

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
    metro_port: PORT,
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
      qr: '/qr',
      metro: `http://localhost:${PORT}`
    },
    metro_ready: metroReady
  });
});

// QR Code endpoint для Expo Go
app.get('/qr', (req, res) => {
  // Определяем домен из запроса или используем переменную окружения
  const host = req.get('host') || process.env.SERVER_HOST || 'protas090291-otvertka-mob-test-beaf.twc1.net';
  const hostname = host.split(':')[0]; // Убираем порт если есть
  
  // Используем порт PORT (8080) - Metro Bundler работает на том же порту
  const expoUrl = `exp://${hostname}:${PORT}`;
  
  // URL для генерации QR-кода через онлайн API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(expoUrl)}`;
  
  // Возвращаем HTML страницу с QR-кодом
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR Code для Expo Go</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 500px;
          width: 100%;
        }
        h1 {
          margin-bottom: 10px;
          font-size: 28px;
        }
        .subtitle {
          margin-bottom: 30px;
          opacity: 0.9;
          font-size: 16px;
        }
        .qr-code {
          margin: 20px 0;
          padding: 30px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .qr-code img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .url {
          margin-top: 25px;
          padding: 15px;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          word-break: break-all;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          backdrop-filter: blur(10px);
        }
        .instructions {
          margin-top: 30px;
          padding: 25px;
          background: rgba(255,255,255,0.15);
          border-radius: 15px;
          text-align: left;
          backdrop-filter: blur(10px);
        }
        .instructions h3 {
          margin-bottom: 15px;
          font-size: 18px;
        }
        .instructions ol {
          margin-left: 20px;
          line-height: 1.8;
        }
        .instructions li {
          margin-bottom: 8px;
        }
        .status {
          margin-top: 20px;
          padding: 10px;
          border-radius: 8px;
          font-size: 14px;
        }
        .status.ready {
          background: rgba(76, 175, 80, 0.3);
        }
        .status.not-ready {
          background: rgba(255, 152, 0, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 QR Code для Expo Go</h1>
        <p class="subtitle">Отсканируйте QR-код в приложении Expo Go</p>
        
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QR Code для ${expoUrl}" />
        </div>
        
        <div class="url">
          <strong>Expo URL:</strong><br>
          <code>${expoUrl}</code>
        </div>
        
        <div class="status ${metroReady ? 'ready' : 'not-ready'}">
          ${metroReady ? '✅ Metro Bundler готов' : '⏳ Metro Bundler загружается...'}
        </div>
        
        <div class="instructions">
          <h3>📋 Инструкция:</h3>
          <ol>
            <li>Откройте приложение <strong>Expo Go</strong> на iPhone</li>
            <li>Нажмите кнопку <strong>"Scan QR Code"</strong></li>
            <li>Наведите камеру на QR-код выше</li>
            <li>Дождитесь загрузки приложения</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `);
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
    // Добавляем заголовки для Expo Go
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
    proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
  }
});

// Функция проверки доступности Metro Bundler
function checkMetroHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/status`, { timeout: 2000 }, (res) => {
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

// Применяем прокси ко всем запросам кроме health check и QR
app.use(async (req, res, next) => {
  // Health check endpoints всегда доступны
  if (req.path === '/status' || req.path === '/health' || req.path === '/' || req.path === '/qr') {
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
    '--host', 'lan', // Используем 'lan' так как Expo CLI не поддерживает '0.0.0.0'
    '--port', PORT.toString(), // Metro использует тот же порт что и Express (8080)
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
