import AsyncStorage from '@react-native-async-storage/async-storage';
import { isEffectivelyOffline } from './offlineCache';

/**
 * Очередь оффлайн-мутаций.
 *
 * Идея:
 *  - Когда приложение в оффлайне, мутация (createDefect/updateDefect/...) НЕ отправляется на сервер,
 *    а кладётся в очередь в AsyncStorage (вместе с типом и payload).
 *  - Когда приложение возвращается в онлайн, вызывается flushQueue(), которая по одной исполняет
 *    накопленные мутации через зарегистрированные обработчики (registerHandler).
 *  - Если обработчик падает — очередь не чистится, попытка повторится при следующем flush.
 *  - Обработчики регистрируются в модулях API (например, defectsApi.ts регистрирует
 *    'defect:create', 'defect:update' и т.п.).
 */

const QUEUE_KEY = 'offlineQueue:v1:items';

export type QueuedMutation = {
  /** Локальный id записи в очереди. */
  id: string;
  /** Тип мутации, например 'defect:create'. */
  type: string;
  /** Произвольный payload, сериализуемый в JSON. */
  payload: any;
  /** Когда попало в очередь. */
  createdAt: number;
  /** Сколько раз пытались выполнить. */
  attempts: number;
  /** Последняя ошибка (строка). */
  lastError?: string;
};

type Handler = (payload: any) => Promise<void>;

const handlers = new Map<string, Handler>();
const listeners = new Set<(count: number) => void>();

let queueCache: QueuedMutation[] | null = null;
let flushing = false;
let currentlyFlushingItem = false;

const loadQueue = async (): Promise<QueuedMutation[]> => {
  if (queueCache) return queueCache;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
    queueCache = Array.isArray(parsed) ? parsed : [];
  } catch {
    queueCache = [];
  }
  return queueCache!;
};

const saveQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queueCache || []));
  } catch (err) {
    console.warn('offlineQueue: не удалось сохранить очередь', err);
  }
};

const emit = (): void => {
  const count = (queueCache || []).length;
  listeners.forEach((cb) => {
    try {
      cb(count);
    } catch {
      // ignore
    }
  });
};

// Предзагружаем очередь и уведомляем подписчиков о стартовом размере.
loadQueue()
  .then(emit)
  .catch(() => {});

/** Зарегистрировать обработчик для типа мутации. */
export const registerHandler = (type: string, handler: Handler): void => {
  handlers.set(type, handler);
};

/** Добавить мутацию в очередь. Возвращает локальный id. */
export const enqueueMutation = async (type: string, payload: any): Promise<string> => {
  const queue = await loadQueue();
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedMutation = {
    id,
    type,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  queue.push(item);
  await saveQueue();
  emit();
  return id;
};

export const getPendingCount = (): number => (queueCache ? queueCache.length : 0);

export const getPendingQueue = async (): Promise<QueuedMutation[]> => {
  const q = await loadQueue();
  return q.slice();
};

export const subscribePending = (cb: (count: number) => void): (() => void) => {
  listeners.add(cb);
  // сразу отдать текущее значение
  try {
    cb(getPendingCount());
  } catch {
    // ignore
  }
  return () => {
    listeners.delete(cb);
  };
};

/**
 * True, если прямо сейчас идёт исполнение элемента очереди через обработчик.
 * Используется обёрнутыми API-функциями, чтобы внутри обработчика НЕ уводить вызов
 * обратно в enqueue, а исполнять реальный сетевой запрос.
 */
export const isCurrentlyFlushing = (): boolean => currentlyFlushingItem;

export const clearQueue = async (): Promise<void> => {
  queueCache = [];
  await AsyncStorage.removeItem(QUEUE_KEY);
  emit();
};

export type FlushResult = {
  processed: number;
  remaining: number;
  stoppedDueToError?: string;
};

/**
 * Выполнить очередь последовательно.
 * Останавливается на первой ошибке (оставляет элемент в очереди для следующей попытки).
 */
export const flushQueue = async (): Promise<FlushResult> => {
  if (flushing) {
    return { processed: 0, remaining: getPendingCount() };
  }
  flushing = true;
  let processed = 0;
  try {
    const queue = await loadQueue();
    while (queue.length > 0) {
      // Если мы снова ушли в оффлайн (или пользователь включил ручной режим) — прерываемся.
      if (await isEffectivelyOffline()) {
        return {
          processed,
          remaining: queue.length,
          stoppedDueToError: 'offline',
        };
      }

      const item = queue[0];
      const handler = handlers.get(item.type);

      if (!handler) {
        console.warn(
          `offlineQueue: нет обработчика для типа "${item.type}", удаляю элемент ${item.id}`
        );
        queue.shift();
        await saveQueue();
        emit();
        continue;
      }

      currentlyFlushingItem = true;
      try {
        await handler(item.payload);
        queue.shift();
        processed++;
        await saveQueue();
        emit();
      } catch (err: any) {
        item.attempts = (item.attempts || 0) + 1;
        item.lastError = err?.message ? String(err.message) : String(err);
        await saveQueue();
        emit();
        console.warn(
          `offlineQueue: обработчик ${item.type} упал (попытка #${item.attempts}):`,
          err
        );
        return {
          processed,
          remaining: queue.length,
          stoppedDueToError: item.lastError,
        };
      } finally {
        currentlyFlushingItem = false;
      }
    }
    return { processed, remaining: 0 };
  } finally {
    flushing = false;
    currentlyFlushingItem = false;
  }
};
