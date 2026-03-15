#!/usr/bin/env node
/**
 * Express сервер для Time Web Cloud
 * Предоставляет health check endpoint и проксирует запросы к Metro Bundler
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const METRO_PORT = process.env.METRO_PORT || 8081;

// Health check endpoint для Time Web Cloud
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Expo Metro Bundler Proxy',
    metro_port: METRO_PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Expo Metro Bundler Proxy Server',
    endpoints: {
      health: '/status',
      metro: `http://localhost:${METRO_PORT}`
    }
  });
});

// Проксируем все остальные запросы к Metro Bundler
const metroProxy = createProxyMiddleware({
  target: `http://localhost:${METRO_PORT}`,
  changeOrigin: true,
  ws: true, // WebSocket support для hot reload
  logLevel: 'warn',
  onError: (err, req, res) => {
    console.error('Metro proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Metro Bundler недоступен',
        message: 'Metro Bundler еще не запущен или остановлен'
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    // Добавляем заголовки если нужно
    proxyReq.setHeader('X-Forwarded-For', req.ip);
  }
});

// Применяем прокси ко всем запросам кроме health check
app.use((req, res, next) => {
  if (req.path === '/status' || req.path === '/health' || req.path === '/') {
    return next();
  }
  metroProxy(req, res, next);
});

// Запускаем Metro Bundler как дочерний процесс
let metroProcess = null;

function startMetro() {
  console.log('🚀 Запуск Metro Bundler...');
  
  const metroArgs = [
    'expo',
    'start',
    '--host', 'lan',
    '--port', METRO_PORT.toString(),
    '--clear'
  ];

  metroProcess = spawn('npx', metroArgs, {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      EXPO_NO_DOTENV: '1',
      EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  });

  metroProcess.on('error', (err) => {
    console.error('❌ Ошибка запуска Metro:', err);
  });

  metroProcess.on('exit', (code, signal) => {
    console.log(`⚠️  Metro Bundler остановлен (код: ${code}, сигнал: ${signal})`);
    if (code !== 0 && code !== null) {
      console.log('🔄 Перезапуск Metro через 5 секунд...');
      setTimeout(startMetro, 5000);
    }
  });

  return metroProcess;
}

// Запускаем сервер
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Express сервер запущен на порту ${PORT}`);
  console.log(`📡 Health check: http://0.0.0.0:${PORT}/status`);
  console.log(`🔗 Metro Bundler будет доступен на порту ${METRO_PORT}`);
  
  // Запускаем Metro Bundler
  startMetro();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, останавливаю сервер...');
  if (metroProcess) {
    metroProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Получен SIGINT, останавливаю сервер...');
  if (metroProcess) {
    metroProcess.kill('SIGINT');
  }
  process.exit(0);
});
