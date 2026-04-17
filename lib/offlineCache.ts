import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Лёгкий слой оффлайн-кеша поверх AsyncStorage.
 *
 * Идея:
 *  - cachedFetch(key, fetcher) пытается позвать fetcher() и сохранить результат в кеш.
 *  - Если оффлайн (нет сети или включён ручной режим) — возвращает последний кеш (если есть).
 *  - Если онлайн, но запрос упал — тоже отдаёт кеш (если есть), чтобы не терять UX.
 *
 *  Ключ кеша должен быть уникальным для функции + аргументов, например:
 *    defects:all
 *    defects:byApartment:T101
 *    projects:all
 *    users:active
 */

const CACHE_PREFIX = 'offlineCache:v1:';
const OFFLINE_MODE_KEY = 'offlineCache:manualOfflineMode';

type CachedEntry<T> = {
  data: T;
  savedAt: number;
};

// ---- ручной оффлайн-режим (persisted) ----

let manualOfflineMode = false;
let manualOfflineModeLoaded = false;
const manualOfflineListeners = new Set<(v: boolean) => void>();

const loadManualOfflineMode = async (): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_MODE_KEY);
    manualOfflineMode = raw === '1';
  } catch {
    manualOfflineMode = false;
  }
  manualOfflineModeLoaded = true;
  return manualOfflineMode;
};

export const getManualOfflineMode = (): boolean => manualOfflineMode;

export const isManualOfflineModeLoaded = (): boolean => manualOfflineModeLoaded;

export const setManualOfflineMode = async (value: boolean): Promise<void> => {
  manualOfflineMode = value;
  try {
    await AsyncStorage.setItem(OFFLINE_MODE_KEY, value ? '1' : '0');
  } catch {
    // ignore write errors
  }
  manualOfflineListeners.forEach((cb) => {
    try {
      cb(value);
    } catch {
      // ignore
    }
  });
};

export const subscribeManualOfflineMode = (
  cb: (value: boolean) => void
): (() => void) => {
  manualOfflineListeners.add(cb);
  return () => {
    manualOfflineListeners.delete(cb);
  };
};

// Инициализируем значение при первом импорте модуля
loadManualOfflineMode().catch(() => {});

// ---- состояние сети ----

/**
 * Проверка сети. Возвращает true, если приложение считает, что сеть доступна
 * (isConnected && isInternetReachable !== false).
 */
export const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    if (state.isConnected === false) return false;
    // isInternetReachable может быть null на iOS в первый момент — считаем как доступно
    if (state.isInternetReachable === false) return false;
    return true;
  } catch {
    return true;
  }
};

/**
 * Считаем, что мы в оффлайне, если пользователь включил ручной режим
 * ИЛИ NetInfo сказал, что сети нет.
 */
export const isEffectivelyOffline = async (): Promise<boolean> => {
  if (manualOfflineMode) return true;
  const online = await isNetworkAvailable();
  return !online;
};

// ---- работа с кешем ----

const makeKey = (key: string) => `${CACHE_PREFIX}${key}`;

export const readCache = async <T>(key: string): Promise<CachedEntry<T> | null> => {
  try {
    const raw = await AsyncStorage.getItem(makeKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeCache = async <T>(key: string, data: T): Promise<void> => {
  try {
    const payload: CachedEntry<T> = { data, savedAt: Date.now() };
    await AsyncStorage.setItem(makeKey(key), JSON.stringify(payload));
  } catch (err) {
    console.warn('offlineCache: не удалось записать кеш для', key, err);
  }
};

export const clearCache = async (key?: string): Promise<void> => {
  try {
    if (key) {
      await AsyncStorage.removeItem(makeKey(key));
      return;
    }
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch (err) {
    console.warn('offlineCache: ошибка очистки кеша:', err);
  }
};

export type CachedFetchOptions<T> = {
  /** Значение по умолчанию, если нет ни кеша, ни сети. */
  fallback?: T;
  /** Явно отключить попытку сети, даже если онлайн. */
  forceOffline?: boolean;
};

/**
 * Обёртка: сначала пытаемся из сети (если не оффлайн), при неудаче — из кеша.
 * При оффлайне — сразу из кеша.
 *
 * Возвращает данные (никогда не throws, если есть fallback/кеш).
 */
export const cachedFetch = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CachedFetchOptions<T> = {}
): Promise<T> => {
  const { fallback, forceOffline } = options;

  const shouldGoOffline = forceOffline || (await isEffectivelyOffline());

  if (shouldGoOffline) {
    const cached = await readCache<T>(key);
    if (cached) return cached.data;
    if (fallback !== undefined) return fallback;
    // нет ни кеша, ни fallback — пробуем всё же вызвать fetcher, но с try/catch
    try {
      const fresh = await fetcher();
      await writeCache(key, fresh);
      return fresh;
    } catch (err) {
      console.warn(`offlineCache: оффлайн и нет кеша для ${key}`, err);
      // крайний случай — пробросим ошибку, но в большинстве сценариев выше этого не будет
      throw err;
    }
  }

  try {
    const fresh = await fetcher();
    await writeCache(key, fresh);
    return fresh;
  } catch (err) {
    console.warn(`offlineCache: сеть упала для ${key}, читаем кеш`, err);
    const cached = await readCache<T>(key);
    if (cached) return cached.data;
    if (fallback !== undefined) return fallback;
    throw err;
  }
};
