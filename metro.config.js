// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Увеличиваем таймауты для стабильной работы через tunnel
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Увеличиваем таймауты для больших файлов и нестабильных соединений
      req.setTimeout(600000); // 10 минут
      res.setTimeout(600000); // 10 минут
      // Увеличиваем keep-alive для стабильности
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=600');
      return middleware(req, res, next);
    };
  },
  // Важно: разрешаем подключения извне для tunnel
  rewriteRequestUrl: (url) => {
    // Убираем проблемы с URL для tunnel
    return url;
  },
};

// Увеличиваем размер буфера для загрузки bundle
config.transformer = {
  ...config.transformer,
  maxWorkers: 2, // Уменьшаем количество воркеров для стабильности
  minifierPath: require.resolve('metro-minify-terser'),
  minifierConfig: {
    ecma: 8,
    keep_classnames: true,
    keep_fnames: true,
    module: true,
    mangle: {
      module: true,
      keep_classnames: true,
      keep_fnames: true,
    },
  },
};

// Настройки для более стабильной работы через tunnel
config.watchFolders = [__dirname];

module.exports = config;
