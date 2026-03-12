import { Colors } from './Colors';

export const Theme = {
  colors: Colors,
  
  // Отступы
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Радиусы скругления
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  // Тени
  shadows: {
    sm: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },
    md: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    lg: {
      shadowColor: Colors.shadowDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
  },
  
  // Типографика
  typography: {
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: Colors.text,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      color: Colors.text,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: Colors.text,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: Colors.text,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: Colors.textSecondary,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      color: Colors.textLight,
    },
  },
};
