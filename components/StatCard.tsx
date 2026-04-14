import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import { Theme } from '../constants/Theme';

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: string;
  style?: any;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, style }) => {
  const colorMap: Record<StatCardProps['color'], { bg: readonly [string, string]; icon: string }> = {
    blue: { bg: ['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.15)'], icon: '#3b82f6' },
    green: { bg: ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.15)'], icon: '#10b981' },
    orange: { bg: ['rgba(245, 158, 11, 0.2)', 'rgba(217, 119, 6, 0.15)'], icon: '#f59e0b' },
    red: { bg: ['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.15)'], icon: '#ef4444' },
    purple: { bg: ['rgba(139, 92, 246, 0.2)', 'rgba(124, 58, 237, 0.15)'], icon: '#8b5cf6' },
  };

  const colors = colorMap[color];
  const cardContainerStyle = StyleSheet.flatten([styles.container, style]);

  return (
    <Card variant="gradient" style={cardContainerStyle}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
          {trend && (
            <View style={styles.trendContainer}>
              <View style={styles.trendBadge}>
                <Ionicons name="trending-up" size={12} color={Theme.colors.success} />
                <Text style={styles.trendText}>{trend}</Text>
              </View>
            </View>
          )}
        </View>
        <LinearGradient
          colors={colors.bg}
          style={styles.iconContainer}
        >
          <Ionicons name={icon} size={24} color={colors.icon} />
        </LinearGradient>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: Theme.spacing.xs,
    minWidth: '47%',
    maxWidth: '47%',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginRight: Theme.spacing.xs,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 4,
    lineHeight: 28,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  trendText: {
    fontSize: 10,
    color: Theme.colors.success,
    lineHeight: 14,
    flexShrink: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});

export default StatCard;
