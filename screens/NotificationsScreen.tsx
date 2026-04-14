import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';
import { NotificationItem, listNotificationsForUser, markAllNotificationsRead, markNotificationRead } from '../lib/notificationsApi';
import { UserProfile } from '../lib/authApi';
import { getDefectById } from '../lib/defectsApi';

interface NotificationsScreenProps {
  navigation: any;
  route: any;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  const currentUser: UserProfile | undefined = route.params?.currentUser;
  const currentUserId = currentUser?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    if (!currentUserId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const data = await listNotificationsForUser(currentUserId, 50);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleMarkAllRead = useCallback(async () => {
    if (!currentUserId) return;
    const ok = await markAllNotificationsRead(currentUserId);
    if (ok) {
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    }
  }, [currentUserId]);

  const handleOpen = useCallback(
    async (n: NotificationItem) => {
      if (!n.read_at) {
        const ok = await markNotificationRead(n.id);
        if (ok) {
          setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
        }
      }

      if (n.defect_id) {
        const defect = await getDefectById(n.defect_id);
        if (defect) {
          navigation.navigate('DefectDetail', {
            defect,
            userRole,
            currentUser,
          });
        }
      }
    },
    [currentUser, navigation, userRole]
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, Theme.colors.backgroundDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          userRole={userRole}
          title="Уведомления"
          currentUserId={currentUserId}
          onMenuPress={() => navigation.goBack()}
        />

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkAllRead} disabled={!items.length}>
            <Ionicons name="checkmark-done-outline" size={18} color={Theme.colors.primary} />
            <Text style={styles.actionText}>Прочитать все</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
              <Text style={styles.loadingText}>Загрузка уведомлений...</Text>
            </View>
          ) : items.length === 0 ? (
            <Card variant="gradient">
              <Text style={styles.emptyText}>Уведомлений нет</Text>
            </Card>
          ) : (
            items.map((n) => {
              const unread = !n.read_at;
              return (
                <TouchableOpacity key={n.id} activeOpacity={0.8} onPress={() => handleOpen(n)}>
                  <Card
                    variant="gradient"
                    style={unread ? { ...styles.itemCard, ...styles.itemCardUnread } : styles.itemCard}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemTitle, unread ? styles.itemTitleUnread : undefined]}>{n.title}</Text>
                      {unread ? <View style={styles.unreadDot} /> : null}
                    </View>
                    {n.body ? <Text style={styles.itemBody}>{n.body}</Text> : null}
                    <Text style={styles.itemDate}>{new Date(n.created_at).toLocaleString('ru-RU')}</Text>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: Theme.spacing.md },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  actionText: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  loadingContainer: { padding: Theme.spacing.xl, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: Theme.spacing.md, color: Theme.colors.textSecondary },
  emptyText: { color: Theme.colors.textSecondary, textAlign: 'center', padding: Theme.spacing.lg },
  itemCard: { marginBottom: Theme.spacing.md },
  itemCardUnread: { borderColor: Theme.colors.primary },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { color: Theme.colors.text, fontWeight: '600', fontSize: 15, flex: 1, paddingRight: Theme.spacing.sm },
  itemTitleUnread: { color: Theme.colors.text },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Theme.colors.error },
  itemBody: { marginTop: Theme.spacing.sm, color: Theme.colors.textSecondary },
  itemDate: { marginTop: Theme.spacing.sm, color: Theme.colors.textSecondary, fontSize: 12 },
});

export default NotificationsScreen;
