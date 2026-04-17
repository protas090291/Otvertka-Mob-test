import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import {
  getManualOfflineMode,
  setManualOfflineMode as persistManualOfflineMode,
  subscribeManualOfflineMode,
} from '../lib/offlineCache';

type OfflineContextValue = {
  /** Сеть реально доступна (NetInfo) */
  isOnline: boolean;
  /** Пользователь включил ручной оффлайн-режим */
  manualOfflineMode: boolean;
  /** Итоговое "мы работаем в оффлайне" (ручной режим ИЛИ нет сети) */
  isOffline: boolean;
  toggleManualOfflineMode: () => Promise<void>;
  setManualOfflineMode: (value: boolean) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [manualOfflineMode, setManualOfflineModeState] = useState<boolean>(getManualOfflineMode());

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

  const value = useMemo<OfflineContextValue>(() => {
    const isOffline = manualOfflineMode || !isOnline;
    return {
      isOnline,
      manualOfflineMode,
      isOffline,
      setManualOfflineMode: async (v: boolean) => {
        await persistManualOfflineMode(v);
      },
      toggleManualOfflineMode: async () => {
        await persistManualOfflineMode(!manualOfflineMode);
      },
    };
  }, [isOnline, manualOfflineMode]);

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextValue => {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return ctx;
};
