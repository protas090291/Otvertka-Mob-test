import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { RadialGradient as SvgRadialGradient, Defs, Stop, Line, Circle } from 'react-native-svg';
import { Theme } from '../constants/Theme';

const { width } = Dimensions.get('window');

interface VoiceControlButtonProps {
  isListening?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

const VoiceControlButton: React.FC<VoiceControlButtonProps> = ({ isListening: externalIsListening, onPress, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rayOpacity = useRef(new Animated.Value(1)).current;

  // Используем внешнее состояние, если оно передано
  const listening = externalIsListening !== undefined ? externalIsListening : isListening;

  useEffect(() => {
    if (listening) {
      // Сильная пульсация центрального элемента и fade лучей
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(rayOpacity, {
              toValue: 0.8,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(rayOpacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      rayOpacity.stopAnimation();
      pulseAnim.setValue(1);
      rayOpacity.setValue(1);
    }
  }, [listening]);

  const handlePress = () => {
    if (externalIsListening === undefined) {
      setIsListening(!isListening);
    }
    if (onPress) {
      onPress();
    }
  };

  const buttonWidth = width * 0.8;
  const buttonHeight = buttonWidth * 0.6;
  const centerX = buttonWidth / 2;
  const centerY = buttonHeight / 2;
  const rayLength = Math.min(buttonWidth, buttonHeight) * 0.45; // Длинные лучи почти до краев
  const numRays = 36; // 30-40 лучей

  // Генерируем лучи с переменной толщиной
  const rays = Array.from({ length: numRays }, (_, i) => {
    const angle = (i * 360 / numRays) * Math.PI / 180;
    const x1 = centerX;
    const y1 = centerY;
    const x2 = centerX + rayLength * Math.cos(angle);
    const y2 = centerY + rayLength * Math.sin(angle);
    const strokeWidth = 0.5 + (i % 3) * 0.5; // Переменная толщина 0.5-1.5
    return { x1, y1, x2, y2, strokeWidth, index: i };
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[
          styles.buttonContainer,
          {
            width: buttonWidth,
            height: buttonHeight,
            borderRadius: 40,
            opacity: disabled ? 0.5 : 1,
          },
        ]} 
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={disabled}
      >
        {/* Фон со светлым однотонным цветом */}
        <View style={styles.gradient}>
          {/* SVG с радиальными лучами и glow-эффектом */}
          <Animated.View 
            style={{ 
              opacity: rayOpacity, 
              position: 'absolute', 
              width: buttonWidth, 
              height: buttonHeight,
            }}
          >
            <Svg 
              height={buttonHeight} 
              width={buttonWidth}
            >
              <Defs>
                {/* Радиальный градиент для glow-эффекта */}
                <SvgRadialGradient id="glowGrad" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
                  <Stop offset="0%" stopColor="#FFB6C1" stopOpacity="0.5" />
                  <Stop offset="50%" stopColor="#ADD8E6" stopOpacity="0.2" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </SvgRadialGradient>
                {/* Градиент для лучей */}
                <SvgRadialGradient id="rayGrad" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <Stop offset="30%" stopColor="#FFB6C1" stopOpacity="0.6" />
                  <Stop offset="60%" stopColor="#ADD8E6" stopOpacity="0.3" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </SvgRadialGradient>
              </Defs>
              
              {/* Glow-эффект убран для однотонного фона */}

              {/* Радиальные лучи */}
              {rays.map((ray, i) => (
                <Line
                  key={i}
                  x1={ray.x1}
                  y1={ray.y1}
                  x2={ray.x2}
                  y2={ray.y2}
                  stroke="url(#rayGrad)"
                  strokeWidth={ray.strokeWidth}
                />
              ))}
            </Svg>
          </Animated.View>

          {/* Центральный фиолетовый круг с микрофоном */}
          <Animated.View 
            style={[
              styles.micCircle,
              {
                width: 140,
                height: 140,
                borderRadius: 70,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#C5A8E0', '#D4B8E8', '#E3C8F0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.micCircleGradient}
            >
              <Ionicons name="mic" size={60} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </View>
      </TouchableOpacity>
      <Text style={styles.text}>Нажмите для голосового управления</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  buttonContainer: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: Theme.colors.cardBackgroundLight, // Темный фон для карточки
  },
  micCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C5A8E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  micCircleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#808080',
    marginTop: 25,
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default VoiceControlButton;
