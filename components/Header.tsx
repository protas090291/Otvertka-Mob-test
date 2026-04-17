import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';
import { getUnreadNotificationsCount } from '../lib/notificationsApi';
import { useOffline } from '../contexts/OfflineContext';

interface HeaderProps {
  title?: string;
  userRole: UserRole;
  currentUserId?: string;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  management: 'Управление',
  user: 'Пользователь',
  client: 'Заказчик',
  foreman: 'Прораб',
  contractor: 'Подрядчик',
  worker: 'Рабочий',
  storekeeper: 'Складчик',
  technadzor: 'ТехНадзор',
};

const Header: React.FC<HeaderProps> = ({
  title = 'Отвёртка',
  userRole,
  currentUserId,
  onMenuPress,
  onSearchPress,
  onNotificationPress,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const {
    isOnline,
    manualOfflineMode,
    isOffline,
    pendingMutations,
    isSyncing,
    toggleManualOfflineMode,
    syncNow,
  } = useOffline();

  useEffect(() => {
    let mounted = true;
    let timer: any;

    const refresh = async () => {
      if (!currentUserId) {
        if (mounted) setUnreadCount(0);
        return;
      }
      try {
        const count = await getUnreadNotificationsCount(currentUserId);
        if (mounted) setUnreadCount(count);
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };

    refresh();
    timer = setInterval(refresh, 15000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [currentUserId]);

  const handleToggleOffline = async () => {
    const next = !manualOfflineMode;
    await toggleManualOfflineMode();
    const pendingHint =
      pendingMutations > 0
        ? `\n\nВ очереди мутаций: ${pendingMutations}. ${
            next ? 'Синхронизация начнётся после выхода из оффлайн-режима.' : 'Запускаю синхронизацию...'
          }`
        : '';
    Alert.alert(
      next ? 'Оффлайн-режим включён' : 'Оффлайн-режим выключен',
      (next
        ? 'Данные будут загружаться из локального кэша. Изменения будут сохраняться в очередь и отправятся на сервер, когда вы выйдете из оффлайн-режима.'
        : 'Приложение снова использует сеть.') + pendingHint
    );
    if (!next && pendingMutations > 0) {
      // пользователь выключил ручной оффлайн — попробуем сразу прогнать очередь
      void syncNow();
    }
  };

  const handleLongPressOffline = async () => {
    if (pendingMutations === 0) return;
    if (isOffline) {
      Alert.alert(
        'Нельзя синхронизировать',
        'Сейчас приложение в оффлайне. Выключите оффлайн-режим или подключитесь к сети.'
      );
      return;
    }
    await syncNow();
  };

  const offlineIconColor = isOffline ? Theme.colors.warning : Theme.colors.text;
  const offlineIconName: any = manualOfflineMode
    ? 'cloud-offline'
    : isOnline
      ? 'cloud-done-outline'
      : 'cloud-offline-outline';

  return (
    <BlurView intensity={20} tint="dark" style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.cardBackground, Theme.colors.cardBackgroundLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.leftSection}>
            {onMenuPress ? (
              <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
                <Ionicons name="menu" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[Theme.colors.primary, Theme.colors.secondary]}
                style={styles.logo}
              >
                <View style={styles.logoInner} />
              </LinearGradient>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.role}>{roleLabels[userRole]}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity
              onPress={handleToggleOffline}
              onLongPress={handleLongPressOffline}
              style={styles.iconButton}
              accessibilityLabel="Переключить оффлайн-режим"
            >
              <Ionicons name={offlineIconName} size={22} color={offlineIconColor} />
              {pendingMutations > 0 ? (
                <View style={[styles.badge, styles.pendingBadge]}>
                  <Text style={styles.badgeText}>
                    {isSyncing ? '…' : pendingMutations > 99 ? '99+' : String(pendingMutations)}
                  </Text>
                </View>
              ) : isOffline ? (
                <View style={styles.offlineDot} />
              ) : null}
            </TouchableOpacity>
            {onSearchPress ? (
              <TouchableOpacity onPress={onSearchPress} style={styles.iconButton}>
                <Ionicons name="search-outline" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color={Theme.colors.text} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.cardBackground,
  },
  gradient: {
    paddingTop: 50,
    paddingBottom: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    padding: Theme.spacing.xs,
    marginRight: Theme.spacing.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  logoInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  titleContainer: {
    marginLeft: Theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text,
    lineHeight: 22,
  },
  role: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  offlineDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.warning,
  },
  pendingBadge: {
    backgroundColor: Theme.colors.warning,
  },
});

export default Header;
