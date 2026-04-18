import * as FileSystem from 'expo-file-system/legacy';
import { isEffectivelyOffline } from './offlineCache';

/**
 * Детерминированный файловый кэш картинок поверх expo-file-system.
 *
 * Зачем:
 *  - expo-image с cachePolicy="memory-disk" кеширует у себя, но этот кэш не всегда
 *    переживает перезапуск / оффлайн. Картинки (планы квартир, фото дефектов) могут
 *    не отрисоваться в оффлайне, хотя ссылки на них лежат в нашем offlineCache.
 *  - Здесь мы сами скачиваем файл в cacheDirectory и отдаём локальный `file://` URI,
 *    который гарантированно работает без сети.
 *
 * Использование:
 *   const local = await getOrCacheImage(url);   // вернёт file://... (либо url, если офлайн и не скачано)
 *   prefetchImages([url1, url2]);               // фон, без await
 *   useCachedImage(url)                         // хук для UI
 */

const IMG_DIR = (FileSystem.cacheDirectory || '') + 'img-cache/';

/** Простой djb2-хэш URL. Без зависимостей. */
const hashUrl = (url: string): string => {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
};

const extOf = (url: string): string => {
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-z0-9]{2,5})$/i);
  const ext = m ? m[1].toLowerCase() : 'img';
  // Ограничим поддерживаемыми типами, иначе кладём как .img (expo-image распознаёт по содержимому)
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic', 'heif'].includes(ext)) return ext;
  return 'img';
};

const localPathFor = (url: string): string => {
  // Добавляем длину URL как дополнительный разделитель, чтобы снизить шанс коллизии хэша.
  return `${IMG_DIR}${hashUrl(url)}_${url.length}.${extOf(url)}`;
};

let dirEnsured = false;
const ensureDir = async (): Promise<void> => {
  if (dirEnsured) return;
  try {
    const info = await FileSystem.getInfoAsync(IMG_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(IMG_DIR, { intermediates: true });
    }
    dirEnsured = true;
  } catch (err) {
    console.warn('imageCache: не удалось создать папку кэша', err);
  }
};

const inflight = new Map<string, Promise<string | null>>();

/** Только проверка: есть ли уже скачанная локальная копия. */
export const getLocalImageUriIfExists = async (url: string): Promise<string | null> => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('file://') || url.startsWith('/')) return url;
  try {
    await ensureDir();
    const path = localPathFor(url);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists && (info as any).size !== 0) {
      return path;
    }
  } catch {
    // ignore
  }
  return null;
};

const downloadTo = async (url: string, dest: string): Promise<string | null> => {
  try {
    const res = await FileSystem.downloadAsync(url, dest);
    if (res && res.status >= 200 && res.status < 300) {
      return res.uri;
    }
    // Неудачная загрузка — подчищаем пустой файл
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignore
    }
    return null;
  } catch (err) {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignore
    }
    console.warn('imageCache: ошибка загрузки', url, err);
    return null;
  }
};

/**
 * Вернуть локальный URI картинки.
 *  - Если уже скачано — вернёт локальный путь.
 *  - Иначе (если онлайн) скачает и вернёт локальный путь.
 *  - Если оффлайн и ничего нет — вернёт null (вызывающий может показать исходный URL, placeholder и т.п.)
 */
export const getOrCacheImage = async (url: string | null | undefined): Promise<string | null> => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('file://') || url.startsWith('/')) return url;

  const existing = await getLocalImageUriIfExists(url);
  if (existing) return existing;

  if (await isEffectivelyOffline()) {
    return null;
  }

  // Дедупликация параллельных запросов по одному URL
  const running = inflight.get(url);
  if (running) return running;

  const p = (async () => {
    await ensureDir();
    const dest = localPathFor(url);
    const uri = await downloadTo(url, dest);
    return uri;
  })();

  inflight.set(url, p);
  try {
    return await p;
  } finally {
    inflight.delete(url);
  }
};

/** Запустить префетч без ожидания. Безопасно вызывать много раз. */
export const prefetchImage = (url: string | null | undefined): void => {
  if (!url) return;
  void getOrCacheImage(url).catch(() => {});
};

/** Префетч списка URL, с ограничением параллелизма. */
export const prefetchImages = async (urls: Array<string | null | undefined>, concurrency: number = 3): Promise<void> => {
  const list = urls.filter((u): u is string => !!u && typeof u === 'string');
  if (list.length === 0) return;
  let i = 0;
  const workers: Promise<void>[] = [];
  for (let c = 0; c < Math.min(concurrency, list.length); c++) {
    workers.push(
      (async () => {
        while (i < list.length) {
          const idx = i++;
          const u = list[idx];
          try {
            await getOrCacheImage(u);
          } catch {
            // ignore
          }
        }
      })()
    );
  }
  await Promise.all(workers);
};

/** Очистка кэша картинок (по URL или весь). */
export const clearImageCache = async (url?: string): Promise<void> => {
  try {
    if (url) {
      const path = localPathFor(url);
      await FileSystem.deleteAsync(path, { idempotent: true });
      return;
    }
    await FileSystem.deleteAsync(IMG_DIR, { idempotent: true });
    dirEnsured = false;
  } catch (err) {
    console.warn('imageCache: ошибка очистки', err);
  }
};
