import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';
import { UserProfile } from '../lib/authApi';

interface ProfileScreenProps {
  navigation: any;
  route: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const currentUser: UserProfile | undefined = route.params?.currentUser;
  const currentUserId = currentUser?.id;
  const userRole: UserRole = currentUser?.role || route.params?.userRole || 'technadzor';
  const onLogout = route.params?.onLogout;

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

  // Получаем имя пользователя
  const userName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Пользователь';
  const userEmail = currentUser?.email || '';
  const userRoleLabel = roleLabels[userRole] || 'Пользователь';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, Theme.colors.backgroundDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header userRole={userRole} title="Профиль" currentUserId={currentUserId} onNotificationPress={() => navigation.navigate('Notifications')} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Card variant="gradient" style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[Theme.colors.primary, Theme.colors.secondary]}
                style={styles.avatar}
              >
                <Ionicons name="person" size={40} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.userName}>{userName}</Text>
            {userEmail ? (
              <Text style={styles.userEmail}>{userEmail}</Text>
            ) : null}
            <Text style={styles.userRole}>{userRoleLabel}</Text>
          </Card>

          <Card variant="gradient" style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="settings-outline" size={24} color={Theme.colors.text} />
              <Text style={styles.menuItemText}>Настройки</Text>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="notifications-outline" size={24} color={Theme.colors.text} />
              <Text style={styles.menuItemText}>Уведомления</Text>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="help-circle-outline" size={24} color={Theme.colors.text} />
              <Text style={styles.menuItemText}>Помощь</Text>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, styles.logoutItem]}
              onPress={() => {
                Alert.alert(
                  'Выход',
                  'Вы уверены, что хотите выйти?',
                  [
                    {
                      text: 'Отмена',
                      style: 'cancel',
                    },
                    {
                      text: 'Выйти',
                      style: 'destructive',
                      onPress: () => {
                        onLogout?.();
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={24} color={Theme.colors.error} />
              <Text style={[styles.menuItemText, { color: Theme.colors.error }]}>Выход</Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Theme.spacing.md,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingVertical: Theme.spacing.lg,
  },
  avatarContainer: {
    marginBottom: Theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    ...Theme.typography.h2,
    marginBottom: Theme.spacing.xs,
  },
  userEmail: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  userRole: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
  },
  menuCard: {
    marginBottom: Theme.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  menuItemText: {
    ...Theme.typography.body,
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
});

export default ProfileScreen;
