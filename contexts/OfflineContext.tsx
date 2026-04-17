import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import {
  getManualOfflineMode,
  setManualOfflineMode as persistManualOfflineMode,
  subscribeManualOfflineMode,
} from '../lib/offlineCache';
import {
  flushQueue,
  getPendingCount,
  subscribePending,
} from '../lib/offlineQueue';

type OfflineContextValue = {
  /** Сеть реально доступна (NetInfo) */
  isOnline: boolean;
  /** Пользователь включил ручной оффлайн-режим */
  manualOfflineMode: boolean;
  /** Итоговое "мы работаем в оффлайне" (ручной режим ИЛИ нет сети) */
  isOffline: boolean;
  /** Сколько мутаций ждут синхронизации в оффлайн-очереди */
  pendingMutations: number;
  /** Идёт ли прямо сейчас синхронизация очереди */
  isSyncing: boolean;
  toggleManualOfflineMode: () => Promise<void>;
  setManualOfflineMode: (value: boolean) => Promise<void>;
  /** Попытаться синхронизировать очередь сейчас (если онлайн). */
  syncNow: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [manualOfflineMode, setManualOfflineModeState] = useState<boolean>(getManualOfflineMode());
  const [pendingMutations, setPendingMutations] = useState<number>(getPendingCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isOfflineRef = useRef<boolean>(manualOfflineMode || !isOnline);

  // Подписка на NetInfo
  useEffect(() => {
    const apply = (state: NetInfoState) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(connected);
    };

    NetInfo.fetch().then(apply).catch(() => {});
    const unsubscribe = NetInfo.addEventListener(apply);
    return () => {
      unsubscribe();
    };
  }, []);

  // Подписка на ручной оффлайн-режим (persisted в AsyncStorage)
  useEffect(() => {
    setManualOfflineModeState(getManualOfflineMode());
    const unsub = subscribeManualOfflineMode((v) => setManualOfflineModeState(v));
    return () => unsub();
  }, []);

  // Подписка на размер оффлайн-очереди
  useEffect(() => {
    const unsub = subscribePending((count) => setPendingMutations(count));
    return () => unsub();
  }, []);

  // Автосинк: как только выходим в онлайн (сеть есть и ручной режим выключен) —
  // пытаемся прогнать очередь мутаций.
  useEffect(() => {
    const wasOffline = isOfflineRef.current;
    const nowOffline = manualOfflineMode || !isOnline;
    isOfflineRef.current = nowOffline;

    if (wasOffline && !nowOffline && pendingMutations > 0) {
      void runSync();
    }
    // Если только что появилась сеть и в очереди есть мутации — тоже синкаем.
    if (!nowOffline && pendingMutations > 0 && !isSyncing) {
      void runSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, manualOfflineMode, pendingMutations]);

  const runSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await flushQueue();
    } catch (err) {
      console.warn('OfflineContext: flushQueue ошибка', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const value = useMemo<OfflineContextValue>(() => {
    const isOffline = manualOfflineMode || !isOnline;
    return {
      isOnline,
      manualOfflineMode,
      isOffline,
      pendingMutations,
      isSyncing,
      setManualOfflineMode: async (v: boolean) => {
        await persistManualOfflineMode(v);
      },
      toggleManualOfflineMode: async () => {
        await persistManualOfflineMode(!manualOfflineMode);
      },
      syncNow: async () => {
        await runSync();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, manualOfflineMode, pendingMutations, isSyncing]);

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextValue => {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return ctx;
};
