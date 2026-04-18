import { useEffect, useState } from 'react';
import { getLocalImageUriIfExists, getOrCacheImage } from '../lib/imageCache';

/**
 * Хук для отображения картинки с файловым кэшем.
 *
 * Поведение:
 *  - Сначала проверяет локальный файл (синхронно отдаёт его как initial, если уже был
 *    закеширован ранее — чтобы оффлайн сразу показал картинку).
 *  - Если локального файла нет — отдаёт исходный URL (онлайн отрисует сразу).
 *  - Параллельно запускает загрузку в фон и, когда файл скачан, переключает URI на локальный.
 */
export const useCachedImage = (remoteUrl: string | null | undefined): string | undefined => {
  const [uri, setUri] = useState<string | undefined>(remoteUrl || undefined);

  useEffect(() => {
    let mounted = true;
    if (!remoteUrl) {
      setUri(undefined);
      return;
    }

    // Локальный file:// можно показывать как есть
    if (remoteUrl.startsWith('file://') || remoteUrl.startsWith('/')) {
      setUri(remoteUrl);
      return;
    }

    // Стартуем с исходного URL (не задерживаем первый paint в онлайне).
    setUri(remoteUrl);

    (async () => {
      try {
        const existing = await getLocalImageUriIfExists(remoteUrl);
        if (existing && mounted) {
          setUri(existing);
          return;
        }
        const downloaded = await getOrCacheImage(remoteUrl);
        if (downloaded && mounted) {
          setUri(downloaded);
        }
      } catch {
        // ignore — останется remoteUrl
      }
    })();

    return () => {
      mounted = false;
    };
  }, [remoteUrl]);

  return uri;
};
