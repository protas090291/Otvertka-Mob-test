import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Theme } from '../constants/Theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'gradient';
  blur?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  variant = 'default',
  blur = true 
}) => {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    style,
  ];

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={Theme.colors.gradientDark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardStyle}
      >
        {children}
      </LinearGradient>
    );
  }

  if (blur) {
    return (
      <BlurView intensity={20} tint="dark" style={cardStyle}>
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[cardStyle, { backgroundColor: Theme.colors.cardBackground }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    shadowColor: Theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.shadowGlow,
  },
});

export default Card;
