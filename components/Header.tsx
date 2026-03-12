import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';

interface HeaderProps {
  title?: string;
  userRole: UserRole;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
}

const roleLabels: Record<UserRole, string> = {
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
  onMenuPress,
  onSearchPress,
  onNotificationPress,
}) => {
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
            <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
              <Ionicons name="menu" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
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
            <TouchableOpacity onPress={onSearchPress} style={styles.iconButton}>
              <Ionicons name="search-outline" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color={Theme.colors.text} />
              <View style={styles.badge} />
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
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.error,
  },
});

export default Header;
